import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Typy pro databázi
export type User = {
  id: string
  name: string
  email?: string
  avatar_url?: string
  initials: string
  color: string
  created_at: string
}

export type Activity = {
  id: string
  user_id: string
  date: string
  beh: number
  kolo: number
  bazen: number
  kokotmetr: number
  no_alcohol: boolean
  created_at: string
  updated_at: string
}

export type LeaderboardEntry = {
  id: string
  name: string
  initials: string
  avatar_url?: string
  color: string
  total_beh: number
  total_kolo: number
  total_bazen: number
  total_kokotmetr: number
  sober_days: number
  total_points: number
}

// API funkce
export async function getLeaderboard(startDate?: string, endDate?: string): Promise<LeaderboardEntry[]> {
  // Pokud jsou zadané datumy, vypočítáme leaderboard z aktivit v daném rozmezí
  if (startDate && endDate) {
    const { data: activities, error } = await supabase
      .from('activities')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')

    if (error || usersError || !activities || !users) {
      console.error('Error fetching data:', error, usersError)
      return []
    }

    // Vypočítat leaderboard z filtrovaných aktivit
    const leaderboardMap = new Map<string, LeaderboardEntry>()

    users.forEach(user => {
      leaderboardMap.set(user.id, {
        id: user.id,
        name: user.name,
        initials: user.initials,
        avatar_url: user.avatar_url,
        color: user.color,
        total_beh: 0,
        total_kolo: 0,
        total_bazen: 0,
        total_kokotmetr: 0,
        sober_days: 0,
        total_points: 0
      })
    })

    activities.forEach(activity => {
      const entry = leaderboardMap.get(activity.user_id)
      if (entry) {
        entry.total_beh += activity.beh
        entry.total_kolo += activity.kolo
        entry.total_bazen += activity.bazen
        entry.total_kokotmetr += activity.kokotmetr
        if (activity.no_alcohol) entry.sober_days += 1

        // Výpočet bodů
        entry.total_points += activity.beh +
                             Math.floor(activity.kolo / 10) * 2 +
                             Math.floor(activity.bazen) * 2 +
                             activity.kokotmetr +
                             (activity.no_alcohol ? 1 : 0)
      }
    })

    return Array.from(leaderboardMap.values()).sort((a, b) => b.total_points - a.total_points)
  }

  // Jinak použít view (pro kompatibilitu)
  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .order('total_points', { ascending: false })

  if (error) {
    console.error('Error fetching leaderboard:', error)
    return []
  }

  return data || []
}

export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching users:', error)
    return []
  }

  return data || []
}

export async function addActivity(activity: {
  user_id: string
  date: string
  beh: number
  kolo: number
  bazen: number
  kokotmetr: number
  no_alcohol: boolean
}): Promise<Activity | null> {
  // Použít upsert - pokud záznam existuje, aktualizuje ho, jinak vytvoří nový
  const { data, error } = await supabase
    .from('activities')
    .upsert([{ ...activity, updated_at: new Date().toISOString() }], {
      onConflict: 'user_id,date'
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding activity:', error)
    return null
  }

  return data
}

export async function updateActivity(
  id: string,
  updates: {
    beh?: number
    kolo?: number
    bazen?: number
    kokotmetr?: number
    no_alcohol?: boolean
  }
): Promise<Activity | null> {
  const { data, error } = await supabase
    .from('activities')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating activity:', error)
    return null
  }

  return data
}

export async function getActivityByUserAndDate(
  userId: string,
  date: string
): Promise<Activity | null> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    console.error('Error fetching activity:', error)
  }

  return data || null
}

export async function deleteActivity(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting activity:', error)
    return false
  }

  return true
}

export async function getAllActivities(): Promise<(Activity & { user_name: string })[]> {
  const { data, error } = await supabase
    .from('activities')
    .select(`
      *,
      users!inner(name)
    `)
    .order('date', { ascending: false })

  if (error) {
    console.error('Error fetching activities:', error)
    return []
  }

  return data?.map(activity => ({
    ...activity,
    user_name: (activity.users as any).name
  })) || []
}

export type PointsHistory = {
  date: string
  [key: string]: number | string // user_id: points
}

export async function getPointsHistory(startDate?: string, endDate?: string): Promise<PointsHistory[]> {
  // Získat všechny aktivity seřazené podle data (filtrované podle rozmezí pokud je zadané)
  let query = supabase
    .from('activities')
    .select('*, users!inner(id, name, color)')
    .order('date', { ascending: true })

  if (startDate) {
    query = query.gte('date', startDate)
  }
  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data: activities, error } = await query

  if (error) {
    console.error('Error fetching points history:', error)
    return []
  }

  if (!activities || activities.length === 0) {
    return []
  }

  // Získat všechny unikátní uživatele
  const allUserIds = new Set<string>()
  activities.forEach(a => allUserIds.add(a.user_id))

  // Kumulativní body pro každého uživatele
  const userPoints: { [userId: string]: number } = {}
  allUserIds.forEach(userId => {
    userPoints[userId] = 0
  })

  // Seskupit aktivity podle data
  const dateMap: { [date: string]: Activity[] } = {}
  activities.forEach(activity => {
    if (!dateMap[activity.date]) {
      dateMap[activity.date] = []
    }
    dateMap[activity.date].push(activity)
  })

  // Seřadit data chronologicky
  const dates = Object.keys(dateMap).sort()
  const result: PointsHistory[] = []

  // Pro každý den vypočítat kumulativní body
  dates.forEach(date => {
    const dayActivities = dateMap[date]

    // Přičíst body za aktivity v tento den
    dayActivities.forEach(activity => {
      const points = activity.beh + Math.floor(activity.kolo / 10) * 2 + Math.floor(activity.bazen) * 2 + activity.kokotmetr + (activity.no_alcohol ? 1 : 0)
      userPoints[activity.user_id] += points
    })

    // Vytvořit záznam pro tento den s aktuálními kumulativními body všech uživatelů
    const entry: PointsHistory = { date }
    allUserIds.forEach(userId => {
      entry[userId] = userPoints[userId]
    })
    result.push(entry)
  })

  return result
}

export type UserStreaks = {
  longestSoberStreak: number
  currentSoberStreak: number
  longestActiveStreak: number
  currentActiveStreak: number
}

export async function getUserStreaks(userId: string, startDate?: string, endDate?: string): Promise<UserStreaks> {
  // Získat všechny aktivity uživatele seřazené podle data
  let query = supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true })

  if (startDate) query = query.gte('date', startDate)
  if (endDate) query = query.lte('date', endDate)

  const { data: activities, error } = await query

  if (error || !activities || activities.length === 0) {
    return {
      longestSoberStreak: 0,
      currentSoberStreak: 0,
      longestActiveStreak: 0,
      currentActiveStreak: 0
    }
  }

  // Vytvořit seznam všech dat v rozmezí
  const start = new Date(startDate || activities[0].date)
  const end = new Date(endDate || activities[activities.length - 1].date)
  const today = new Date()

  // Mapy aktivit podle data
  const activityMap = new Map<string, typeof activities[0]>()
  activities.forEach(a => activityMap.set(a.date, a))

  let longestSoberStreak = 0
  let currentSoberStreak = 0
  let longestActiveStreak = 0
  let currentActiveStreak = 0
  let tempSoberStreak = 0
  let tempActiveStreak = 0
  let lastDateHadActivity = false

  // Projít všechny dny v rozmezí
  for (let d = new Date(start); d <= end && d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    const activity = activityMap.get(dateStr)

    // Počítat sober streak
    if (activity?.no_alcohol) {
      tempSoberStreak++
      longestSoberStreak = Math.max(longestSoberStreak, tempSoberStreak)
    } else {
      tempSoberStreak = 0
    }

    // Počítat active streak (aspoň nějaká aktivita)
    const hasActivity = activity && (activity.beh > 0 || activity.kolo > 0 || activity.bazen > 0 || activity.kokotmetr > 0)
    if (hasActivity) {
      tempActiveStreak++
      longestActiveStreak = Math.max(longestActiveStreak, tempActiveStreak)
      lastDateHadActivity = true
    } else {
      tempActiveStreak = 0
      lastDateHadActivity = false
    }
  }

  // Current streaky jsou pouze pokud končí dnes nebo poslední den období
  const lastDate = end < today ? end : today
  const lastDateStr = lastDate.toISOString().split('T')[0]
  const lastActivity = activityMap.get(lastDateStr)

  currentSoberStreak = lastActivity?.no_alcohol ? tempSoberStreak : 0
  currentActiveStreak = lastDateHadActivity ? tempActiveStreak : 0

  return {
    longestSoberStreak,
    currentSoberStreak,
    longestActiveStreak,
    currentActiveStreak
  }
}

export type PointsBreakdown = {
  behPoints: number
  koloPoints: number
  bazenPoints: number
  kokotmetrPoints: number
  alcoholPoints: number
  totalPoints: number
}

export async function getPointsBreakdown(userId: string, startDate?: string, endDate?: string): Promise<PointsBreakdown> {
  let query = supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)

  if (startDate) query = query.gte('date', startDate)
  if (endDate) query = query.lte('date', endDate)

  const { data: activities, error } = await query

  if (error || !activities) {
    return {
      behPoints: 0,
      koloPoints: 0,
      bazenPoints: 0,
      kokotmetrPoints: 0,
      alcoholPoints: 0,
      totalPoints: 0
    }
  }

  let behPoints = 0
  let koloPoints = 0
  let bazenPoints = 0
  let kokotmetrPoints = 0
  let alcoholPoints = 0

  activities.forEach(activity => {
    behPoints += activity.beh
    koloPoints += Math.floor(activity.kolo / 10) * 2
    bazenPoints += Math.floor(activity.bazen) * 2
    kokotmetrPoints += activity.kokotmetr
    if (activity.no_alcohol) alcoholPoints += 1
  })

  return {
    behPoints,
    koloPoints,
    bazenPoints,
    kokotmetrPoints,
    alcoholPoints,
    totalPoints: behPoints + koloPoints + bazenPoints + kokotmetrPoints + alcoholPoints
  }
}

export type PositionStats = {
  position: number
  totalUsers: number
  pointsBehind: number | null
  userBehind: string | null
  pointsAhead: number | null
  userAhead: string | null
}

export async function getPositionStats(userId: string, startDate?: string, endDate?: string): Promise<PositionStats> {
  const leaderboard = await getLeaderboard(startDate, endDate)

  const userIndex = leaderboard.findIndex(u => u.id === userId)

  if (userIndex === -1) {
    return {
      position: 0,
      totalUsers: leaderboard.length,
      pointsBehind: null,
      userBehind: null,
      pointsAhead: null,
      userAhead: null
    }
  }

  const userPoints = leaderboard[userIndex].total_points
  const userBefore = leaderboard[userIndex - 1]
  const userAfter = leaderboard[userIndex + 1]

  return {
    position: userIndex + 1,
    totalUsers: leaderboard.length,
    pointsBehind: userBefore ? userBefore.total_points - userPoints : null,
    userBehind: userBefore ? userBefore.name : null,
    pointsAhead: userAfter ? userPoints - userAfter.total_points : null,
    userAhead: userAfter ? userAfter.name : null
  }
}

export type DailyAverages = {
  avgPointsPerDay: number
  avgBehPerDay: number
  avgKoloPerDay: number
  avgBazenPerDay: number
  avgKokotmetrPerDay: number
  soberDaysPercent: number
  activeDaysPercent: number
  totalDays: number
}

export async function getDailyAverages(userId: string, startDate?: string, endDate?: string): Promise<DailyAverages> {
  let query = supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)

  if (startDate) query = query.gte('date', startDate)
  if (endDate) query = query.lte('date', endDate)

  const { data: activities, error } = await query

  if (error || !activities) {
    return {
      avgPointsPerDay: 0,
      avgBehPerDay: 0,
      avgKoloPerDay: 0,
      avgBazenPerDay: 0,
      avgKokotmetrPerDay: 0,
      soberDaysPercent: 0,
      activeDaysPercent: 0,
      totalDays: 0
    }
  }

  // Spočítat celkový počet dní v rozmezí
  const start = new Date(startDate || new Date().toISOString().split('T')[0])
  const end = new Date(endDate || new Date().toISOString().split('T')[0])
  const today = new Date()
  const actualEnd = end < today ? end : today
  const totalDays = Math.max(1, Math.ceil((actualEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)

  let totalPoints = 0
  let totalBeh = 0
  let totalKolo = 0
  let totalBazen = 0
  let totalKokotmetr = 0
  let soberDays = 0
  let activeDays = 0

  activities.forEach(activity => {
    totalBeh += activity.beh
    totalKolo += activity.kolo
    totalBazen += activity.bazen
    totalKokotmetr += activity.kokotmetr
    if (activity.no_alcohol) soberDays++
    if (activity.beh > 0 || activity.kolo > 0 || activity.bazen > 0 || activity.kokotmetr > 0) activeDays++

    totalPoints += activity.beh +
                   Math.floor(activity.kolo / 10) * 2 +
                   Math.floor(activity.bazen) * 2 +
                   activity.kokotmetr +
                   (activity.no_alcohol ? 1 : 0)
  })

  return {
    avgPointsPerDay: totalPoints / totalDays,
    avgBehPerDay: totalBeh / totalDays,
    avgKoloPerDay: totalKolo / totalDays,
    avgBazenPerDay: totalBazen / totalDays,
    avgKokotmetrPerDay: totalKokotmetr / totalDays,
    soberDaysPercent: (soberDays / totalDays) * 100,
    activeDaysPercent: (activeDays / totalDays) * 100,
    totalDays
  }
}

export type BestDay = {
  date: string | null
  points: number
  beh: number
  kolo: number
  bazen: number
  kokotmetr: number
  no_alcohol: boolean
}

export async function getBestDay(userId: string, startDate?: string, endDate?: string): Promise<BestDay> {
  let query = supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)

  if (startDate) query = query.gte('date', startDate)
  if (endDate) query = query.lte('date', endDate)

  const { data: activities, error } = await query

  if (error || !activities || activities.length === 0) {
    return {
      date: null,
      points: 0,
      beh: 0,
      kolo: 0,
      bazen: 0,
      kokotmetr: 0,
      no_alcohol: false
    }
  }

  let bestActivity = activities[0]
  let bestPoints = 0

  activities.forEach(activity => {
    const points = activity.beh +
                   Math.floor(activity.kolo / 10) * 2 +
                   Math.floor(activity.bazen) * 2 +
                   activity.kokotmetr +
                   (activity.no_alcohol ? 1 : 0)

    if (points > bestPoints) {
      bestPoints = points
      bestActivity = activity
    }
  })

  return {
    date: bestActivity.date,
    points: bestPoints,
    beh: bestActivity.beh,
    kolo: bestActivity.kolo,
    bazen: bestActivity.bazen,
    kokotmetr: bestActivity.kokotmetr,
    no_alcohol: bestActivity.no_alcohol
  }
}

export type WeeklyBreakdown = {
  weekNumber: number
  weekLabel: string
  points: number
  beh: number
  kolo: number
  bazen: number
  kokotmetr: number
  soberDays: number
  activeDays: number
}

export async function getWeeklyBreakdown(userId: string, startDate?: string, endDate?: string): Promise<WeeklyBreakdown[]> {
  let query = supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true })

  if (startDate) query = query.gte('date', startDate)
  if (endDate) query = query.lte('date', endDate)

  const { data: activities, error } = await query

  if (error || !activities || activities.length === 0) {
    return []
  }

  const start = new Date(startDate || activities[0].date)
  const end = new Date(endDate || activities[activities.length - 1].date)

  // Mapy aktivit podle data
  const activityMap = new Map<string, typeof activities[0]>()
  activities.forEach(a => activityMap.set(a.date, a))

  // Rozdělení do týdnů
  const weeks = new Map<number, WeeklyBreakdown>()

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    const weekNumber = Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1

    if (!weeks.has(weekNumber)) {
      const weekStart = new Date(start)
      weekStart.setDate(start.getDate() + (weekNumber - 1) * 7)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)

      weeks.set(weekNumber, {
        weekNumber,
        weekLabel: `${weekStart.getDate()}.${weekStart.getMonth() + 1}. - ${weekEnd.getDate()}.${weekEnd.getMonth() + 1}.`,
        points: 0,
        beh: 0,
        kolo: 0,
        bazen: 0,
        kokotmetr: 0,
        soberDays: 0,
        activeDays: 0
      })
    }

    const week = weeks.get(weekNumber)!
    const activity = activityMap.get(dateStr)

    if (activity) {
      week.beh += activity.beh
      week.kolo += activity.kolo
      week.bazen += activity.bazen
      week.kokotmetr += activity.kokotmetr
      if (activity.no_alcohol) week.soberDays++
      if (activity.beh > 0 || activity.kolo > 0 || activity.bazen > 0 || activity.kokotmetr > 0) week.activeDays++

      week.points += activity.beh +
                    Math.floor(activity.kolo / 10) * 2 +
                    Math.floor(activity.bazen) * 2 +
                    activity.kokotmetr +
                    (activity.no_alcohol ? 1 : 0)
    }
  }

  return Array.from(weeks.values())
}

export type DayOfWeekStats = {
  dayName: string
  dayIndex: number
  totalPoints: number
  activitiesCount: number
  avgPoints: number
  soberCount: number
}

export async function getDayOfWeekStats(userId: string, startDate?: string, endDate?: string): Promise<DayOfWeekStats[]> {
  let query = supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)

  if (startDate) query = query.gte('date', startDate)
  if (endDate) query = query.lte('date', endDate)

  const { data: activities, error } = await query

  if (error || !activities) {
    return []
  }

  const dayNames = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota']
  const dayStats = Array.from({ length: 7 }, (_, i) => ({
    dayName: dayNames[i],
    dayIndex: i,
    totalPoints: 0,
    activitiesCount: 0,
    avgPoints: 0,
    soberCount: 0
  }))

  activities.forEach(activity => {
    const date = new Date(activity.date)
    const dayIndex = date.getDay()

    const points = activity.beh +
                   Math.floor(activity.kolo / 10) * 2 +
                   Math.floor(activity.bazen) * 2 +
                   activity.kokotmetr +
                   (activity.no_alcohol ? 1 : 0)

    if (activity.beh > 0 || activity.kolo > 0 || activity.bazen > 0 || activity.kokotmetr > 0) {
      dayStats[dayIndex].activitiesCount++
      dayStats[dayIndex].totalPoints += points
    }
    if (activity.no_alcohol) {
      dayStats[dayIndex].soberCount++
    }
  })

  dayStats.forEach(day => {
    day.avgPoints = day.activitiesCount > 0 ? day.totalPoints / day.activitiesCount : 0
  })

  return dayStats
}

export type ConsistencyScore = {
  score: number
  activeDaysPercent: number
  longestGap: number
  averageGap: number
  totalActiveDays: number
  totalDays: number
}

export async function getConsistencyScore(userId: string, startDate?: string, endDate?: string): Promise<ConsistencyScore> {
  let query = supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true })

  if (startDate) query = query.gte('date', startDate)
  if (endDate) query = query.lte('date', endDate)

  const { data: activities, error } = await query

  if (error || !activities || activities.length === 0) {
    return {
      score: 0,
      activeDaysPercent: 0,
      longestGap: 0,
      averageGap: 0,
      totalActiveDays: 0,
      totalDays: 0
    }
  }

  const start = new Date(startDate || activities[0].date)
  const end = new Date(endDate || activities[activities.length - 1].date)
  const today = new Date()
  const actualEnd = end < today ? end : today

  const totalDays = Math.max(1, Math.ceil((actualEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)

  // Mapy aktivit podle data
  const activityMap = new Map<string, typeof activities[0]>()
  activities.forEach(a => {
    if (a.beh > 0 || a.kolo > 0 || a.bazen > 0 || a.kokotmetr > 0) {
      activityMap.set(a.date, a)
    }
  })

  let totalActiveDays = 0
  let currentGap = 0
  let longestGap = 0
  let totalGaps = 0
  let gapsCount = 0

  for (let d = new Date(start); d <= actualEnd; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    const hasActivity = activityMap.has(dateStr)

    if (hasActivity) {
      totalActiveDays++
      if (currentGap > 0) {
        totalGaps += currentGap
        gapsCount++
        longestGap = Math.max(longestGap, currentGap)
        currentGap = 0
      }
    } else {
      currentGap++
    }
  }

  // Poslední gap pokud skončil
  if (currentGap > 0) {
    totalGaps += currentGap
    gapsCount++
    longestGap = Math.max(longestGap, currentGap)
  }

  const activeDaysPercent = (totalActiveDays / totalDays) * 100
  const averageGap = gapsCount > 0 ? totalGaps / gapsCount : 0

  // Skóre: 100 pro 100% aktivitu, sníženo za dlouhé mezery
  let score = activeDaysPercent
  if (longestGap > 3) {
    score -= (longestGap - 3) * 2 // -2 body za každý den nad 3 dny mezery
  }
  score = Math.max(0, Math.min(100, score))

  return {
    score: Math.round(score),
    activeDaysPercent,
    longestGap,
    averageGap,
    totalActiveDays,
    totalDays
  }
}

export type ComparisonToAverage = {
  userPoints: number
  averagePoints: number
  percentDifference: number
  userBeh: number
  averageBeh: number
  userKolo: number
  averageKolo: number
  userBazen: number
  averageBazen: number
  userKokotmetr: number
  averageKokotmetr: number
  userSoberDays: number
  averageSoberDays: number
}

export async function getComparisonToAverage(userId: string, startDate?: string, endDate?: string): Promise<ComparisonToAverage> {
  const leaderboard = await getLeaderboard(startDate, endDate)

  if (leaderboard.length === 0) {
    return {
      userPoints: 0,
      averagePoints: 0,
      percentDifference: 0,
      userBeh: 0,
      averageBeh: 0,
      userKolo: 0,
      averageKolo: 0,
      userBazen: 0,
      averageBazen: 0,
      userKokotmetr: 0,
      averageKokotmetr: 0,
      userSoberDays: 0,
      averageSoberDays: 0
    }
  }

  const user = leaderboard.find(u => u.id === userId)

  if (!user) {
    return {
      userPoints: 0,
      averagePoints: 0,
      percentDifference: 0,
      userBeh: 0,
      averageBeh: 0,
      userKolo: 0,
      averageKolo: 0,
      userBazen: 0,
      averageBazen: 0,
      userKokotmetr: 0,
      averageKokotmetr: 0,
      userSoberDays: 0,
      averageSoberDays: 0
    }
  }

  const totalPoints = leaderboard.reduce((sum, u) => sum + u.total_points, 0)
  const totalBeh = leaderboard.reduce((sum, u) => sum + u.total_beh, 0)
  const totalKolo = leaderboard.reduce((sum, u) => sum + u.total_kolo, 0)
  const totalBazen = leaderboard.reduce((sum, u) => sum + u.total_bazen, 0)
  const totalKokotmetr = leaderboard.reduce((sum, u) => sum + u.total_kokotmetr, 0)
  const totalSoberDays = leaderboard.reduce((sum, u) => sum + u.sober_days, 0)

  const count = leaderboard.length

  const averagePoints = totalPoints / count
  const percentDifference = averagePoints > 0 ? ((user.total_points - averagePoints) / averagePoints) * 100 : 0

  return {
    userPoints: user.total_points,
    averagePoints,
    percentDifference,
    userBeh: user.total_beh,
    averageBeh: totalBeh / count,
    userKolo: user.total_kolo,
    averageKolo: totalKolo / count,
    userBazen: user.total_bazen,
    averageBazen: totalBazen / count,
    userKokotmetr: user.total_kokotmetr,
    averageKokotmetr: totalKokotmetr / count,
    userSoberDays: user.sober_days,
    averageSoberDays: totalSoberDays / count
  }
}
