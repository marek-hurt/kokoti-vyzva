'use client'

import { useState, useEffect } from 'react'
import {
  BarChart3,
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
import { getLeaderboard, getUsers, addActivity, getAllActivities, deleteActivity, updateActivity, type LeaderboardEntry, type User, type Activity } from '@/lib/supabase'

export default function Page() {
  const [activeTab, setActiveTab] = useState('home')
  const [alcoholFree, setAlcoholFree] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [km, setKm] = useState('5')
  const [kokotmetr, setKokotmetr] = useState('5')
  const [activities, setActivities] = useState<(Activity & { user_name: string })[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState({ km: '', kokotmetr: '', no_alcohol: false })
  const [filterUserId, setFilterUserId] = useState<string>('all')

  // Načíst data z databáze
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const [leaderboardData, usersData, activitiesData] = await Promise.all([
        getLeaderboard(),
        getUsers(),
        getAllActivities()
      ])
      setLeaderboard(leaderboardData)
      setUsers(usersData)
      setActivities(activitiesData)
      if (usersData.length > 0 && !selectedUserId) {
        setSelectedUserId(usersData[0].id)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  // Funkce pro přidání aktivity
  async function handleSubmit() {
    if (!selectedUserId) return

    const today = new Date().toISOString().split('T')[0]
    const result = await addActivity({
      user_id: selectedUserId,
      date: today,
      km: parseFloat(km),
      kokotmetr: parseInt(kokotmetr),
      no_alcohol: alcoholFree
    })

    if (result) {
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 1800)

      // Obnovit data
      const [newLeaderboard, newActivities] = await Promise.all([
        getLeaderboard(),
        getAllActivities()
      ])
      setLeaderboard(newLeaderboard)
      setActivities(newActivities)
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
      km: activity.km.toString(),
      kokotmetr: activity.kokotmetr.toString(),
      no_alcohol: activity.no_alcohol
    })
  }

  // Funkce pro uložení úpravy
  async function saveEdit(id: string) {
    const result = await updateActivity(id, {
      km: parseFloat(editValues.km),
      kokotmetr: parseInt(editValues.kokotmetr),
      no_alcohol: editValues.no_alcohol
    })

    if (result) {
      setEditingId(null)
      const [newLeaderboard, newActivities] = await Promise.all([
        getLeaderboard(),
        getAllActivities()
      ])
      setLeaderboard(newLeaderboard)
      setActivities(newActivities)
    }
  }

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
          <button className="profile-button" aria-label="Otevřít profil"><span>MK</span></button>
        </header>

        {activeTab === 'home' && <>
          <section className="week-card">
            <div>
              <div className="week-label"><span className="live-dot" /> 3. TÝDEN VÝZVY</div>
              <p className="week-title">Ještě 4 dny do cíle</p>
              <p className="week-subtitle">Společně jsme uběhli <strong>200,0 km</strong></p>
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

                return (
                  <article className={`runner-card ${isCurrent ? 'runner-current' : ''}`} key={runner.id}>
                    <div className="rank">{rank === 1 ? <Trophy className="rank-trophy" /> : `0${rank}`}</div>
                    <div className={`avatar ${runner.color}`}>{runner.initials}</div>
                    <div className="runner-main">
                      <div className="runner-top"><h3>{runner.name}</h3><strong>{runner.total_points} <small>bodů</small></strong></div>
                      <div className="runner-stats">
                        <span><Zap /> {runner.total_km} km</span>
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

          <section className="entry-card">
            <div className="entry-heading">
              <div><p className="eyebrow">DENNÍ ZÁPIS</p><h2>Přidat <span>dnešek</span></h2></div>
              <div className="date-pill"><CalendarDays /> {new Date().toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })}</div>
            </div>

            {/* Výběr uživatele */}
            <label style={{ marginBottom: '1rem', display: 'block' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: '#888' }}>UŽIVATEL</span>
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
                <span>VZDÁLENOST</span>
                <div className="input-wrap">
                  <input
                    type="number"
                    value={km}
                    onChange={(e) => setKm(e.target.value)}
                    aria-label="Vzdálenost v kilometrech"
                    step="0.1"
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
                    onChange={(e) => setKokotmetr(e.target.value)}
                    aria-label="Kokotmetr"
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
                  <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: '#888' }}>FILTR HRÁČE</span>
                  <select
                    value={filterUserId}
                    onChange={(e) => setFilterUserId(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#000', color: '#fff', fontSize: '1rem' }}
                  >
                    <option value="all">Všichni hráči</option>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{filteredActivities.reduce((sum, a) => sum + parseFloat(a.km.toString()), 0).toFixed(1)}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>km celkem</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{filteredActivities.reduce((sum, a) => sum + a.kokotmetr, 0).toLocaleString()}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>kokotm celkem</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{filteredActivities.filter(a => a.no_alcohol).length}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>dní bez alkoholu</div>
                  </div>
                </div>
              </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #333' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Datum</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Uživatel</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>km</th>
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
                            value={editValues.km}
                            onChange={(e) => setEditValues({...editValues, km: e.target.value})}
                            style={{ width: '60px', padding: '0.25rem', background: '#111', border: '1px solid #333', borderRadius: '4px', color: '#fff' }}
                          />
                        ) : activity.km}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        {editingId === activity.id ? (
                          <input
                            type="number"
                            value={editValues.kokotmetr}
                            onChange={(e) => setEditValues({...editValues, kokotmetr: e.target.value})}
                            style={{ width: '60px', padding: '0.25rem', background: '#111', border: '1px solid #333', borderRadius: '4px', color: '#fff' }}
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

        {activeTab === 'stats' && <section className="placeholder-tab"><div className="big-tab-icon"><BarChart3 /></div><p className="eyebrow">MOJE STATISTIKY</p><h2>Tvoje cesta <span>v číslech</span></h2><p>Historie aktivit a osobní rekordy budou brzy na jednom místě.</p></section>}
        {activeTab === 'info' && <section className="placeholder-tab"><div className="big-tab-icon"><Flame /></div><p className="eyebrow">O VÝZVĚ</p><h2>Každý kilometr <span>se počítá</span></h2><p>Běhej, choď do kopců a sbírej dny bez alkoholu. Na konci týdne vyhrává nejlepší skóre.</p></section>}

        <nav className="bottom-nav" aria-label="Hlavní navigace">
          <button className={activeTab === 'home' ? 'active' : ''} onClick={() => setActiveTab('home')}><Home /><span>Domů</span></button>
          <button className={activeTab === 'table' ? 'active' : ''} onClick={() => setActiveTab('table')}><Table /><span>Tabulka</span></button>
          <button className={activeTab === 'stats' ? 'active' : ''} onClick={() => setActiveTab('stats')}><BarChart3 /><span>Statistiky</span></button>
          <button className={activeTab === 'info' ? 'active' : ''} onClick={() => setActiveTab('info')}><CircleHelp /><span>Info</span></button>
        </nav>
      </div>
    </main>
  )
}
