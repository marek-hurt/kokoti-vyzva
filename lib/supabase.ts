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
