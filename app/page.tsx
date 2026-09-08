'use client'

import { useState, useEffect, useRef, Fragment } from 'react'
import {
  BarChart3,
  Beer,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  Edit2,
  Flame,
  Home,
  Mountain,
  Plus,
  ShieldCheck,
  Table,
  Trash2,
  Trophy,
  UserRound,
  WineOff,
  X,
  Zap,
} from 'lucide-react'
import { getLeaderboard, getUsers, addActivity, getAllActivities, deleteActivity, updateActivity, getPointsHistory, type LeaderboardEntry, type User, type Activity, type PointsHistory } from '@/lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts'

export default function Page() {
  const [activeTab, setActiveTab] = useState('home')
  const [alcoholFree, setAlcoholFree] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [beh, setBeh] = useState('0')
  const [kolo, setKolo] = useState('0')
  const [bazen, setBasen] = useState('0')
  const [kokotmetr, setKokotmetr] = useState('0')
  const [activities, setActivities] = useState<(Activity & { user_name: string })[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState({ beh: '', kolo: '', bazen: '', kokotmetr: '', no_alcohol: false })
  const [filterUserId, setFilterUserId] = useState<string>('all')
  const [pointsHistory, setPointsHistory] = useState<PointsHistory[]>([])
  const entryFormRef = useRef<HTMLElement>(null)

  // Načíst data z databáze
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const [leaderboardData, usersData, activitiesData, historyData] = await Promise.all([
        getLeaderboard(),
        getUsers(),
        getAllActivities(),
        getPointsHistory()
      ])
      setLeaderboard(leaderboardData)
      setUsers(usersData)
      setActivities(activitiesData)
      setPointsHistory(historyData)

      // Vybrat uživatele podle URL parametru ?kokot=Jmeno, jinak z localStorage, jinak prvního
      if (usersData.length > 0 && !selectedUserId) {
        const kokotParam = new URLSearchParams(window.location.search).get('kokot')
        const userFromParam = kokotParam
          ? usersData.find(u => u.name.toLowerCase() === kokotParam.toLowerCase())
          : undefined
        const savedUserId = localStorage.getItem('selectedUserId')
        if (userFromParam) {
          setSelectedUserId(userFromParam.id)
        } else if (savedUserId && usersData.find(u => u.id === savedUserId)) {
          setSelectedUserId(savedUserId)
        } else {
          setSelectedUserId(usersData[0].id)
        }
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  // Uložit vybraného uživatele do localStorage při změně
  useEffect(() => {
    if (selectedUserId) {
      localStorage.setItem('selectedUserId', selectedUserId)
    }
  }, [selectedUserId])


  // Funkce pro přidání aktivity
  async function handleSubmit() {
    if (!selectedUserId) return

    const today = new Date().toISOString().split('T')[0]
    const result = await addActivity({
      user_id: selectedUserId,
      date: today,
      beh: parseFloat(beh),
      kolo: parseFloat(kolo),
      bazen: parseFloat(bazen),
      kokotmetr: parseInt(kokotmetr),
      no_alcohol: alcoholFree
    })

    if (result) {
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 1800)

      // Obnovit data
      const [newLeaderboard, newActivities, newHistory] = await Promise.all([
        getLeaderboard(),
        getAllActivities(),
        getPointsHistory()
      ])
      setLeaderboard(newLeaderboard)
      setActivities(newActivities)
      setPointsHistory(newHistory)
    }
  }

  // Funkce pro smazání aktivity
  async function handleDelete(id: string) {
    if (!confirm('Opravdu smazat tento záznam?')) return

    const success = await deleteActivity(id)
    if (success) {
      const [newLeaderboard, newActivities] = await Promise.all([
        getLeaderboard(),
        getAllActivities()
      ])
      setLeaderboard(newLeaderboard)
      setActivities(newActivities)
    }
  }

  // Funkce pro začátek úpravy
  function startEdit(activity: Activity & { user_name: string }) {
    setEditingId(activity.id)
    setEditValues({
      beh: activity.beh.toString(),
      kolo: activity.kolo.toString(),
      bazen: activity.bazen.toString(),
      kokotmetr: activity.kokotmetr.toString(),
      no_alcohol: activity.no_alcohol
    })
  }

  // Funkce pro uložení úpravy
  async function saveEdit(id: string) {
    const result = await updateActivity(id, {
      beh: parseFloat(editValues.beh),
      kolo: parseFloat(editValues.kolo),
      bazen: parseFloat(editValues.bazen),
      kokotmetr: parseInt(editValues.kokotmetr),
      no_alcohol: editValues.no_alcohol
    })

    if (result) {
      setEditingId(null)
      const [newLeaderboard, newActivities, newHistory] = await Promise.all([
        getLeaderboard(),
        getAllActivities(),
        getPointsHistory()
      ])
      setLeaderboard(newLeaderboard)
      setActivities(newActivities)
      setPointsHistory(newHistory)
    }
  }

  const selectedUser = users.find(u => u.id === selectedUserId)

  return (
    <main className="app-shell">
      <div className="app-inner">
        <header className="topbar">
          <div className="brand-lockup">
            <div className="brand-mark"><Trophy /></div>
            <div>
              <p className="eyebrow">KOKOTÍ VÝZVA</p>
              <h1>Dokážeš-li to, <span>není to jen sen!</span></h1>
            </div>
          </div>
          {selectedUser && (
            <div className="profile-lockup">
              <span className="profile-name">Kokot {selectedUser.name}</span>
              <button className="profile-button" aria-label="Otevřít profil"><span>{selectedUser.initials}</span></button>
            </div>
          )}
        </header>

        {activeTab === 'home' && <>
          <section className="week-card">
            <div>
              <div className="week-label"><span className="live-dot" /> 3. TÝDEN VÝZVY</div>
              <p className="week-title">Ještě 4 dny do cíle</p>
              <p className="week-subtitle">Společně jsme uběhli <strong>{leaderboard.reduce((sum, r) => sum + r.total_beh, 0).toFixed(1)} km</strong></p>
            </div>
            <div className="week-ring"><strong>68%</strong><span>hotovo</span></div>
          </section>

          <section className="section-heading">
            <div><p className="eyebrow">TABULKA VÝKONŮ</p><h2>Pořadí <span>kokotů</span></h2></div>
            <button className="icon-button" aria-label="Nápověda"><CircleHelp /></button>
          </section>

          <section className="leaderboard" aria-label="Pořadí týmu">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Načítám data...</div>
            ) : leaderboard.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Žádná data</div>
            ) : (
              leaderboard.map((runner, index) => {
                const rank = index + 1
                const maxPoints = leaderboard[0]?.total_points || 1
                const progress = Math.round((runner.total_points / maxPoints) * 100)
                const isCurrent = runner.id === selectedUserId
                const isLast = rank === leaderboard.length

                return (
                  <article
                    className={`runner-card ${isCurrent ? 'runner-current' : ''}`}
                    key={runner.id}
                    onClick={() => {
                      setSelectedUserId(runner.id)
                      entryFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="rank">{rank === 1 ? <Trophy className="rank-trophy" /> : isLast ? <Beer className="rank-trophy" style={{ color: '#f59e0b' }} /> : `0${rank}`}</div>
                    <div className={`avatar ${runner.color}`}>{runner.initials}</div>
                    <div className="runner-main">
                      <div className="runner-top"><h3>{runner.name}</h3><strong>{runner.total_points} <small>bodů</small></strong></div>
                      <div className="runner-stats">
                        <span><Zap /> {runner.total_beh.toFixed(1)} km</span>
                        <span><Mountain /> {runner.total_kokotmetr.toLocaleString()} kokotm</span>
                        <span><WineOff /> {runner.sober_days} dní</span>
                      </div>
                      <div className="progress-track"><div style={{ width: `${progress}%` }} /></div>
                    </div>
                    {isCurrent && <span className="you-badge">TY</span>}
                  </article>
                )
              })
            )}
          </section>

          <section className="entry-card" ref={entryFormRef}>
            <div className="entry-heading">
              <div><p className="eyebrow">DENNÍ ZÁPIS</p><h2>Přidat <span>dnešek</span></h2></div>
              <div className="date-pill"><CalendarDays /> {new Date().toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })}</div>
            </div>

            {/* Výběr uživatele */}
            <label style={{ marginBottom: '1rem', display: 'block' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: '#888' }}>KOKOT</span>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#000', color: '#fff', fontSize: '1rem' }}
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </label>

            <div className="field-row">
              <label>
                <span>BĚH</span>
                <div className="input-wrap">
                  <input
                    type="number"
                    value={beh}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '' || parseFloat(val) >= 0) setBeh(val)
                    }}
                    aria-label="Běh v kilometrech"
                    step="0.1"
                    min="0"
                  />
                  <b>km</b>
                </div>
              </label>
              <label>
                <span>KOLO</span>
                <div className="input-wrap">
                  <input
                    type="number"
                    value={kolo}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '' || parseFloat(val) >= 0) setKolo(val)
                    }}
                    aria-label="Kolo v kilometrech"
                    step="0.1"
                    min="0"
                  />
                  <b>km</b>
                </div>
              </label>
            </div>
            <div className="field-row">
              <label>
                <span>BAZÉN</span>
                <div className="input-wrap">
                  <input
                    type="number"
                    value={bazen}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '' || parseFloat(val) >= 0) setBasen(val)
                    }}
                    aria-label="Bazén v kilometrech"
                    step="0.1"
                    min="0"
                  />
                  <b>km</b>
                </div>
              </label>
              <label>
                <span>KOKOTMETR</span>
                <div className="input-wrap">
                  <input
                    type="number"
                    value={kokotmetr}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '' || parseInt(val) >= 0) setKokotmetr(val)
                    }}
                    aria-label="Kokotmetr"
                    min="0"
                  />
                  <b>kokotm</b>
                </div>
              </label>
            </div>
            <button className={`sober-toggle ${alcoholFree ? 'selected' : ''}`} onClick={() => setAlcoholFree(!alcoholFree)} aria-pressed={alcoholFree}>
              <span className="check-box">{alcoholFree && <Check />}</span>
              <span><strong>Den bez alkoholu</strong><small>Počítá se do celkového skóre</small></span>
              <ShieldCheck />
            </button>
            <button className="submit-button" onClick={handleSubmit} disabled={!selectedUserId || loading}>
              {submitted ? <><Check /> Zapsáno!</> : <><Plus /> Zapsat aktivitu</>}
            </button>
          </section>
        </>}

        {activeTab === 'table' && (() => {
          const filteredActivities = filterUserId === 'all'
            ? activities
            : activities.filter(a => a.user_id === filterUserId)

          return (
            <section style={{ padding: '1rem', marginBottom: '5rem' }}>
              <div className="section-heading" style={{ marginBottom: '1rem' }}>
                <div><p className="eyebrow">VŠECHNY AKTIVITY</p><h2>Tabulka <span>záznamů</span></h2></div>
              </div>

              {/* Filtr uživatelů */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: '#888' }}>FILTR KOKOTA</span>
                  <select
                    value={filterUserId}
                    onChange={(e) => setFilterUserId(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#000', color: '#fff', fontSize: '1rem' }}
                  >
                    <option value="all">Všichni kokoti</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Celkové výsledky */}
              <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', color: 'white' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', opacity: 0.9 }}>
                  {filterUserId === 'all' ? 'CELKOVÉ VÝSLEDKY' : `VÝSLEDKY - ${users.find(u => u.id === filterUserId)?.name}`}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '0.75rem', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{filteredActivities.reduce((sum, a) => sum + parseFloat(a.beh.toString()), 0).toFixed(1)}</div>
                    <div style={{ fontSize: '0.625rem', opacity: 0.9, lineHeight: 1.2 }}>běh km</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{filteredActivities.reduce((sum, a) => sum + parseFloat(a.kolo.toString()), 0).toFixed(1)}</div>
                    <div style={{ fontSize: '0.625rem', opacity: 0.9, lineHeight: 1.2 }}>kolo km</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{filteredActivities.reduce((sum, a) => sum + parseFloat(a.bazen.toString()), 0).toFixed(1)}</div>
                    <div style={{ fontSize: '0.625rem', opacity: 0.9, lineHeight: 1.2 }}>bazén km</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{filteredActivities.reduce((sum, a) => sum + a.kokotmetr, 0).toLocaleString()}</div>
                    <div style={{ fontSize: '0.625rem', opacity: 0.9, lineHeight: 1.2 }}>kokotm</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{filteredActivities.filter(a => a.no_alcohol).length}</div>
                    <div style={{ fontSize: '0.625rem', opacity: 0.9, lineHeight: 1.2 }}>dní bez 🍺</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{filteredActivities.reduce((sum, a) => sum + Math.floor(a.beh) + Math.floor(a.kolo / 10) * 2 + Math.floor(a.bazen) * 2 + a.kokotmetr + (a.no_alcohol ? 1 : 0), 0)}</div>
                    <div style={{ fontSize: '0.625rem', opacity: 0.9, lineHeight: 1.2 }}>body</div>
                  </div>
                </div>
              </div>

            <div className="wide-section" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #333' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Datum</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Uživatel</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>běh</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>kolo</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>bazén</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>kokotm</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600 }}>🚫🍺</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActivities.map((activity) => (
                    <tr key={activity.id} style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '0.75rem' }}>{new Date(activity.date).toLocaleDateString('cs-CZ')}</td>
                      <td style={{ padding: '0.75rem' }}>{activity.user_name}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        {editingId === activity.id ? (
                          <input
                            type="number"
                            value={editValues.beh}
                            onChange={(e) => {
                              const val = e.target.value
                              if (val === '' || parseFloat(val) >= 0) setEditValues({...editValues, beh: val})
                            }}
                            style={{ width: '60px', padding: '0.25rem', background: '#111', border: '1px solid #333', borderRadius: '4px', color: '#fff' }}
                            min="0"
                            step="0.1"
                          />
                        ) : activity.beh}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        {editingId === activity.id ? (
                          <input
                            type="number"
                            value={editValues.kolo}
                            onChange={(e) => {
                              const val = e.target.value
                              if (val === '' || parseFloat(val) >= 0) setEditValues({...editValues, kolo: val})
                            }}
                            style={{ width: '60px', padding: '0.25rem', background: '#111', border: '1px solid #333', borderRadius: '4px', color: '#fff' }}
                            min="0"
                            step="0.1"
                          />
                        ) : activity.kolo}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        {editingId === activity.id ? (
                          <input
                            type="number"
                            value={editValues.bazen}
                            onChange={(e) => {
                              const val = e.target.value
                              if (val === '' || parseFloat(val) >= 0) setEditValues({...editValues, bazen: val})
                            }}
                            style={{ width: '60px', padding: '0.25rem', background: '#111', border: '1px solid #333', borderRadius: '4px', color: '#fff' }}
                            min="0"
                            step="0.1"
                          />
                        ) : activity.bazen}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        {editingId === activity.id ? (
                          <input
                            type="number"
                            value={editValues.kokotmetr}
                            onChange={(e) => {
                              const val = e.target.value
                              if (val === '' || parseInt(val) >= 0) setEditValues({...editValues, kokotmetr: val})
                            }}
                            style={{ width: '60px', padding: '0.25rem', background: '#111', border: '1px solid #333', borderRadius: '4px', color: '#fff' }}
                            min="0"
                          />
                        ) : activity.kokotmetr}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {editingId === activity.id ? (
                          <input
                            type="checkbox"
                            checked={editValues.no_alcohol}
                            onChange={(e) => setEditValues({...editValues, no_alcohol: e.target.checked})}
                          />
                        ) : (activity.no_alcohol ? '✓' : '—')}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        {editingId === activity.id ? (
                          <>
                            <button onClick={() => saveEdit(activity.id)} style={{ padding: '0.25rem 0.5rem', marginRight: '0.5rem', background: '#10b981', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}>
                              <Check size={16} />
                            </button>
                            <button onClick={() => setEditingId(null)} style={{ padding: '0.25rem 0.5rem', background: '#666', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}>
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(activity)} style={{ padding: '0.25rem 0.5rem', marginRight: '0.5rem', background: '#333', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}>
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(activity.id)} style={{ padding: '0.25rem 0.5rem', background: '#dc2626', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}>
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          )
        })()}

        {activeTab === 'daily' && (() => {
          const sortedActivityDates = activities.map(a => a.date).sort()
          const dailyDates: string[] = []
          if (sortedActivityDates.length > 0) {
            const minDate = new Date(`${sortedActivityDates[0]}T00:00:00Z`)
            const maxDate = new Date(`${sortedActivityDates[sortedActivityDates.length - 1]}T00:00:00Z`)
            for (let d = minDate; d <= maxDate; d.setUTCDate(d.getUTCDate() + 1)) {
              dailyDates.push(d.toISOString().split('T')[0])
            }
          }

          return (
            <section style={{ padding: '1rem', marginBottom: '5rem' }}>
              <div className="section-heading" style={{ marginBottom: '1rem' }}>
                <div><p className="eyebrow">PODLE DNŮ</p><h2>Denní <span>přehled</span></h2></div>
              </div>

              <div className="wide-section" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #333' }}>
                      <th rowSpan={2} style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 600, verticalAlign: 'bottom', position: 'sticky', left: 0, background: '#f3f7f2', zIndex: 10 }}>Datum</th>
                      {users.map(user => (
                        <th key={user.id} colSpan={3} style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 700, borderLeft: '1px solid #333' }}>{user.name}</th>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: '2px solid #333' }}>
                      {users.map(user => (
                        <Fragment key={user.id}>
                          <th style={{ padding: '0.4rem', textAlign: 'right', fontWeight: 600, fontSize: '0.7rem', color: '#888', borderLeft: '1px solid #333' }}>body</th>
                          <th style={{ padding: '0.4rem', textAlign: 'right', fontWeight: 600, fontSize: '0.7rem', color: '#888' }}>kokotm</th>
                          <th style={{ padding: '0.4rem', textAlign: 'center', fontWeight: 600, fontSize: '0.7rem', color: '#888' }}>🍺</th>
                        </Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dailyDates.map(date => (
                      <tr key={date} style={{ borderBottom: '1px solid #222' }}>
                        <td style={{ padding: '0.5rem', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: '#f3f7f2', zIndex: 5 }}>{new Date(date).toLocaleDateString('cs-CZ')}</td>
                        {users.map(user => {
                          const activity = activities.find(a => a.date === date && a.user_id === user.id)
                          const noAlcohol = activity ? activity.no_alcohol : false
                          const bg = noAlcohol ? 'rgba(34, 197, 94, 0.18)' : 'rgba(239, 68, 68, 0.18)'
                          const points = activity
                            ? Math.floor(activity.beh) + Math.floor(activity.kolo / 10) * 2 + Math.floor(activity.bazen) * 2 + (activity.no_alcohol ? 1 : 0)
                            : 0
                          const kokotmetr = activity ? activity.kokotmetr : 0

                          return (
                            <Fragment key={user.id}>
                              <td style={{ padding: '0.5rem', textAlign: 'right', background: bg, borderLeft: '1px solid #222' }}>{points}</td>
                              <td style={{ padding: '0.5rem', textAlign: 'right', background: bg }}>{kokotmetr}</td>
                              <td style={{ padding: '0.5rem', textAlign: 'center', background: bg }}>{noAlcohol ? '✅' : '🍺'}</td>
                            </Fragment>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )
        })()}

        {activeTab === 'stats' && (
          <section style={{ padding: '1rem', marginBottom: '5rem' }}>
            <div className="section-heading" style={{ marginBottom: '1rem' }}>
              <div><p className="eyebrow">GRAF VÝVOJE</p><h2>Průběh <span>bodů</span></h2></div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Načítám data...</div>
            ) : (
              <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e3ece4', marginBottom: '2rem', width: '100%', minHeight: '400px' }}>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={pointsHistory} margin={{ top: 5, right: 80, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#999', fontSize: 11 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}
                    />
                    <YAxis tick={{ fill: '#999', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', fontSize: '12px' }}
                      labelFormatter={(value) => new Date(value).toLocaleDateString('cs-CZ')}
                    />
                    {users.map(user => {
                      // Mapování barev na hex kódy
                      const colorMap: {[key: string]: string} = {
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
                      const color = colorMap[user.color] || '#10b981'

                      return (
                        <Line
                          key={user.id}
                          type="monotone"
                          dataKey={user.id}
                          stroke={color}
                          strokeWidth={2}
                          name={user.name}
                          dot={false}
                          connectNulls
                          label={({ x, y, index }: any) => {
                            if (index !== pointsHistory.length - 1) return null
                            return (
                              <text
                                x={x}
                                y={y}
                                fill={color}
                                fontSize={11}
                                fontWeight={600}
                                textAnchor="start"
                                dx={8}
                                dy={4}
                              >
                                {user.name}
                              </text>
                            )
                          }}
                        />
                      )
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        )}
        {activeTab === 'info' && (
          <section style={{ padding: '1.5rem', marginBottom: '5rem' }}>
            <div className="section-heading">
              <div><p className="eyebrow">O VÝZVĚ</p><h2>Pravidla <span>a info</span></h2></div>
            </div>

            <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e3ece4', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#173b29' }}>📅 Termíny</h3>
              <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: '#555', marginBottom: '0.5rem' }}>
                <strong>Začátek:</strong> 4. října 2026 (neděle)<br/>
                <strong>Konec:</strong> 12. listopadu 2026 (čtvrtek)<br/>
                <strong>Večírek:</strong> 21. listopadu 2026 (sobota) ve Velemíně
              </p>
            </div>

            <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e3ece4', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#173b29' }}>🏆 Ceny a pokuty</h3>
              <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: '#555' }}>
                <strong>Poslední platí:</strong> Sud 50L dle vlastního výběru<br/>
                <strong>Pod 200 bodů:</strong> 1000 Kč do kasy na kurvy a chlebíčky!
              </p>
            </div>

            <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e3ece4', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#173b29' }}>📊 Bodování</h3>
              <ul style={{ fontSize: '0.875rem', lineHeight: 1.8, color: '#555', paddingLeft: '1.5rem' }}>
                <li><strong>1 km běhu</strong> = 1 bod</li>
                <li><strong>1 kokotmetr</strong> (100m převýšení, zaokrouhleno dolů) = 1 bod</li>
                <li><strong>Den bez chlastu</strong> = 1 bod</li>
                <li><strong>10 km na kole</strong> = 2 body (zaokrouhleno dolů)</li>
                <li><strong>Uplavaný km</strong> = 1 bod + 1 bonusák</li>
                <li><strong>Rejžův sluníčkový den:</strong> Bod za každé pivo, běhání ten den za 0</li>
              </ul>
            </div>

            <div style={{ background: '#fffbeb', padding: '1.5rem', borderRadius: '16px', border: '2px solid #fbbf24', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#92400e' }}>⚠️ POZOR - Letos nově!</h3>
              <ul style={{ fontSize: '0.875rem', lineHeight: 1.8, color: '#78350f', paddingLeft: '1.5rem' }}>
                <li>Letos se počítají <strong>fotbálky!</strong></li>
                <li><strong>Badminton v hale se nepočítá</strong></li>
                <li><strong>Kolo:</strong> 2 body za každých celých 10km</li>
                <li>Kdo nastoupí do výzvy, musí ji dokončit - <strong>žádné škrtání v průběhu!</strong></li>
              </ul>
            </div>

            <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e3ece4', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#173b29' }}>📸 Jak zapisovat</h3>
              <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: '#555' }}>
                Po sportovním výkonu do skupiny <strong>screenshot z jakékoliv aplikace</strong>.<br/>
                Musí být poslán <strong>v den výkonu!</strong>
              </p>
            </div>

            <div style={{ background: '#f0fdf4', padding: '1.5rem', borderRadius: '16px', border: '1px solid #86efac' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#166534' }}>📚 Uplynulé ročníky</h3>
              <a
                href="https://docs.google.com/spreadsheets/d/1NCxuQcFut1ymm5xpk4a0QHl4cHWin1oyNlt2vn97x_Y/edit?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '0.875rem', color: '#10b981', textDecoration: 'underline' }}
              >
                Prohlédnout archiv výzev →
              </a>
            </div>
          </section>
        )}

        <nav className="bottom-nav" aria-label="Hlavní navigace">
          <button className={activeTab === 'home' ? 'active' : ''} onClick={() => setActiveTab('home')}><Home /><span>Domů</span></button>
          <button className={activeTab === 'table' ? 'active' : ''} onClick={() => setActiveTab('table')}><Table /><span>Tabulka</span></button>
          <button className={activeTab === 'daily' ? 'active' : ''} onClick={() => setActiveTab('daily')}><CalendarDays /><span>Po dnech</span></button>
          <button className={activeTab === 'stats' ? 'active' : ''} onClick={() => setActiveTab('stats')}><BarChart3 /><span>Statistiky</span></button>
          <button className={activeTab === 'info' ? 'active' : ''} onClick={() => setActiveTab('info')}><CircleHelp /><span>Info</span></button>
        </nav>
      </div>
    </main>
  )
}
