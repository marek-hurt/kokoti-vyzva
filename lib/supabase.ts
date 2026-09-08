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
  km: number
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
  total_km: number
  total_kokotmetr: number
  sober_days: number
  total_points: number
}

// API funkce
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
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
  km: number
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
    km?: number
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
