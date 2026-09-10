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

export type AppSettings = {
  id: string
  challenge_start: string
  challenge_end: string
  sunny_day: string | null
  created_at: string
  updated_at: string
}

// API funkce
export async function getLeaderboard(startDate?: string, endDate?: string, sunnyDay?: string): Promise<LeaderboardEntry[]> {
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

    // Najít nejvyšší počet piv ve sluníčkový den
    let maxBeersOnSunnyDay = 0
    let sunnyDayWinnerId: string | null = null
    if (sunnyDay) {
      const sunnyDayActivities = activities.filter(a => a.date === sunnyDay)
      sunnyDayActivities.forEach(activity => {
        if (activity.kokotmetr > maxBeersOnSunnyDay) {
          maxBeersOnSunnyDay = activity.kokotmetr
          sunnyDayWinnerId = activity.user_id
        }
      })
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
        const isSunnyDay = sunnyDay && activity.date === sunnyDay

        if (isSunnyDay) {
          // Ve sluníčkový den: kokotmetr je počet piv, běh/kolo/bazén se nepočítá
          // Kokotmetr (piva) se započítává jen vítězi
          if (activity.user_id === sunnyDayWinnerId) {
            entry.total_kokotmetr += activity.kokotmetr
            entry.total_points += activity.kokotmetr // 1 pivo = 1 bod
          }
          // Bod za nepití alkoholu se počítá normálně
          if (activity.no_alcohol) {
            entry.sober_days += 1
            entry.total_points += 1
          }
        } else {
          // Normální den
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
}, sunnyDay?: string): Promise<Activity | null> {
  let finalActivity = { ...activity }

  // Ve sluníčkový den: zkontrolovat, jestli je kokotmetr nejvyšší
  if (sunnyDay && activity.date === sunnyDay) {
    // Najít všechny aktivity ve sluníčkový den
    const { data: sunnyDayActivities, error: fetchError } = await supabase
      .from('activities')
      .select('*')
      .eq('date', sunnyDay)
      .neq('user_id', activity.user_id)  // kromě aktuálního uživatele

    if (!fetchError && sunnyDayActivities) {
      const maxKokotmetr = Math.max(
        ...sunnyDayActivities.map(a => a.kokotmetr),
        0
      )

      // Pokud nová hodnota není vyšší než max, nastavit na 0
      if (activity.kokotmetr <= maxKokotmetr) {
        finalActivity.kokotmetr = 0
      } else {
        // Nová hodnota je nejvyšší - vynulovat ostatní
        await supabase
          .from('activities')
          .update({ kokotmetr: 0, updated_at: new Date().toISOString() })
          .eq('date', sunnyDay)
          .neq('user_id', activity.user_id)
      }
    }

    // Ve sluníčkový den ignorovat běh/kolo/bazén
    finalActivity.beh = 0
    finalActivity.kolo = 0
    finalActivity.bazen = 0
  }

  // Použít upsert - pokud záznam existuje, aktualizuje ho, jinak vytvoří nový
  const { data, error } = await supabase
    .from('activities')
    .upsert([{ ...finalActivity, updated_at: new Date().toISOString() }], {
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
  },
  sunnyDay?: string
): Promise<Activity | null> {
  // Nejdřív získat aktuální aktivitu, abychom znali datum a user_id
  const { data: currentActivity, error: fetchError } = await supabase
    .from('activities')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !currentActivity) {
    console.error('Error fetching activity:', fetchError)
    return null
  }

  let finalUpdates = { ...updates }

  // Ve sluníčkový den: zkontrolovat kokotmetr a vynulovat běh/kolo/bazén
  if (sunnyDay && currentActivity.date === sunnyDay) {
    // Ve sluníčkový den vynulovat běh/kolo/bazén
    finalUpdates.beh = 0
    finalUpdates.kolo = 0
    finalUpdates.bazen = 0

    // Pokud se updatuje kokotmetr
    if (updates.kokotmetr !== undefined) {
      // Najít všechny ostatní aktivity ve sluníčkový den
      const { data: sunnyDayActivities, error: fetchError2 } = await supabase
        .from('activities')
        .select('*')
        .eq('date', sunnyDay)
        .neq('user_id', currentActivity.user_id)

      if (!fetchError2 && sunnyDayActivities) {
        const maxKokotmetr = Math.max(
          ...sunnyDayActivities.map(a => a.kokotmetr),
          0
        )

        // Pokud nová hodnota není vyšší než max, nastavit na 0
        if (updates.kokotmetr <= maxKokotmetr) {
          finalUpdates.kokotmetr = 0
        } else {
          // Nová hodnota je nejvyšší - vynulovat ostatní
          await supabase
            .from('activities')
            .update({ kokotmetr: 0, updated_at: new Date().toISOString() })
            .eq('date', sunnyDay)
            .neq('user_id', currentActivity.user_id)
        }
      }
    }
  }

  const { data, error } = await supabase
    .from('activities')
    .update({ ...finalUpdates, updated_at: new Date().toISOString() })
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

export type Badge = {
  id: string
  name: string
  description: string
  emoji: string
  type: 'shame' | 'achievement' | 'weekly'
  unlocked: boolean
  unlockedAt?: string
}

export type Achievements = {
  badges: Badge[]
  weeklyBadges: {
    mrdkaTydne: { userId: string | null; userName: string | null } // Nejlínější kokot týdne
    alkacTydne: Array<{ userId: string; userName: string }> // Nejvíc dní s alkoholem tento týden (může být víc)
    abstinentTydne: Array<{ userId: string; userName: string }> // Nejvíc dní bez alkoholu (může být víc)
    comebackTydne: { userId: string | null; userName: string | null } // Největší zlepšení tento týden
  }
  shameLevel: number // 0-100, jak moc by se měl stydět
}

export async function getAchievements(userId: string, startDate?: string, endDate?: string): Promise<Achievements> {
  // Načíst všechny potřebné statistiky
  const [consistency, streaks, dailyAverages, leaderboard] = await Promise.all([
    getConsistencyScore(userId, startDate, endDate),
    getUserStreaks(userId, startDate, endDate),
    getDailyAverages(userId, startDate, endDate),
    getLeaderboard(startDate, endDate)
  ])

  const badges: Badge[] = []

  // 🔥 Iron Kokot - 7 dní v řadě s aktivitou
  badges.push({
    id: 'iron-kokot',
    name: 'Iron Kokot',
    description: '7 dní v řadě s aktivitou',
    emoji: '🔥',
    type: 'achievement',
    unlocked: streaks.longestActiveStreak >= 7
  })

  // 💀 Týden Nula - Celý týden bez aktivity
  badges.push({
    id: 'tyden-nula',
    name: 'Týden Nula',
    description: 'Celý týden bez aktivity... hanba!',
    emoji: '💀',
    type: 'shame',
    unlocked: consistency.longestGap >= 7
  })

  // 🍺 Alkáč - Méně než 30% dní bez alkoholu
  const soberPercent = (dailyAverages.soberDaysPercent || 0)
  badges.push({
    id: 'alkac',
    name: 'Alkáč',
    description: 'Méně než 30% dní bez alkoholu',
    emoji: '🍺',
    type: 'shame',
    unlocked: soberPercent < 30
  })

  // 🏃 Kokotí legenda - Více než 300 km běhu
  let query = supabase
    .from('activities')
    .select('beh')
    .eq('user_id', userId)

  if (startDate) query = query.gte('date', startDate)
  if (endDate) query = query.lte('date', endDate)

  const { data: activities } = await query
  const totalBeh = activities?.reduce((sum, a) => sum + a.beh, 0) || 0

  badges.push({
    id: 'kokoti-legenda',
    name: 'Kokotí Legenda',
    description: 'Více než 300 km běhu',
    emoji: '🏃',
    type: 'achievement',
    unlocked: totalBeh >= 300
  })

  // 🚴 Cyklista - Více než 500 km na kole
  const totalKolo = activities?.reduce((sum, a) => sum + a.kolo, 0) || 0
  badges.push({
    id: 'cyklista',
    name: 'Cyklista',
    description: 'Více než 500 km na kole',
    emoji: '🚴',
    type: 'achievement',
    unlocked: totalKolo >= 500
  })

  // 🏔️ Horolezec - Více než 100 kokotmetrů
  const totalKokotmetr = activities?.reduce((sum, a) => sum + a.kokotmetr, 0) || 0
  badges.push({
    id: 'horolezec',
    name: 'Horolezec',
    description: 'Více než 100 kokotmetrů',
    emoji: '🏔️',
    type: 'achievement',
    unlocked: totalKokotmetr >= 100
  })

  // 😇 Vyléčený - 100% dní bez alkoholu
  badges.push({
    id: 'vyleceny',
    name: 'Vyléčený',
    description: '100% dní bez alkoholu',
    emoji: '😇',
    type: 'achievement',
    unlocked: soberPercent === 100
  })

  // 💯 Ultra Kokot - 100% aktivních dní
  badges.push({
    id: 'ultra-kokot',
    name: 'Ultra Kokot',
    description: '100% aktivních dní',
    emoji: '💯',
    type: 'achievement',
    unlocked: consistency.activeDaysPercent === 100
  })

  // 🐌 Konzistentní Mrdka - Konzistence nad 80, ale méně než 100 bodů celkem
  const userEntry = leaderboard.find(u => u.id === userId)
  const totalPoints = userEntry?.total_points || 0
  badges.push({
    id: 'konzistentni-mrdka',
    name: 'Konzistentní Mrdka',
    description: 'Skvělá konzistence, ale pomalý výkon',
    emoji: '🐌',
    type: 'achievement',
    unlocked: consistency.score >= 80 && totalPoints < 100
  })

  // 💪 Warrior - Více než 400 bodů
  badges.push({
    id: 'warrior',
    name: 'Warrior',
    description: 'Více než 400 bodů',
    emoji: '💪',
    type: 'achievement',
    unlocked: totalPoints >= 400
  })

  // Týdenní badges - počítáme z posledního týdne
  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(now.getDate() - 7)
  const weekAgoStr = weekAgo.toISOString().split('T')[0]
  const nowStr = now.toISOString().split('T')[0]

  // Načíst data za poslední týden pro všechny uživatele
  const weeklyQuery = supabase
    .from('activities')
    .select('*, users!inner(name)')
    .gte('date', weekAgoStr)
    .lte('date', nowStr)

  const { data: weeklyActivities } = await weeklyQuery

  // Mrdka týdne - nejméně aktivních dní tento týden
  const weeklyUserStats = new Map<string, { name: string; activeDays: number; soberDays: number }>()

  weeklyActivities?.forEach(activity => {
    if (!weeklyUserStats.has(activity.user_id)) {
      weeklyUserStats.set(activity.user_id, {
        name: (activity.users as any).name,
        activeDays: 0,
        soberDays: 0
      })
    }
    const stats = weeklyUserStats.get(activity.user_id)!
    if (activity.beh > 0 || activity.kolo > 0 || activity.bazen > 0 || activity.kokotmetr > 0) {
      stats.activeDays++
    }
    if (activity.no_alcohol) {
      stats.soberDays++
    }
  })

  let mrdkaTydne = { userId: null as string | null, userName: null as string | null }
  let minActiveDays = Infinity
  weeklyUserStats.forEach((stats, uid) => {
    if (stats.activeDays < minActiveDays) {
      minActiveDays = stats.activeDays
      mrdkaTydne = { userId: uid, userName: stats.name }
    }
  })

  // Alkáč týdne - nejvíc dní s alkoholem (nejméně sober days) - může být víc lidí se stejnou hodnotou
  let alkacTydne: Array<{ userId: string; userName: string }> = []
  let minSoberDays = Infinity
  weeklyUserStats.forEach((stats, uid) => {
    if (stats.soberDays < minSoberDays) {
      minSoberDays = stats.soberDays
      alkacTydne = [{ userId: uid, userName: stats.name }]
    } else if (stats.soberDays === minSoberDays) {
      alkacTydne.push({ userId: uid, userName: stats.name })
    }
  })

  // Abstinent týdne - nejvíc dní bez alkoholu - může být víc lidí se stejnou hodnotou
  let abstinentTydne: Array<{ userId: string; userName: string }> = []
  let maxSoberDays = 0
  weeklyUserStats.forEach((stats, uid) => {
    if (stats.soberDays > maxSoberDays) {
      maxSoberDays = stats.soberDays
      abstinentTydne = [{ userId: uid, userName: stats.name }]
    } else if (stats.soberDays === maxSoberDays && maxSoberDays > 0) {
      abstinentTydne.push({ userId: uid, userName: stats.name })
    }
  })

  // Comeback týdne - největší nárůst pozice v žebříčku za poslední týden
  let comebackTydne = { userId: null as string | null, userName: null as string | null }

  // Získat žebříček před týdnem a současný žebříček
  const twoWeeksAgo = new Date(weekAgo)
  twoWeeksAgo.setDate(weekAgo.getDate() - 7)
  const twoWeeksAgoStr = twoWeeksAgo.toISOString().split('T')[0]

  const [oldLeaderboard, currentLeaderboard] = await Promise.all([
    getLeaderboard(startDate, weekAgoStr), // Žebříček před týdnem
    getLeaderboard(startDate, nowStr) // Aktuální žebříček
  ])

  // Spočítat nárůst pozice pro každého uživatele
  let maxPositionGain = 0
  let maxPointsThisWeek = 0
  let fallbackUser = { userId: null as string | null, userName: null as string | null }

  currentLeaderboard.forEach((currentUser, currentIndex) => {
    const oldIndex = oldLeaderboard.findIndex(u => u.id === currentUser.id)

    if (oldIndex !== -1) {
      const positionGain = oldIndex - currentIndex // Pozitivní = zlepšení

      // Spočítat body za tento týden
      const oldPoints = oldLeaderboard[oldIndex].total_points
      const pointsGained = currentUser.total_points - oldPoints

      // Primární kritérium: největší nárůst pozice (ale ne první -> první)
      if (positionGain > 0 && positionGain > maxPositionGain) {
        // Nekontrolovat pokud zůstal první
        if (!(oldIndex === 0 && currentIndex === 0)) {
          maxPositionGain = positionGain
          comebackTydne = { userId: currentUser.id, userName: currentUser.name }
        }
      }

      // Sekundární kritérium: nejvíc bodů tento týden (jako fallback)
      if (pointsGained > maxPointsThisWeek && currentIndex !== 0) {
        maxPointsThisWeek = pointsGained
        fallbackUser = { userId: currentUser.id, userName: currentUser.name }
      }
    }
  })

  // Pokud nikdo nikoho nepřeskočil, použít fallback (nejvíc bodů)
  if (maxPositionGain === 0 && maxPointsThisWeek > 0) {
    comebackTydne = fallbackUser
  }

  // Shame level (0-100)
  let shameLevel = 0
  if (consistency.activeDaysPercent < 50) shameLevel += 30
  if (soberPercent < 30) shameLevel += 25
  if (consistency.longestGap >= 7) shameLevel += 25

  // Pokud jsi ve druhé polovině pořadí
  const userPosition = leaderboard.findIndex(u => u.id === userId)
  const isInBottomHalf = userPosition >= Math.floor(leaderboard.length / 2)
  if (isInBottomHalf) shameLevel += 20

  shameLevel = Math.min(100, shameLevel)

  return {
    badges,
    weeklyBadges: {
      mrdkaTydne,
      alkacTydne,
      abstinentTydne,
      comebackTydne
    },
    shameLevel
  }
}

export type TrashTalkMessage = {
  id: string
  type: 'overtaken' | 'inactive' | 'last_place' | 'drinking' | 'comeback' | 'lazy'
  message: string
  timestamp: string
  severity: 'brutal' | 'medium' | 'light'
}

export async function getTrashTalkFeed(userId: string, startDate?: string, endDate?: string): Promise<TrashTalkMessage[]> {
  const messages: TrashTalkMessage[] = []

  // Získat aktuální data
  const [leaderboard, activities, consistency] = await Promise.all([
    getLeaderboard(startDate, endDate),
    supabase
      .from('activities')
      .select('*, users!inner(name)')
      .eq('user_id', userId)
      .gte('date', startDate || '1970-01-01')
      .lte('date', endDate || '9999-12-31')
      .order('date', { ascending: false })
      .then(res => res.data || []),
    getConsistencyScore(userId, startDate, endDate)
  ])

  const userPosition = leaderboard.findIndex(u => u.id === userId)
  const userName = leaderboard[userPosition]?.name || 'Kokot'

  // 1. Někdo tě předběhl v žebříčku
  if (userPosition > 0) {
    const userAhead = leaderboard[userPosition - 1]
    const pointsDiff = userAhead.total_points - leaderboard[userPosition].total_points

    if (pointsDiff < 20) {
      const closeMessages = [
        `${userAhead.name} tě právě předběhl o ${pointsDiff.toFixed(1)} bodů, ty pičo! 😱`,
        `${userAhead.name} tě přeskočil o ${pointsDiff.toFixed(1)} bodů! Měl by ses stydět 🤡`,
        `Jen ${pointsDiff.toFixed(1)} bodů ztrácíš na ${userAhead.name}... a stejně to nedoběhneš 🐌`,
        `${userAhead.name} tě má o ${pointsDiff.toFixed(1)} bodů! Začni se snažit, ne? 💩`,
        `${userAhead.name} tě předběhl! Seš prostě k ničemu...`,
        `${pointsDiff.toFixed(1)} bodů za ${userAhead.name}! S tou fyzičkou to nedohoníš 🐌`,
        `${userAhead.name} vyhrává o ${pointsDiff.toFixed(1)} bodů! Ty jsi prostě kokot slaboučkej.`,
        `${pointsDiff.toFixed(1)} bodů rozdíl! Zvedni prdel, ne pivo! 🍺`
      ]
      messages.push({
        id: 'overtaken-close',
        type: 'overtaken',
        message: closeMessages[Math.floor(Math.random() * closeMessages.length)],
        timestamp: new Date().toISOString(),
        severity: 'brutal'
      })
    } else {
      const farMessages = [
        `${userAhead.name} je před tebou o ${pointsDiff.toFixed(1)} bodů. Proč tu vůbec seš? 🤦`,
        `${userAhead.name} tě vede o ${pointsDiff.toFixed(1)} bodů. Tvoje účast je akorát pro statistiku 📊`,
        `${pointsDiff.toFixed(1)} bodů za ${userAhead.name}... To nedoháníš ani kdybys měl raketu v prdeli 🚀`,
        `${userAhead.name} je o ${pointsDiff.toFixed(1)} bodů lepší. Prostě smířit se s průměrem 🤷`,
        `${pointsDiff.toFixed(1)} bodů náskok má ${userAhead.name}! Ty jsi prostě línej a tlustej 😴`,
        `${userAhead.name} tě válcuje o ${pointsDiff.toFixed(1)} bodů! Tvoje fyzička je k smíchu 🤡`
      ]
      messages.push({
        id: 'overtaken-far',
        type: 'overtaken',
        message: farMessages[Math.floor(Math.random() * farMessages.length)],
        timestamp: new Date().toISOString(),
        severity: 'medium'
      })
    }
  }

  // 2. Jsi poslední
  if (userPosition === leaderboard.length - 1 && leaderboard.length > 1) {
    const messages_last = [
      'Nebolí tě prdel z toho sudu? 🍺',
      'Gratuluju, jsi poslední! 💩',
      'Aspoň že máš jistý sud... 😂',
      'Poslední kokot platí! 🤡',
      'Letos na to dobře sereš! 💩',
      'Tvoje máma včera večer podávala lepší výkony 😏',
      'To běháš letos s análním kolíkem v prdeli? 🍑',
      'Tak si příště loupni ibalgin, ať něco uběhneš, ne? 💊',
      'Trénuješ na paraolympiádu? ♿',
      'Tvůj výkon je jako tvoje kariéra - neexistující 🤷',
      'Už jsi zvažoval jiný koníček? Třeba pletení? 🧶',
      'S tímhle výkonem nedoběhneš ani k lednici 🍕',
      'Už si vybral pivo, co budeš kupovat na zapíjení? 🍺',
      'Tvoje máma běhá rychlejc, když jde nakupovat 🛒',
      'Tvoje fyzička je jako tvoje šance na výhru - nulová 🚫',
      'Tvoje máma má lepší čas na 5km a ta váží přes metřák 🏃‍♀️',
      'Tvoje tělo vypadá jako kdyby se vzdalo dřív než ty 🏳️'
    ]
    messages.push({
      id: 'last-place',
      type: 'last_place',
      message: messages_last[Math.floor(Math.random() * messages_last.length)],
      timestamp: new Date().toISOString(),
      severity: 'brutal'
    })
  }

  // 3. Máš 3+ dny bez aktivity
  if (consistency.longestGap >= 3) {
    const gapMessages = [
      `Už ${consistency.longestGap} dní nic... Chcípnul si ty mrdko? 💀`,
      `${consistency.longestGap} dní pauza? To se seš asi fakt dobře najedl! 🐷`,
      `${consistency.longestGap} dní klid zbraní? Já ti dám klid! 😤`,
      `${consistency.longestGap} dní... Netflix a chill? Za takovej výkon ti ho stará nevykouří, ani když jí pustíš Emily in Paris 🍆`,
      `${consistency.longestGap} dní bez aktivity? Tvoje boty už mají plíseň! 🦠`,
      `${consistency.longestGap} dní nicnedělání? Tvoje kondice je na úrovni důchodce po mrtvici 👴`,
      `${consistency.longestGap} dní líný jak prase... Aspoň že máš čas na chlast 🍺`,
      `${consistency.longestGap} dní pauza? Tvoje máma by se styděla, kdyby nebyla zvyklá 😔`,
      `${consistency.longestGap} dní bez pohybu? Jediný co se hýbe je tvoje tlama narvaná žrádlem 👄`,
      `${consistency.longestGap} dní nicnedělání? Tvoje motivace nějak zmizela ty bečko sádla`,
      `${consistency.longestGap} dní líný jak kokot... Doufám, že sis aspoň dokurvil koleno`,
      `${consistency.longestGap} dní pauza? Snad ses aspoň dobře nažral 🐷`
    ]
    messages.push({
      id: 'inactive',
      type: 'inactive',
      message: gapMessages[consistency.longestGap >= 7 ? 0 : Math.floor(Math.random() * gapMessages.length)],
      timestamp: new Date().toISOString(),
      severity: consistency.longestGap >= 7 ? 'brutal' : 'medium'
    })
  }

  // 4. Někdo má den s pivem (kontrola posledních 3 dní)
  const recentDrinking = activities.slice(0, 3).filter(a => !a.no_alcohol)
  if (recentDrinking.length > 0) {
    const drinkingMessages = [
      `${userName} zase chlastat, klasika 🍺`,
      `Takže pivo ano, běhání ne? Dobrá strategie pro mrdku jako ${userName}! 🤦`,
      `${userName} má jasně nastavený priority: 🍺 > 🏃`,
      `Vidím že ${userName} chlastá, místo aby zvedl prdel ze židle`,
      `Chlast je tvoje jediná disciplína, kde máš konzistentní výkon 🍻`,
      `S takhle oteklým obličejem bych taky radši nešel běhat 🥴`,
      `Pivní kilometr se do výzvy nepočítá, kokote 🏃‍♂️💨`,
      `${userName} běhá jen když mu dochází pivo v lednici 🍺`,
      `Tvoje máma pije míň a má lepší fyzičku 🍻`,
      `Chlastáš jak prasátko a vypadáš taky 🐷`,
      `${userName} má víc piv v břiše než kilometrů na kontě 🍺`,
      `Kdybys dal tolik energie do běhání jako do chlastání... stejně by to nestačilo`
    ]
    messages.push({
      id: 'drinking',
      type: 'drinking',
      message: drinkingMessages[Math.floor(Math.random() * drinkingMessages.length)],
      timestamp: new Date().toISOString(),
      severity: 'light'
    })
  }

  // 5. Jsi první - motivace
  if (userPosition === 0 && leaderboard.length > 1) {
    const leadMessages = [
      '👑 Král kokotů!',
      '🏆 Jsi první, to tvoje kolena nemůžou vydržet!',
      '💪 Solidní výkon! Teď to neposrat...',
      '🥇 Gratuluju! Konečně ses k něčemu dopracoval v životě',
      '👏 Tak to seš dobrej vymrdanec',
      '🔥 První místo! Hlavně to neposer',
      '⚡ Jsi nahoře! Aspoň jednou v životě...'
    ]
    messages.push({
      id: 'first-place',
      type: 'comeback',
      message: leadMessages[Math.floor(Math.random() * leadMessages.length)],
      timestamp: new Date().toISOString(),
      severity: 'light'
    })
  }

  // 6. Máš pod 50% aktivních dní
  if (consistency.activeDaysPercent < 50) {
    const lazyMessages = [
      `Jen ${consistency.activeDaysPercent.toFixed(0)}% aktivních dní? Ty seš fakt línej kokot! 😴`,
      `${consistency.activeDaysPercent.toFixed(0)}% aktivních dní... Tvůj gauč má větší opotřebení než boty 🛋️`,
      `${consistency.activeDaysPercent.toFixed(0)}% aktivita? To je víc času na Pornhub než na běhání 🔞`,
      `${consistency.activeDaysPercent.toFixed(0)}% konzistence? Konzistentnější jsi akorát v lenošení 💤`,
      `${consistency.activeDaysPercent.toFixed(0)}% aktivita? Víc se hýbeš jen když jdeš na pivo 🍺`,
      `${consistency.activeDaysPercent.toFixed(0)}% dní? S tím břichem to ani jinak nejde, co? 🫃`,
      `${consistency.activeDaysPercent.toFixed(0)}% konzistence! Tvoje fyzička vypadá jako tvoje snaha - nulová 💪`,
      `${consistency.activeDaysPercent.toFixed(0)}% aktivních dní! Jediný co roste je tvoje ztráta`,
      `${consistency.activeDaysPercent.toFixed(0)}% aktivita? Víc pohybu máš i ve spánku 😴`
    ]
    messages.push({
      id: 'lazy-ass',
      type: 'lazy',
      message: lazyMessages[Math.floor(Math.random() * lazyMessages.length)],
      timestamp: new Date().toISOString(),
      severity: 'brutal'
    })
  }

  return messages
}

// Funkce pro načtení globálních nastavení
export async function getSettings(): Promise<AppSettings | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 'global')
    .single()

  if (error) {
    console.error('Error fetching settings:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    return null
  }

  console.log('Settings loaded from DB:', data)
  return data
}

// Funkce pro aktualizaci globálních nastavení (přes Edge Function)
export async function updateSettings(updates: {
  challenge_start?: string
  challenge_end?: string
  sunny_day?: string | null
}): Promise<AppSettings | null> {
  try {
    // Získat heslo z localStorage
    const password = localStorage.getItem('globalPassword')

    if (!password) {
      console.error('Error updating settings: No password found in localStorage')
      return null
    }

    // Zavolat Edge Function
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/update-settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        password,
        updates
      })
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('Error updating settings:', result.error)
      return null
    }

    console.log('Settings updated successfully:', result.data)
    return result.data
  } catch (error) {
    console.error('Error updating settings:', error)
    return null
  }
}
