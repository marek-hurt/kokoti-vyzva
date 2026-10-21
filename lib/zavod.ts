// Podklady pro easter egg "Zavod kokotu": vyzvu prehrajeme den po dni.
// Pozice na trati = kumulativni body, vyska terenu = kumulativni kokotmetry
// (1 kokotmetr = 100 m prevyseni).

import { parseDatum, formatDatum, dnes, type Activity, type User } from '@/lib/supabase'

export const BARVY_AVATARU: { [key: string]: string } = {
  'avatar-lime': '#84cc16',
  'avatar-coral': '#f87171',
  'avatar-blue': '#3b82f6',
  'avatar-violet': '#a78bfa',
  'avatar-orange': '#fb923c',
  'avatar-pink': '#f472b6',
  'avatar-cyan': '#06b6d4',
  'avatar-yellow': '#eab308',
  'avatar-green': '#22c55e',
  'avatar-red': '#ef4444',
  'avatar-purple': '#a855f7',
}

export type Sport = 'beh' | 'kolo' | 'bazen' | 'pivo' | 'odpocinek'

export type HracDne = {
  body: number // kumulativne
  prirustek: number // body ziskane tento den
  sport: Sport
  pije: boolean | null // null = den nezapsany
  vyska: number // kumulativni prevyseni v metrech
  kokotmetryDne: number
}

export type Snimek = {
  datum: string
  hraci: { [userId: string]: HracDne }
}

export type Zavod = {
  hraci: User[]
  // snimky[0] je start (same nuly), snimky[i] je stav po i-tem dni
  snimky: Snimek[]
}

function dominantniSport(a: Activity): Sport {
  const body: [Sport, number][] = [
    ['beh', a.beh],
    ['kolo', Math.floor(a.kolo / 10) * 2],
    ['bazen', Math.floor(a.bazen) * 2],
  ]
  body.sort((x, y) => y[1] - x[1])
  if (body[0][1] > 0) return body[0][0]
  // zadne body, ale nejaky pohyb se pocita (napr. kolo pod 10 km)
  if (a.kolo > 0) return 'kolo'
  if (a.bazen > 0) return 'bazen'
  if (a.beh > 0 || a.kokotmetr > 0) return 'beh'
  return 'odpocinek'
}

export function sestavitZavod(
  activities: Activity[],
  users: User[],
  start: string,
  end: string,
  sunnyDay?: string
): Zavod {
  const konec = formatDatum(dnes()) < end ? formatDatum(dnes()) : end
  const vRozmezi = activities.filter(a => a.date >= start && a.date <= konec)
  const idsSAktivitou = new Set(vRozmezi.map(a => a.user_id))
  const hraci = users.filter(u => idsSAktivitou.has(u.id))
  if (hraci.length === 0) return { hraci: [], snimky: [] }

  const podleDne = new Map<string, Map<string, Activity>>()
  vRozmezi.forEach(a => {
    if (!podleDne.has(a.date)) podleDne.set(a.date, new Map())
    podleDne.get(a.date)!.set(a.user_id, a)
  })

  const kumulativne: { [id: string]: { body: number; vyska: number } } = {}
  hraci.forEach(u => { kumulativne[u.id] = { body: 0, vyska: 0 } })

  const nulovy: Snimek = { datum: start, hraci: {} }
  hraci.forEach(u => {
    nulovy.hraci[u.id] = { body: 0, prirustek: 0, sport: 'odpocinek', pije: null, vyska: 0, kokotmetryDne: 0 }
  })
  const snimky: Snimek[] = [nulovy]

  for (let d = parseDatum(start); formatDatum(d) <= konec; d.setDate(d.getDate() + 1)) {
    const datum = formatDatum(d)
    const denni = podleDne.get(datum)
    const jeSunny = !!sunnyDay && datum === sunnyDay

    // Slunickovy den: kokotmetr = pocet piv, body dostane jen vitez (viz getLeaderboard)
    let vitezId: string | null = null
    if (jeSunny && denni) {
      let max = 0
      denni.forEach((a, id) => {
        if (a.kokotmetr > max) { max = a.kokotmetr; vitezId = id }
      })
    }

    const snimek: Snimek = { datum, hraci: {} }
    hraci.forEach(u => {
      const a = denni?.get(u.id)
      const k = kumulativne[u.id]
      let prirustek = 0
      let sport: Sport = 'odpocinek'
      let kokotmetryDne = 0
      if (a) {
        if (jeSunny) {
          sport = 'pivo'
          if (u.id === vitezId) prirustek += a.kokotmetr
          if (a.no_alcohol) prirustek += 1
        } else {
          prirustek = a.beh + Math.floor(a.kolo / 10) * 2 + Math.floor(a.bazen) * 2 + a.kokotmetr + (a.no_alcohol ? 1 : 0)
          sport = dominantniSport(a)
          kokotmetryDne = a.kokotmetr
        }
      }
      k.body += prirustek
      k.vyska += kokotmetryDne * 100
      snimek.hraci[u.id] = {
        body: k.body,
        prirustek,
        sport,
        pije: a ? !a.no_alcohol : null,
        vyska: k.vyska,
        kokotmetryDne,
      }
    })
    snimky.push(snimek)
  }

  return { hraci, snimky }
}
