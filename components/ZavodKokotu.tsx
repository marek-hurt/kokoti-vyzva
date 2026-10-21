'use client'

// Easter egg: prehraje vyzvu den po dni jako 2D zavod.
// Pozice = kumulativni body, teren = kumulativni kokotmetry (1 = 100 m).

import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, X } from 'lucide-react'
import { parseDatum, type Activity, type User } from '@/lib/supabase'
import { BARVY_AVATARU, sestavitZavod, type Sport } from '@/lib/zavod'

type Props = {
  activities: Activity[]
  users: User[]
  challengeStart: string
  challengeEnd: string
  sunnyDay?: string
  onClose: () => void
}

const SIRKA = 360
const X_START = 26
const X_CIL = 322
const VYSKA_DRAHY = 84
const ZEM = 68 // y zeme v ramci drahy
const MAX_KOPEC = 32
const EMOJI_SPORTU: Record<Sport, string> = { beh: '🏃', kolo: '🚴', bazen: '🏊', pivo: '🍺', odpocinek: '😴' }

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const rad = (deg: number) => (deg * Math.PI) / 180

// Koncetina o dvou clancich; uhel 0 = dolu, kladny = dopredu
function Koncetina({ x, y, a, b, d1, d2, opacity }: { x: number; y: number; a: number; b: number; d1: number; d2: number; opacity?: number }) {
  const kx = x + d1 * Math.sin(rad(a))
  const ky = y + d1 * Math.cos(rad(a))
  const fx = kx + d2 * Math.sin(rad(b))
  const fy = ky + d2 * Math.cos(rad(b))
  return <polyline points={`${x},${y} ${kx},${ky} ${fx},${fy}`} opacity={opacity} fill="none" strokeLinecap="round" strokeLinejoin="round" />
}

function Napoj({ x, y, pije }: { x: number; y: number; pije: boolean | null }) {
  if (pije === null) return null
  if (pije) {
    return (
      <g transform={`translate(${x},${y})`}>
        <rect x={-2.5} y={-3} width={5} height={6} rx={1} fill="#f5b82e" stroke="#9a6a00" strokeWidth={0.6} />
        <rect x={-2.5} y={-4.5} width={5} height={2} rx={1} fill="#fff" />
      </g>
    )
  }
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-1.5} y={-4} width={3} height={7} rx={1} fill="#5bb8f0" stroke="#2878a8" strokeWidth={0.6} />
      <rect x={-1} y={-5.5} width={2} height={1.8} fill="#2878a8" />
    </g>
  )
}

function Postavicka({ sport, pije, phase, sklon, barva }: { sport: Sport; pije: boolean | null; phase: number; sklon: number; barva: string }) {
  const s = Math.sin(phase)
  const c = Math.cos(phase)
  const kuze = '#f3cfa8'
  const kolebani = pije ? Math.sin(phase * 0.5) * 5 : 0
  const stroke = { stroke: barva, strokeWidth: 2.4 }
  let telo: React.ReactNode

  if (sport === 'bazen') {
    telo = (
      <g>
        <g {...stroke} fill="none" strokeLinecap="round">
          <line x1={-8} y1={-3} x2={6} y2={-3} />
          <polyline points={`-8,-3 -13,${-3 + 2 * s} -17,${-3 - 2 * s}`} />
          <line x1={5} y1={-3} x2={5 + 8 * c} y2={-3 + 8 * s} />
        </g>
        <circle cx={9} cy={-4} r={3.5} fill={kuze} />
        <Napoj x={16} y={-7} pije={pije} />
      </g>
    )
  } else if (sport === 'kolo') {
    const phi = phase * 1.3
    const pxc = Math.cos(phi) * 4
    const pyc = -7 + Math.sin(phi) * 4
    const pxo = -pxc
    const pyo = -7 - Math.sin(phi) * 4
    const kolo = (cx: number) => (
      <g transform={`translate(${cx},-7)`}>
        <circle r={7} fill="none" stroke="#33413a" strokeWidth={1.2} />
        <g transform={`rotate(${phase * 57})`} stroke="#33413a" strokeWidth={0.7}>
          <line x1={-7} y1={0} x2={7} y2={0} />
          <line x1={0} y1={-7} x2={0} y2={7} />
        </g>
      </g>
    )
    telo = (
      <g>
        {kolo(-10)}
        {kolo(10)}
        <polyline points="-10,-7 -3,-16 7,-16 10,-7" fill="none" stroke="#33413a" strokeWidth={1.2} />
        <polyline points="-3,-16 0,-7 7,-16" fill="none" stroke="#33413a" strokeWidth={1.2} />
        <g {...stroke} fill="none" strokeLinecap="round">
          <polyline points={`-3,-17 ${(-3 + pxc) / 2 + 3},${(-17 + pyc) / 2} ${pxc},${pyc}`} />
          <polyline points={`-3,-17 ${(-3 + pxo) / 2 + 3},${(-17 + pyo) / 2} ${pxo},${pyo}`} opacity={0.7} />
          <line x1={-3} y1={-17} x2={3} y2={-26} />
          <polyline points="3,-26 6,-22 7,-18" />
        </g>
        <circle cx={5} cy={-30} r={4} fill={kuze} />
        <Napoj x={9} y={-21} pije={pije} />
      </g>
    )
  } else if (sport === 'odpocinek' || sport === 'pivo') {
    const zvednute = sport === 'pivo'
    telo = (
      <g>
        <g {...stroke} fill="none" strokeLinecap="round">
          <line x1={0} y1={-23} x2={0} y2={-13} />
          <line x1={0} y1={-13} x2={-3} y2={0} />
          <line x1={0} y1={-13} x2={3} y2={0} />
          <line x1={0} y1={-22} x2={-4} y2={-15} />
          <polyline points={zvednute ? '0,-22 5,-24 5,-30' : '0,-22 4,-17 5,-18'} />
        </g>
        <circle cx={0} cy={-28} r={4} fill={kuze} />
        {sport === 'pivo' ? <Napoj x={5} y={-33} pije={true} /> : <Napoj x={5} y={-18} pije={pije} />}
      </g>
    )
  } else {
    telo = (
      <g>
        <g {...stroke} fill="none" strokeLinecap="round">
          <line x1={0} y1={-23} x2={1.5} y2={-13} />
          <Koncetina x={1.5} y={-13} a={s * 45} b={s * 45 - 30 - 20 * s} d1={7} d2={7} />
          <Koncetina x={1.5} y={-13} a={-s * 45} b={-s * 45 - 30 + 20 * s} d1={7} d2={7} />
          <Koncetina x={0.5} y={-22} a={-s * 50} b={-s * 50 + 60} d1={5} d2={5} />
          <Koncetina x={0.5} y={-22} a={s * 50} b={s * 50 + 60} d1={5} d2={5} opacity={0.7} />
        </g>
        <circle cx={2} cy={-28} r={4} fill={kuze} />
      </g>
    )
    // napoj drzime v predni ruce
    telo = (
      <g>
        {telo}
        <Napoj x={5 + s * 4} y={-21} pije={pije} />
      </g>
    )
  }

  return (
    <g transform={`rotate(${sklon + kolebani})`}>
      {telo}
      {pije === false && <ellipse cx={sport === 'bazen' ? 9 : sport === 'kolo' ? 5 : 1} cy={sport === 'bazen' ? -10 : sport === 'kolo' ? -37 : -35} rx={4.5} ry={1.4} fill="none" stroke="#f5d14a" strokeWidth={1.2} />}
    </g>
  )
}

export default function ZavodKokotu({ activities, users, challengeStart, challengeEnd, sunnyDay, onClose }: Props) {
  const zavod = useMemo(
    () => sestavitZavod(activities, users, challengeStart, challengeEnd, sunnyDay),
    [activities, users, challengeStart, challengeEnd, sunnyDay]
  )
  const { hraci, snimky } = zavod
  const pocetDni = Math.max(snimky.length - 1, 0)

  const [pos, setPos] = useState(0)
  const [hraje, setHraje] = useState(true)
  const [rychlost, setRychlost] = useState(1)
  const [snizenyPohyb, setSnizenyPohyb] = useState(false)
  const posRef = useRef(0)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setSnizenyPohyb(mq.matches)
    const zmena = () => setSnizenyPohyb(mq.matches)
    mq.addEventListener('change', zmena)
    return () => mq.removeEventListener('change', zmena)
  }, [])

  useEffect(() => {
    const klavesa = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', klavesa)
    const puvodni = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', klavesa)
      document.body.style.overflow = puvodni
    }
  }, [onClose])

  useEffect(() => { posRef.current = pos }, [pos])

  useEffect(() => {
    if (!hraje || pocetDni === 0) return
    if (snizenyPohyb) {
      const t = setInterval(() => {
        const dalsi = Math.min(Math.floor(posRef.current) + 1, pocetDni)
        setPos(dalsi)
        if (dalsi >= pocetDni) setHraje(false)
      }, 900 / rychlost)
      return () => clearInterval(t)
    }
    let predchozi = performance.now()
    let raf = requestAnimationFrame(function krok(ted) {
      // casova znamka rAF muze byt o chlup starsi nez performance.now() -> zaporne dt
      const dt = Math.max(0, Math.min((ted - predchozi) / 1000, 0.1))
      predchozi = ted
      const dalsi = Math.min(posRef.current + dt * rychlost * 0.8, pocetDni)
      posRef.current = dalsi
      setPos(dalsi)
      if (dalsi >= pocetDni) { setHraje(false); return }
      raf = requestAnimationFrame(krok)
    })
    return () => cancelAnimationFrame(raf)
  }, [hraje, rychlost, pocetDni, snizenyPohyb])

  const maxBodu = useMemo(() => {
    const posledni = snimky[pocetDni]
    return Math.max(1, ...hraci.map(h => posledni?.hraci[h.id].body ?? 0))
  }, [snimky, hraci, pocetDni])
  const maxVyska = useMemo(() => {
    const posledni = snimky[pocetDni]
    return Math.max(1, ...hraci.map(h => posledni?.hraci[h.id].vyska ?? 0))
  }, [snimky, hraci, pocetDni])

  const xBodu = (b: number) => X_START + (b / maxBodu) * (X_CIL - X_START)
  const yVysky = (m: number, top: number) => top + ZEM - (m / maxVyska) * MAX_KOPEC

  const hotovo = pocetDni > 0 && pos >= pocetDni
  const i = Math.max(0, Math.min(Math.floor(pos), pocetDni - 1))
  const f = Math.max(0, Math.min(pos - i, 1))
  const aktualni = snimky[Math.min(Math.ceil(pos), pocetDni)]

  const stav = hraci.map((h, idx) => {
    const a = snimky[i]?.hraci[h.id]
    const b = snimky[Math.min(i + 1, pocetDni)]?.hraci[h.id]
    const body = a && b ? lerp(a.body, b.body, f) : 0
    const vyska = a && b ? lerp(a.vyska, b.vyska, f) : 0
    return { hrac: h, idx, body, vyska, sport: (b ?? a).sport, pije: (b ?? a).pije, final: snimky[pocetDni].hraci[h.id] }
  })

  const nejlepsiDne = aktualni
    ? hraci.map(h => ({ h, d: aktualni.hraci[h.id] })).sort((x, y) => y.d.prirustek - x.d.prirustek)[0]
    : null
  const strizlivych = aktualni ? hraci.filter(h => aktualni.hraci[h.id].pije === false).length : 0
  const zapsanych = aktualni ? hraci.filter(h => aktualni.hraci[h.id].pije !== null).length : 0
  const poradi = [...stav].sort((a, b) => b.final.body - a.final.body)
  const datumText = aktualni && pos > 0 ? parseDatum(aktualni.datum).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' }) : 'Start'

  const vyskaSceny = Math.max(hraci.length, 1) * VYSKA_DRAHY + 8

  return (
    <div
      role="dialog"
      aria-label="Závod kokotů"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, overflowY: 'auto', background: 'linear-gradient(#cfeaf7, #eaf6ee 40%, #f3f7f2)', fontFamily: 'var(--font-sans)' }}
    >
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '14px 12px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <p style={{ margin: 0, font: '700 10px var(--font-display)', letterSpacing: '.08em', color: '#1b9b62' }}>EASTER EGG</p>
            <h2 style={{ margin: 0, font: '700 22px var(--font-display)', color: '#173b29' }}>Závod kokotů 🏁</h2>
          </div>
          <button onClick={onClose} aria-label="Zavřít" style={{ border: 0, background: '#fff', borderRadius: 12, width: 38, height: 38, display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: '0 2px 8px #0001' }}>
            <X size={18} />
          </button>
        </div>

        {pocetDni === 0 ? (
          <p style={{ color: '#5f6f66' }}>Zatím není co závodit. Nikdo nic nezapsal.</p>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '4px 2px 6px', color: '#173b29' }}>
              <strong style={{ font: '700 15px var(--font-display)' }}>
                {pos > 0 ? `Den ${Math.min(Math.ceil(pos), pocetDni)} / ${pocetDni}` : 'Na startu'} · {datumText}
              </strong>
              <small style={{ color: '#5f6f66' }}>{zapsanych > 0 ? `střízliví: ${strizlivych} z ${zapsanych}` : ''}</small>
            </div>
            <p style={{ margin: '0 2px 8px', minHeight: 18, fontSize: 12, color: '#5f6f66' }}>
              {pos > 0 && nejlepsiDne && nejlepsiDne.d.prirustek > 0
                ? `Dnes nejvíc urval ${nejlepsiDne.h.name}: +${nejlepsiDne.d.prirustek} b.${nejlepsiDne.d.kokotmetryDne > 0 ? ` (${nejlepsiDne.d.kokotmetryDne * 100} m nahoru)` : ''}`
                : pos > 0 ? 'Dnes se nikdo nehnul z místa.' : 'Připravit, pozor...'}
            </p>

            <svg viewBox={`0 0 ${SIRKA} ${vyskaSceny}`} width="100%" style={{ display: 'block', background: '#ffffffb0', borderRadius: 16, border: '1px solid #e3ece4' }}>
              <line x1={X_CIL} y1={0} x2={X_CIL} y2={vyskaSceny} stroke="#173b29" strokeWidth={1} strokeDasharray="3 3" />
              <text x={X_CIL + 3} y={12} fontSize={9}>🏁</text>
              {stav.map(({ hrac, idx, body, vyska, sport, pije, final }) => {
                const top = idx * VYSKA_DRAHY + 4
                const barva = BARVY_AVATARU[hrac.color] || '#10b981'
                const profil = snimky.map(s => `${xBodu(s.hraci[hrac.id].body)},${yVysky(s.hraci[hrac.id].vyska, top)}`)
                const baseline = top + ZEM
                const x = xBodu(body)
                const y = yVysky(vyska, top)
                // sklon z lokalniho svahu (ze snimku, ktery se prave prehrava)
                const a = snimky[i].hraci[hrac.id]
                const b = snimky[Math.min(i + 1, pocetDni)].hraci[hrac.id]
                const dx = xBodu(b.body) - xBodu(a.body)
                const dy = yVysky(b.vyska, top) - yVysky(a.vyska, top)
                const sklon = sport === 'bazen' || dx < 0.5 ? 0 : Math.max(-25, Math.min(25, (Math.atan2(dy, dx) * 180) / Math.PI))
                const fazeBase = pos * Math.PI * 6 + idx
                const faze = snizenyPohyb ? 0 : fazeBase
                const plave = sport === 'bazen'
                return (
                  <g key={hrac.id}>
                    <line x1={X_START} y1={baseline} x2={X_CIL} y2={baseline} stroke="#cfd9d2" strokeWidth={0.8} />
                    <polygon points={`${xBodu(0)},${baseline} ${profil.join(' ')} ${xBodu(final.body)},${baseline}`} fill={barva} opacity={0.22} />
                    <polyline points={profil.join(' ')} fill="none" stroke={barva} strokeWidth={1.6} strokeLinejoin="round" />
                    <g transform={`translate(${x},${y})`}>
                      <Postavicka sport={sport} pije={pije} phase={faze} sklon={sklon} barva={barva} />
                      {plave && (
                        <path
                          d={`M-20,-1 Q-15,${-4 + Math.sin(faze) * 1.5} -10,-1 T0,-1 T10,-1 T20,-1 V6 H-20 Z`}
                          fill="#4aa8e0" opacity={0.65}
                        />
                      )}
                    </g>
                    <text x={4} y={top + VYSKA_DRAHY - 4} fontSize={9} fontWeight={700} fill="#173b29">
                      {EMOJI_SPORTU[sport]} {hrac.name} · {Math.round(body)} b. · {Math.round(vyska)} m
                    </text>
                  </g>
                )
              })}
            </svg>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <button
                onClick={() => {
                  if (hotovo) { posRef.current = 0; setPos(0); setHraje(true) } else setHraje(h => !h)
                }}
                aria-label={hotovo ? 'Znovu' : hraje ? 'Pauza' : 'Přehrát'}
                style={{ border: 0, background: '#1b9b62', color: '#fff', borderRadius: 12, width: 40, height: 40, display: 'grid', placeItems: 'center', cursor: 'pointer' }}
              >
                {hotovo ? <RotateCcw size={18} /> : hraje ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <input
                type="range" min={0} max={pocetDni} step={1} value={Math.round(pos)}
                onChange={e => { const v = Number(e.target.value); posRef.current = v; setPos(v); setHraje(false) }}
                aria-label="Den výzvy"
                style={{ flex: 1, accentColor: '#1b9b62' }}
              />
              <button
                onClick={() => setRychlost(r => (r === 1 ? 2 : r === 2 ? 4 : 1))}
                style={{ border: '1px solid #cfe3d5', background: '#fff', borderRadius: 12, height: 40, minWidth: 46, font: '700 13px var(--font-display)', cursor: 'pointer' }}
                aria-label="Rychlost"
              >
                {rychlost}×
              </button>
            </div>

            {hotovo && (
              <div style={{ marginTop: 14, padding: 14, background: '#fff', borderRadius: 16, border: '1px solid #e3ece4' }}>
                <h3 style={{ margin: '0 0 8px', font: '700 15px var(--font-display)', color: '#173b29' }}>🏆 Cíl</h3>
                {poradi.map((p, n) => (
                  <div key={p.hrac.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: '#173b29' }}>
                    <span>{n === 0 ? '🥇' : n === 1 ? '🥈' : n === 2 ? '🥉' : `${n + 1}.`} {p.hrac.name}</span>
                    <span>{p.final.body} b. · {p.final.vyska} m nahoru</span>
                  </div>
                ))}
              </div>
            )}
            <p style={{ marginTop: 12, fontSize: 10, color: '#8a9890', textAlign: 'center' }}>
              Pozice = body, kopce = kokotmetry (1 = 100 m). Pivo v ruce = pil, svatozář = střízlivý.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
