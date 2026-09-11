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
  Settings,
  ShieldCheck,
  Table,
  Trash2,
  Trophy,
  UserRound,
  WineOff,
  X,
  Zap,
} from 'lucide-react'
import { getLeaderboard, getUsers, addActivity, getAllActivities, deleteActivity, updateActivity, getPointsHistory, getUserStreaks, getPointsBreakdown, getPositionStats, getDailyAverages, getBestDay, getWeeklyBreakdown, getDayOfWeekStats, getConsistencyScore, getComparisonToAverage, getAchievements, getTrashTalkFeed, getSettings, updateSettings, getYearPrediction, getHistoricalPredictions, type LeaderboardEntry, type User, type Activity, type PointsHistory, type UserStreaks, type PointsBreakdown, type PositionStats, type DailyAverages, type BestDay, type WeeklyBreakdown, type DayOfWeekStats, type ConsistencyScore, type ComparisonToAverage, type Achievements, type TrashTalkMessage, type AppSettings, type YearPrediction, type HistoricalPrediction } from '@/lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label, PieChart, Pie, Cell } from 'recharts'

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
  const [settingsPassword, setSettingsPassword] = useState('')
  const [isSettingsUnlocked, setIsSettingsUnlocked] = useState(false)
  const [challengeStart, setChallengeStart] = useState('2026-08-01')
  const [challengeEnd, setChallengeEnd] = useState('2026-09-30')
  const [sunnyDay, setSunnyDay] = useState('')
  const [globalPassword, setGlobalPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showLoginScreen, setShowLoginScreen] = useState(true)
  const [statsUserId, setStatsUserId] = useState<string>('')
  const [userStreaks, setUserStreaks] = useState<UserStreaks | null>(null)
  const [pointsBreakdown, setPointsBreakdown] = useState<PointsBreakdown | null>(null)
  const [positionStats, setPositionStats] = useState<PositionStats | null>(null)
  const [dailyAverages, setDailyAverages] = useState<DailyAverages | null>(null)
  const [bestDay, setBestDay] = useState<BestDay | null>(null)
  const [weeklyBreakdown, setWeeklyBreakdown] = useState<WeeklyBreakdown[] | null>(null)
  const [dayOfWeekStats, setDayOfWeekStats] = useState<DayOfWeekStats[] | null>(null)
  const [consistencyScore, setConsistencyScore] = useState<ConsistencyScore | null>(null)
  const [comparisonToAverage, setComparisonToAverage] = useState<ComparisonToAverage | null>(null)
  const [achievements, setAchievements] = useState<Achievements | null>(null)
  const [trashTalk, setTrashTalk] = useState<TrashTalkMessage[]>([])
  const [motivationMessage, setMotivationMessage] = useState<string>('')
  const [yearPrediction, setYearPrediction] = useState<YearPrediction | null>(null)
  const [historicalPredictions, setHistoricalPredictions] = useState<HistoricalPrediction[]>([])
  const entryFormRef = useRef<HTMLElement>(null)

  const CORRECT_PASSWORD = 'Vymrdanec2026*'

  // Načíst nastavení výzvy z databáze a heslo z localStorage
  useEffect(() => {
    async function loadSettings() {
      const settings = await getSettings()
      if (settings) {
        setChallengeStart(settings.challenge_start)
        setChallengeEnd(settings.challenge_end)
        setSunnyDay(settings.sunny_day || '')
      }
    }
    loadSettings()

    const savedPassword = localStorage.getItem('globalPassword')
    if (savedPassword === CORRECT_PASSWORD) {
      setIsAuthenticated(true)
      setShowLoginScreen(false)
    }
  }, [])

  // Funkce pro přihlášení
  function handleLogin() {
    if (globalPassword === CORRECT_PASSWORD) {
      localStorage.setItem('globalPassword', globalPassword)
      setIsAuthenticated(true)
      setShowLoginScreen(false)
    } else {
      alert('Špatné heslo!')
      setGlobalPassword('')
    }
  }

  // Funkce pro přepnutí uživatele s potvrzením
  function handleUserSwitch(newUserId: string) {
    if (!selectedUserId || selectedUserId === newUserId) {
      setSelectedUserId(newUserId)
      entryFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    const currentUser = users.find(u => u.id === selectedUserId)
    const newUser = users.find(u => u.id === newUserId)

    if (currentUser && newUser) {
      const confirmed = confirm(
        `Hele ty kokote, před tím si tu byl jako "${currentUser.name}" a teď se přepínáš na "${newUser.name}". Pokračovat?`
      )
      if (confirmed) {
        setSelectedUserId(newUserId)
        entryFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    } else {
      setSelectedUserId(newUserId)
      entryFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Výpočet průběhu výzvy
  const startDate = new Date(challengeStart)
  const endDate = new Date(challengeEnd)
  const today = new Date()
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const daysElapsed = Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
  const percentComplete = Math.min(100, Math.round((daysElapsed / totalDays) * 100))
  const currentWeek = Math.min(6, Math.ceil(daysElapsed / 7))

  // Načíst data z databáze
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const [leaderboardData, usersData, activitiesData, historyData] = await Promise.all([
        getLeaderboard(challengeStart, challengeEnd, sunnyDay),
        getUsers(),
        getAllActivities(),
        getPointsHistory(challengeStart, challengeEnd)
      ])
      setLeaderboard(leaderboardData)
      setUsers(usersData)
      setActivities(activitiesData)
      setPointsHistory(historyData)

      // Načíst trash talk pro aktuálně vybraného uživatele
      if (selectedUserId) {
        const trashTalkData = await getTrashTalkFeed(selectedUserId, challengeStart, challengeEnd)
        setTrashTalk(trashTalkData)
      }

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
  }, [challengeStart, challengeEnd, sunnyDay])

  // Uložit vybraného uživatele do localStorage a URL při změně
  useEffect(() => {
    if (selectedUserId && users.length > 0) {
      const user = users.find(u => u.id === selectedUserId)
      if (user) {
        localStorage.setItem('selectedUserId', selectedUserId)

        // Aktualizovat URL parametr ?kokot=Jméno
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.set('kokot', user.name)
        window.history.replaceState({}, '', newUrl.toString())

        // Aktualizovat trash talk pro nového uživatele
        getTrashTalkFeed(selectedUserId, challengeStart, challengeEnd).then(setTrashTalk)
      }
    }
  }, [selectedUserId, users, challengeStart, challengeEnd])

  // Načíst statistiky pro vybraného uživatele
  useEffect(() => {
    async function loadStats() {
      if (statsUserId) {
        const statsUser = users.find(u => u.id === statsUserId)
        const userName = statsUser?.name || ''

        const [streaks, breakdown, position, averages, best, weekly, dayOfWeek, consistency, comparison, achievementsData, trashTalkData, prediction] = await Promise.all([
          getUserStreaks(statsUserId, challengeStart, challengeEnd),
          getPointsBreakdown(statsUserId, challengeStart, challengeEnd),
          getPositionStats(statsUserId, challengeStart, challengeEnd),
          getDailyAverages(statsUserId, challengeStart, challengeEnd),
          getBestDay(statsUserId, challengeStart, challengeEnd),
          getWeeklyBreakdown(statsUserId, challengeStart, challengeEnd),
          getDayOfWeekStats(statsUserId, challengeStart, challengeEnd),
          getConsistencyScore(statsUserId, challengeStart, challengeEnd),
          getComparisonToAverage(statsUserId, challengeStart, challengeEnd),
          getAchievements(statsUserId, challengeStart, challengeEnd),
          getTrashTalkFeed(statsUserId, challengeStart, challengeEnd),
          getYearPrediction(statsUserId, userName, challengeStart, challengeEnd)
        ])
        setUserStreaks(streaks)
        setPointsBreakdown(breakdown)
        setPositionStats(position)
        setDailyAverages(averages)
        setBestDay(best)
        setWeeklyBreakdown(weekly)
        setDayOfWeekStats(dayOfWeek)
        setConsistencyScore(consistency)
        setComparisonToAverage(comparison)
        setAchievements(achievementsData)
        setTrashTalk(trashTalkData)
        setYearPrediction(prediction)

        // Load historical predictions (async function) - pouze pro letošní účastníky
        const currentParticipantNames = users.map(u => u.name)
        const historicalPreds = await getHistoricalPredictions(currentParticipantNames, challengeStart, challengeEnd)
        setHistoricalPredictions(historicalPreds)
      }
    }
    loadStats()
  }, [statsUserId, challengeStart, challengeEnd, users])

  // Nastavit statsUserId na selectedUserId při prvním načtení
  useEffect(() => {
    if (selectedUserId && !statsUserId) {
      setStatsUserId(selectedUserId)
    }
  }, [selectedUserId])


  // Funkce pro přidání aktivity
  async function handleSubmit() {
    if (!selectedUserId || !isAuthenticated) return

    const today = new Date().toISOString().split('T')[0]
    const activityData = {
      user_id: selectedUserId,
      date: today,
      beh: parseFloat(beh) || 0,
      kolo: parseFloat(kolo) || 0,
      bazen: parseFloat(bazen) || 0,
      kokotmetr: parseInt(kokotmetr) || 0,
      no_alcohol: alcoholFree
    }
    console.log('Submitting activity:', activityData)
    const result = await addActivity(activityData, sunnyDay)

    if (result) {
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 1800)

      // Resetovat formulář
      setBeh('0')
      setKolo('0')
      setBasen('0')
      setKokotmetr('0')
      setAlcoholFree(false)

      // Obnovit data
      const [newLeaderboard, newActivities, newHistory, newTrashTalk] = await Promise.all([
        getLeaderboard(challengeStart, challengeEnd, sunnyDay),
        getAllActivities(),
        getPointsHistory(challengeStart, challengeEnd),
        getTrashTalkFeed(selectedUserId, challengeStart, challengeEnd)
      ])
      setLeaderboard(newLeaderboard)
      setActivities(newActivities)
      setPointsHistory(newHistory)
      setTrashTalk(newTrashTalk)

      // Zobrazit motivační hlášku, pokud není první
      const userPosition = newLeaderboard.findIndex(u => u.id === selectedUserId)
      if (userPosition > 0) {
        const firstPlace = newLeaderboard[0]
        const currentUser = newLeaderboard[userPosition]
        const pointsDiff = firstPlace.total_points - currentUser.total_points
        setMotivationMessage(`No výborně, na první místo ztrácíš už jenom ${pointsDiff.toFixed(1)} bodů!`)
        // Hláška zůstane zobrazená - nezmizí automaticky
      } else {
        // Pokud je první, vymazat motivační hlášku
        setMotivationMessage('')
      }
    }
  }

  // Funkce pro smazání aktivity
  async function handleDelete(id: string) {
    if (!isAuthenticated) return
    if (!confirm('Opravdu smazat tento záznam?')) return

    const success = await deleteActivity(id)
    if (success) {
      const [newLeaderboard, newActivities] = await Promise.all([
        getLeaderboard(challengeStart, challengeEnd, sunnyDay),
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
    if (!isAuthenticated) return

    const result = await updateActivity(id, {
      beh: parseFloat(editValues.beh),
      kolo: parseFloat(editValues.kolo),
      bazen: parseFloat(editValues.bazen),
      kokotmetr: parseInt(editValues.kokotmetr),
      no_alcohol: editValues.no_alcohol
    }, sunnyDay)

    if (result) {
      setEditingId(null)
      const [newLeaderboard, newActivities, newHistory] = await Promise.all([
        getLeaderboard(challengeStart, challengeEnd, sunnyDay),
        getAllActivities(),
        getPointsHistory(challengeStart, challengeEnd)
      ])
      setLeaderboard(newLeaderboard)
      setActivities(newActivities)
      setPointsHistory(newHistory)
    }
  }

  const selectedUser = users.find(u => u.id === selectedUserId)

  // Login obrazovka
  if (showLoginScreen) {
    return (
      <main className="app-shell">
        <div className="app-inner" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', marginBottom: '1.5rem' }}>
              <Trophy size={40} color="#fff" />
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#173b29', marginBottom: '0.5rem' }}>Kokotí Výzva</h1>
            <p style={{ fontSize: '1rem', color: '#888' }}>Dokážeš-li to, není to jen sen!</p>
          </div>

          <div style={{ background: '#fff', padding: '2rem', borderRadius: '16px', border: '1px solid #e3ece4', maxWidth: '400px', margin: '0 auto', width: '100%' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#173b29', textAlign: 'center' }}>🔒 Přihlášení</h2>
            <p style={{ fontSize: '0.875rem', color: '#666', textAlign: 'center', marginBottom: '1.5rem' }}>Zadej heslo pro přístup k výzvě</p>

            <input
              type="password"
              value={globalPassword}
              onChange={(e) => setGlobalPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLogin()
              }}
              placeholder="Heslo..."
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #d8e7da',
                fontSize: '1rem',
                textAlign: 'center',
                marginBottom: '1rem'
              }}
              autoFocus
            />

            <button
              onClick={handleLogin}
              style={{
                width: '100%',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              Přihlásit se
            </button>
          </div>
        </div>
      </main>
    )
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
              <div className="week-label"><span className="live-dot" /> {currentWeek}. TÝDEN VÝZVY</div>
              <p className="week-title">Ještě {daysRemaining} {daysRemaining === 1 ? 'den' : daysRemaining < 5 ? 'dny' : 'dní'} do cíle</p>
              <p className="week-subtitle">Společně jsme uběhli <strong>{leaderboard.reduce((sum, r) => sum + r.total_beh, 0).toFixed(1)} km</strong></p>
            </div>
            <div style={{ position: 'relative', width: '66px', height: '66px' }}>
              <svg style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }} width="66" height="66">
                <circle cx="33" cy="33" r="28" fill="none" stroke="#3c7453" strokeWidth="5" />
                <circle
                  cx="33"
                  cy="33"
                  r="28"
                  fill="none"
                  stroke="#71d394"
                  strokeWidth="5"
                  strokeDasharray={`${percentComplete * 1.76} 176`}
                />
              </svg>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '66px', height: '66px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <strong style={{ font: '700 16px var(--font-display)', color: '#fff' }}>{percentComplete}%</strong>
                <span style={{ color: '#acd0b9', fontSize: '9px' }}>hotovo</span>
              </div>
            </div>
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
                    onClick={() => handleUserSwitch(runner.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="rank">{rank === 1 ? <Trophy className="rank-trophy" /> : isLast ? <Beer className="rank-trophy" style={{ color: '#f59e0b' }} /> : `0${rank}`}</div>
                    <div className={`avatar ${runner.color}`}>{runner.initials}</div>
                    <div className="runner-main">
                      <div className="runner-top"><h3>{runner.name}</h3><strong>{runner.total_points.toFixed(1)} <small>bodů</small></strong></div>
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
                onChange={(e) => handleUserSwitch(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#000', color: '#fff', fontSize: '1rem' }}
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </label>

            {/* Instantní hejt v denním zápisu */}
            {trashTalk.length > 0 && selectedUserId && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.75rem', color: '#666', letterSpacing: '0.05em' }}>💬 INSTANTNÍ HEJT</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {trashTalk.map((msg) => {
                    const bgColor = msg.severity === 'brutal' ? '#fef2f2' : msg.severity === 'medium' ? '#fffbeb' : '#f0fdf4'
                    const borderColor = msg.severity === 'brutal' ? '#fecaca' : msg.severity === 'medium' ? '#fef3c7' : '#bbf7d0'
                    const textColor = msg.severity === 'brutal' ? '#991b1b' : msg.severity === 'medium' ? '#92400e' : '#166534'

                    return (
                      <div
                        key={msg.id}
                        style={{
                          padding: '1rem',
                          background: bgColor,
                          border: `2px solid ${borderColor}`,
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                          color: textColor,
                          fontWeight: 600,
                          lineHeight: '1.4'
                        }}
                      >
                        {msg.message}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

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

            {/* Motivační hláška po zadání */}
            {motivationMessage && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderRadius: '12px',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.95rem',
                textAlign: 'center',
                lineHeight: '1.4',
                animation: 'slideIn 0.3s ease-out'
              }}>
                {motivationMessage}
              </div>
            )}
          </section>
        </>}

        {activeTab === 'table' && (() => {
          const filteredActivities = (filterUserId === 'all'
            ? activities
            : activities.filter(a => a.user_id === filterUserId)
          ).filter(a => a.date >= challengeStart && a.date <= challengeEnd)

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
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{filteredActivities.reduce((sum, a) => sum + a.beh + Math.floor(a.kolo / 10) * 2 + Math.floor(a.bazen) * 2 + a.kokotmetr + (a.no_alcohol ? 1 : 0), 0).toFixed(1)}</div>
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
          // Použít rozmezí z nastavení výzvy
          const dailyDates: string[] = []
          const minDate = new Date(`${challengeStart}T00:00:00Z`)
          const maxDate = new Date(`${challengeEnd}T00:00:00Z`)

          for (let d = new Date(minDate); d <= maxDate; d.setUTCDate(d.getUTCDate() + 1)) {
            dailyDates.push(d.toISOString().split('T')[0])
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
                    {dailyDates.map(date => {
                      const isSunnyDay = sunnyDay && date === sunnyDay

                      // Najít max kokotmetr ve sluníčkový den
                      let maxKokotmetrOnSunnyDay = 0
                      if (isSunnyDay) {
                        activities
                          .filter(a => a.date === date)
                          .forEach(a => {
                            if (a.kokotmetr > maxKokotmetrOnSunnyDay) {
                              maxKokotmetrOnSunnyDay = a.kokotmetr
                            }
                          })
                      }

                      return (
                        <tr key={date} style={{
                          borderBottom: '1px solid #222',
                          background: isSunnyDay ? '#fef08a' : 'transparent'
                        }}>
                          <td style={{
                            padding: '0.5rem',
                            whiteSpace: 'nowrap',
                            position: 'sticky',
                            left: 0,
                            background: isSunnyDay ? '#fef08a' : '#f3f7f2',
                            zIndex: 5
                          }}>
                            {isSunnyDay && '🌞 '}
                            {new Date(date).toLocaleDateString('cs-CZ')}
                          </td>
                          {users.map(user => {
                            const activity = activities.find(a => a.date === date && a.user_id === user.id)
                            const noAlcohol = activity ? activity.no_alcohol : false

                            // Ve sluníčkový den je celý řádek žlutý, jinak zelená/červená podle alkoholu
                            const bg = isSunnyDay
                              ? '#fef08a'
                              : (noAlcohol ? 'rgba(34, 197, 94, 0.18)' : 'rgba(239, 68, 68, 0.18)')

                            // Ve sluníčkový den se body z běhu/kola/bazénu nepočítají
                            let points = 0
                            let kokotmetr = 0

                            if (activity) {
                              if (isSunnyDay) {
                                // Ve sluníčkový den: pouze bod za nepití + body za piva (jen pro vítěze)
                                points = (activity.no_alcohol ? 1 : 0)
                                // Kokotmetr se zobrazuje jen vítězi, ostatním 0
                                if (activity.kokotmetr === maxKokotmetrOnSunnyDay && maxKokotmetrOnSunnyDay > 0) {
                                  kokotmetr = activity.kokotmetr
                                  points += activity.kokotmetr  // 1 pivo = 1 bod
                                } else {
                                  kokotmetr = 0
                                }
                              } else {
                                // Normální den
                                points = activity.beh + Math.floor(activity.kolo / 10) * 2 + Math.floor(activity.bazen) * 2 + (activity.no_alcohol ? 1 : 0)
                                kokotmetr = activity.kokotmetr
                              }
                            }

                            return (
                              <Fragment key={user.id}>
                                <td style={{ padding: '0.5rem', textAlign: 'right', background: bg, borderLeft: '1px solid #222' }}>{points}</td>
                                <td style={{ padding: '0.5rem', textAlign: 'right', background: bg }}>{kokotmetr}</td>
                                <td style={{ padding: '0.5rem', textAlign: 'center', background: bg }}>{noAlcohol ? '✅' : '🍺'}</td>
                              </Fragment>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )
        })()}

        {activeTab === 'stats' && (
          <section style={{ padding: '1rem', marginBottom: '5rem' }}>
            <div className="section-heading" style={{ marginBottom: '1rem' }}>
              <div><p className="eyebrow">STATISTIKY</p><h2>Tvoje <span>výsledky</span></h2></div>
            </div>

            {/* Výběr uživatele */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#555' }}>
                Vyber kokota
              </label>
              <select
                value={statsUserId}
                onChange={(e) => setStatsUserId(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d8e7da', fontSize: '1rem', background: '#fff' }}
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>

            {loading || !userStreaks || !pointsBreakdown || !positionStats || !dailyAverages || !bestDay || !weeklyBreakdown || !dayOfWeekStats || !consistencyScore || !comparisonToAverage || !achievements ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Načítám data...</div>
            ) : (
              <>
                {/* Gauge of Shame - pokud je nad 50 */}
                {achievements.shameLevel > 50 && (
                  <div style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem', color: '#fff', textAlign: 'center', boxShadow: '0 4px 20px rgba(239, 68, 68, 0.3)' }}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>😱 HANBOMETR</h3>
                    <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '1rem' }}>Tvoje úroveň hanby</div>
                    <div style={{ position: 'relative', height: '20px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${achievements.shameLevel}%`, background: '#fff', borderRadius: '10px', transition: 'width 0.5s ease' }} />
                    </div>
                    <div style={{ fontSize: '3rem', fontWeight: 700 }}>{achievements.shameLevel}%</div>
                    <div style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '0.5rem' }}>
                      {achievements.shameLevel >= 80 ? 'Nejen že si tady navíc, ale si taky k tomu navíc ještě tlustej!' : achievements.shameLevel >= 60 ? 'Nejen že si tady navíc, ale si taky k tomu navíc ještě tlustej!' : 'Nejen že si tady navíc, ale si taky k tomu navíc ještě tlustej!'}
                    </div>
                  </div>
                )}

                {/* Instantní hejt */}
                {trashTalk.length > 0 && (
                  <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e3ece4', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#173b29' }}>💬 Instantní hejt</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {trashTalk.map((msg) => {
                        const bgColor = msg.severity === 'brutal' ? '#fef2f2' : msg.severity === 'medium' ? '#fffbeb' : '#f0fdf4'
                        const borderColor = msg.severity === 'brutal' ? '#fecaca' : msg.severity === 'medium' ? '#fef3c7' : '#bbf7d0'
                        const textColor = msg.severity === 'brutal' ? '#991b1b' : msg.severity === 'medium' ? '#92400e' : '#166534'

                        return (
                          <div
                            key={msg.id}
                            style={{
                              padding: '1rem',
                              background: bgColor,
                              border: `2px solid ${borderColor}`,
                              borderRadius: '8px',
                              fontSize: '0.875rem',
                              color: textColor,
                              fontWeight: 600,
                              position: 'relative',
                              paddingLeft: '1rem'
                            }}
                          >
                            {msg.message}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Týdenní hanby/ocenění */}
                {(achievements.weeklyBadges.mrdkaTydne.userName || achievements.weeklyBadges.alkacTydne.length > 0 || achievements.weeklyBadges.abstinentTydne.length > 0 || achievements.weeklyBadges.comebackTydne.userName) && (
                  <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e3ece4', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#173b29' }}>🏅 Týdenní (ne)ocenění</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                      {achievements.weeklyBadges.comebackTydne.userName && (
                        <div style={{
                          padding: '1rem',
                          borderRadius: '8px',
                          border: '2px solid',
                          borderColor: achievements.weeklyBadges.comebackTydne.userId === statsUserId ? '#10b981' : '#e3ece4',
                          background: achievements.weeklyBadges.comebackTydne.userId === statsUserId ? '#f0fdf4' : '#f8fafc',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔥</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#173b29', marginBottom: '0.25rem' }}>Comeback týdne</div>
                          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#10b981' }}>{achievements.weeklyBadges.comebackTydne.userName}</div>
                          {achievements.weeklyBadges.comebackTydne.userId === statsUserId && (
                            <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: '0.5rem' }}>Tak to si se vytáh! 💪</div>
                          )}
                        </div>
                      )}
                      {achievements.weeklyBadges.mrdkaTydne.userName && (
                        <div style={{
                          padding: '1rem',
                          borderRadius: '8px',
                          border: '2px solid',
                          borderColor: achievements.weeklyBadges.mrdkaTydne.userId === statsUserId ? '#ef4444' : '#e3ece4',
                          background: achievements.weeklyBadges.mrdkaTydne.userId === statsUserId ? '#fef2f2' : '#f8fafc',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💩</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#173b29', marginBottom: '0.25rem' }}>Mrdka týdne</div>
                          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#ef4444' }}>{achievements.weeklyBadges.mrdkaTydne.userName}</div>
                          {achievements.weeklyBadges.mrdkaTydne.userId === statsUserId && (
                            <div style={{ fontSize: '0.75rem', color: '#991b1b', marginTop: '0.5rem' }}>To jsi ty!! 🤦</div>
                          )}
                        </div>
                      )}
                      {achievements.weeklyBadges.abstinentTydne.length > 0 && (
                        <div style={{
                          padding: '1rem',
                          borderRadius: '8px',
                          border: '2px solid',
                          borderColor: achievements.weeklyBadges.abstinentTydne.some(u => u.userId === statsUserId) ? '#22c55e' : '#e3ece4',
                          background: achievements.weeklyBadges.abstinentTydne.some(u => u.userId === statsUserId) ? '#f0fdf4' : '#f8fafc',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💚</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#173b29', marginBottom: '0.25rem' }}>Abstinent týdne</div>
                          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#22c55e' }}>
                            {achievements.weeklyBadges.abstinentTydne.map(u => u.userName).join(', ')}
                          </div>
                        </div>
                      )}
                      {achievements.weeklyBadges.alkacTydne.length > 0 && (
                        <div style={{
                          padding: '1rem',
                          borderRadius: '8px',
                          border: '2px solid',
                          borderColor: achievements.weeklyBadges.alkacTydne.some(u => u.userId === statsUserId) ? '#f59e0b' : '#e3ece4',
                          background: achievements.weeklyBadges.alkacTydne.some(u => u.userId === statsUserId) ? '#fffbeb' : '#f8fafc',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🍺</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#173b29', marginBottom: '0.25rem' }}>Alkáč týdne</div>
                          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f59e0b' }}>
                            {achievements.weeklyBadges.alkacTydne.map(u => u.userName).join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Achievements grid */}
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e3ece4', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#173b29' }}>🏆 Odznáčky</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                    {achievements.badges.map((badge) => (
                      <div
                        key={badge.id}
                        style={{
                          padding: '1rem',
                          borderRadius: '8px',
                          border: '2px solid',
                          borderColor: badge.unlocked
                            ? (badge.type === 'shame' ? '#ef4444' : '#10b981')
                            : '#e3ece4',
                          background: badge.unlocked
                            ? (badge.type === 'shame' ? '#fef2f2' : '#f0fdf4')
                            : '#f8fafc',
                          opacity: badge.unlocked ? 1 : 0.4,
                          textAlign: 'center',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem', filter: badge.unlocked ? 'none' : 'grayscale(100%)' }}>
                          {badge.emoji}
                        </div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#173b29', marginBottom: '0.25rem' }}>
                          {badge.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {badge.description}
                        </div>
                        {badge.unlocked && badge.type === 'shame' && (
                          <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: '0.5rem', fontWeight: 600 }}>
                            ODEMČENO!
                          </div>
                        )}
                        {badge.unlocked && badge.type === 'achievement' && (
                          <div style={{ fontSize: '0.7rem', color: '#10b981', marginTop: '0.5rem', fontWeight: 600 }}>
                            ✓ ZÍSKÁNO
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pozice a náskok/ztráta */}
                {positionStats.position > 0 && (
                  <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e3ece4', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#173b29' }}>🏆 Tvoje pozice</h3>
                    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                      <div style={{ fontSize: '3rem', fontWeight: 700, color: '#173b29' }}>{positionStats.position}.</div>
                      <div style={{ fontSize: '0.875rem', color: '#64748b' }}>z {positionStats.totalUsers} kokotů</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {positionStats.pointsBehind !== null ? (
                        <div style={{ padding: '1rem', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: '#991b1b', marginBottom: '0.5rem' }}>Ztráta na {positionStats.userBehind}</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>-{positionStats.pointsBehind.toFixed(1)}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>bodů</div>
                        </div>
                      ) : (
                        <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: '#166534', marginBottom: '0.5rem' }}>Jsi první! 🎉</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#15803d' }}>👑</div>
                        </div>
                      )}
                      {positionStats.pointsAhead !== null ? (
                        <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: '#166534', marginBottom: '0.5rem' }}>Náskok před {positionStats.userAhead}</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#15803d' }}>+{positionStats.pointsAhead.toFixed(1)}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>bodů</div>
                        </div>
                      ) : (
                        <div style={{ padding: '1rem', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: '#991b1b', marginBottom: '0.5rem' }}>Jsi poslední 😢</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>💩</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Streaky (série) */}
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e3ece4', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#173b29' }}>🔥 Série</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                      <div style={{ fontSize: '0.75rem', color: '#1e40af', marginBottom: '0.25rem' }}>Aktuální bez 🍺</div>
                      <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1e3a8a' }}>{userStreaks.currentSoberStreak}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{userStreaks.currentSoberStreak === 1 ? 'den' : 'dní'} v řadě</div>
                    </div>
                    <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: '0.75rem', color: '#166534', marginBottom: '0.25rem' }}>Nejdelší bez 🍺</div>
                      <div style={{ fontSize: '2rem', fontWeight: 700, color: '#15803d' }}>{userStreaks.longestSoberStreak}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{userStreaks.longestSoberStreak === 1 ? 'den' : 'dní'} v řadě</div>
                    </div>
                    <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a' }}>
                      <div style={{ fontSize: '0.75rem', color: '#92400e', marginBottom: '0.25rem' }}>Aktuální aktivita</div>
                      <div style={{ fontSize: '2rem', fontWeight: 700, color: '#b45309' }}>{userStreaks.currentActiveStreak}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{userStreaks.currentActiveStreak === 1 ? 'den' : 'dní'} v řadě</div>
                    </div>
                    <div style={{ padding: '1rem', background: '#fce7f3', borderRadius: '8px', border: '1px solid #fbcfe8' }}>
                      <div style={{ fontSize: '0.75rem', color: '#9f1239', marginBottom: '0.25rem' }}>Nejdelší aktivita</div>
                      <div style={{ fontSize: '2rem', fontWeight: 700, color: '#be123c' }}>{userStreaks.longestActiveStreak}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{userStreaks.longestActiveStreak === 1 ? 'den' : 'dní'} v řadě</div>
                    </div>
                  </div>
                </div>

                {/* Rozdělení bodů - koláčový graf */}
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e3ece4', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#173b29' }}>📊 Rozdělení bodů</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Běh', value: pointsBreakdown.behPoints, color: '#3b82f6' },
                          { name: 'Kolo', value: pointsBreakdown.koloPoints, color: '#10b981' },
                          { name: 'Bazén', value: pointsBreakdown.bazenPoints, color: '#06b6d4' },
                          { name: 'Kokotmetr', value: pointsBreakdown.kokotmetrPoints, color: '#f59e0b' },
                          { name: 'Bez 🍺', value: pointsBreakdown.alcoholPoints, color: '#8b5cf6' }
                        ].filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          { name: 'Běh', value: pointsBreakdown.behPoints, color: '#3b82f6' },
                          { name: 'Kolo', value: pointsBreakdown.koloPoints, color: '#10b981' },
                          { name: 'Bazén', value: pointsBreakdown.bazenPoints, color: '#06b6d4' },
                          { name: 'Kokotmetr', value: pointsBreakdown.kokotmetrPoints, color: '#f59e0b' },
                          { name: 'Bez 🍺', value: pointsBreakdown.alcoholPoints, color: '#8b5cf6' }
                        ].filter(item => item.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginTop: '1rem', fontSize: '0.875rem' }}>
                    <div><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#3b82f6', borderRadius: '2px', marginRight: '0.5rem' }}></span>Běh: <strong>{pointsBreakdown.behPoints.toFixed(1)}</strong></div>
                    <div><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#10b981', borderRadius: '2px', marginRight: '0.5rem' }}></span>Kolo: <strong>{pointsBreakdown.koloPoints}</strong></div>
                    <div><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#06b6d4', borderRadius: '2px', marginRight: '0.5rem' }}></span>Bazén: <strong>{pointsBreakdown.bazenPoints}</strong></div>
                    <div><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#f59e0b', borderRadius: '2px', marginRight: '0.5rem' }}></span>Kokotmetr: <strong>{pointsBreakdown.kokotmetrPoints}</strong></div>
                    <div><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#8b5cf6', borderRadius: '2px', marginRight: '0.5rem' }}></span>Bez 🍺: <strong>{pointsBreakdown.alcoholPoints}</strong></div>
                    <div style={{ fontWeight: 700, color: '#173b29' }}>Celkem: <strong>{pointsBreakdown.totalPoints.toFixed(1)}</strong></div>
                  </div>
                </div>

                {/* Denní průměry */}
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e3ece4', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#173b29' }}>📊 Denní průměry</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '0.875rem' }}>
                    <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '6px' }}>
                      <div style={{ color: '#64748b', marginBottom: '0.25rem' }}>Body za den</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#173b29' }}>{dailyAverages.avgPointsPerDay.toFixed(1)}</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '6px' }}>
                      <div style={{ color: '#64748b', marginBottom: '0.25rem' }}>Běh za den</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#173b29' }}>{dailyAverages.avgBehPerDay.toFixed(1)} km</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '6px' }}>
                      <div style={{ color: '#64748b', marginBottom: '0.25rem' }}>Kolo za den</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#173b29' }}>{dailyAverages.avgKoloPerDay.toFixed(1)} km</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '6px' }}>
                      <div style={{ color: '#64748b', marginBottom: '0.25rem' }}>Bazén za den</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#173b29' }}>{dailyAverages.avgBazenPerDay.toFixed(1)} km</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '6px' }}>
                      <div style={{ color: '#64748b', marginBottom: '0.25rem' }}>Kokotmetr za den</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#173b29' }}>{dailyAverages.avgKokotmetrPerDay.toFixed(0)}</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: '#f0f9ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                      <div style={{ color: '#1e40af', marginBottom: '0.25rem' }}>Dní bez 🍺</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e3a8a' }}>{dailyAverages.soberDaysPercent.toFixed(0)}%</div>
                    </div>
                  </div>
                </div>

                {/* Nejlepší den */}
                {bestDay.date && (
                  <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e3ece4', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#173b29' }}>⭐ Nejlepší den</h3>
                    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#173b29' }}>{new Date(bestDay.date).toLocaleDateString('cs-CZ')}</div>
                      <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#f59e0b', marginTop: '0.5rem' }}>{bestDay.points.toFixed(1)} bodů</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.875rem' }}>
                      {bestDay.beh > 0 && (
                        <div style={{ padding: '0.5rem', background: '#f0f9ff', borderRadius: '6px' }}>
                          <span style={{ color: '#64748b' }}>Běh:</span> <strong>{bestDay.beh.toFixed(1)} km</strong>
                        </div>
                      )}
                      {bestDay.kolo > 0 && (
                        <div style={{ padding: '0.5rem', background: '#f0fdf4', borderRadius: '6px' }}>
                          <span style={{ color: '#64748b' }}>Kolo:</span> <strong>{bestDay.kolo.toFixed(1)} km</strong>
                        </div>
                      )}
                      {bestDay.bazen > 0 && (
                        <div style={{ padding: '0.5rem', background: '#fef3c7', borderRadius: '6px' }}>
                          <span style={{ color: '#64748b' }}>Bazén:</span> <strong>{bestDay.bazen.toFixed(1)} km</strong>
                        </div>
                      )}
                      {bestDay.kokotmetr > 0 && (
                        <div style={{ padding: '0.5rem', background: '#fce7f3', borderRadius: '6px' }}>
                          <span style={{ color: '#64748b' }}>Kokotmetr:</span> <strong>{bestDay.kokotmetr}</strong>
                        </div>
                      )}
                      {bestDay.no_alcohol && (
                        <div style={{ padding: '0.5rem', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                          <span style={{ color: '#166534' }}>Bez 🍺</span> <strong>✅</strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Konzistence */}
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e3ece4', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#173b29' }}>🎯 Konzistence</h3>
                  <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '4rem', fontWeight: 700, color: consistencyScore.score >= 80 ? '#10b981' : consistencyScore.score >= 60 ? '#f59e0b' : '#ef4444' }}>
                      {consistencyScore.score}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Skóre konzistence</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '0.875rem' }}>
                    <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', textAlign: 'center' }}>
                      <div style={{ color: '#64748b', marginBottom: '0.25rem' }}>Aktivních dní</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#173b29' }}>{consistencyScore.totalActiveDays}/{consistencyScore.totalDays}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{consistencyScore.activeDaysPercent.toFixed(0)}%</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', textAlign: 'center' }}>
                      <div style={{ color: '#64748b', marginBottom: '0.25rem' }}>Nejdelší pauza</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#173b29' }}>{consistencyScore.longestGap}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{consistencyScore.longestGap === 1 ? 'den' : 'dní'}</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', textAlign: 'center' }}>
                      <div style={{ color: '#64748b', marginBottom: '0.25rem' }}>Průměrná pauza</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#173b29' }}>{consistencyScore.averageGap.toFixed(1)}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{consistencyScore.averageGap < 2 ? 'den' : 'dní'}</div>
                    </div>
                  </div>
                </div>

                {/* Porovnání s průměrem */}
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e3ece4', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#173b29' }}>📊 Porovnání s průměrem</h3>
                  <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '3rem', fontWeight: 700, color: comparisonToAverage.percentDifference >= 0 ? '#10b981' : '#ef4444' }}>
                      {comparisonToAverage.percentDifference >= 0 ? '+' : ''}{comparisonToAverage.percentDifference.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>oproti průměru skupiny</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <div style={{ padding: '0.5rem', background: '#f8fafc', borderRadius: '6px' }}>
                      <div style={{ color: '#64748b' }}>Tvoje body</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#173b29' }}>{comparisonToAverage.userPoints.toFixed(1)}</div>
                    </div>
                    <div style={{ padding: '0.5rem', background: '#f8fafc', borderRadius: '6px' }}>
                      <div style={{ color: '#64748b' }}>Průměr</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#173b29' }}>{comparisonToAverage.averagePoints.toFixed(1)}</div>
                    </div>
                    <div style={{ padding: '0.5rem', background: '#f0f9ff', borderRadius: '6px' }}>
                      <div style={{ color: '#64748b' }}>Tvůj běh</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#173b29' }}>{comparisonToAverage.userBeh.toFixed(1)} km</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>vs {comparisonToAverage.averageBeh.toFixed(1)} km</div>
                    </div>
                    <div style={{ padding: '0.5rem', background: '#f0fdf4', borderRadius: '6px' }}>
                      <div style={{ color: '#64748b' }}>Tvoje kolo</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#173b29' }}>{comparisonToAverage.userKolo.toFixed(1)} km</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>vs {comparisonToAverage.averageKolo.toFixed(1)} km</div>
                    </div>
                    <div style={{ padding: '0.5rem', background: '#fef3c7', borderRadius: '6px' }}>
                      <div style={{ color: '#64748b' }}>Tvůj bazén</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#173b29' }}>{comparisonToAverage.userBazen.toFixed(1)} km</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>vs {comparisonToAverage.averageBazen.toFixed(1)} km</div>
                    </div>
                    <div style={{ padding: '0.5rem', background: '#fce7f3', borderRadius: '6px' }}>
                      <div style={{ color: '#64748b' }}>Tvůj kokotmetr</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#173b29' }}>{comparisonToAverage.userKokotmetr.toFixed(0)}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>vs {comparisonToAverage.averageKokotmetr.toFixed(0)}</div>
                    </div>
                    <div style={{ padding: '0.5rem', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                      <div style={{ color: '#166534' }}>Dny bez 🍺</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#15803d' }}>{comparisonToAverage.userSoberDays}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>vs {comparisonToAverage.averageSoberDays.toFixed(1)}</div>
                    </div>
                  </div>
                </div>

                {/* Aktivita podle dní v týdnu */}
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e3ece4', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#173b29' }}>📅 Aktivita podle dne v týdnu</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '0.5rem' }}>
                    {dayOfWeekStats.map((day) => {
                      const maxActivities = Math.max(...dayOfWeekStats.map(d => d.activitiesCount), 1)
                      const barWidth = (day.activitiesCount / maxActivities) * 100
                      return (
                        <div key={day.dayIndex} style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <div style={{ fontWeight: 600, color: '#173b29' }}>{day.dayName}</div>
                            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                              {day.activitiesCount} aktivit · Ø {day.avgPoints.toFixed(1)} bodů
                            </div>
                          </div>
                          <div style={{ background: '#e2e8f0', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', width: `${barWidth}%`, height: '100%' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Týdenní přehled */}
                {weeklyBreakdown.length > 0 && (
                  <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e3ece4', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#173b29' }}>📊 Týdenní přehled</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                      {weeklyBreakdown.map((week) => (
                        <div key={week.weekNumber} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <div>
                              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#173b29' }}>Týden {week.weekNumber}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{week.weekLabel}</div>
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{week.points.toFixed(1)} bodů</div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.75rem', marginTop: '0.75rem' }}>
                            <div>
                              <div style={{ color: '#64748b' }}>Běh</div>
                              <div style={{ fontWeight: 600 }}>{week.beh.toFixed(1)} km</div>
                            </div>
                            <div>
                              <div style={{ color: '#64748b' }}>Kolo</div>
                              <div style={{ fontWeight: 600 }}>{week.kolo.toFixed(1)} km</div>
                            </div>
                            <div>
                              <div style={{ color: '#64748b' }}>Kokotm</div>
                              <div style={{ fontWeight: 600 }}>{week.kokotmetr}</div>
                            </div>
                            <div>
                              <div style={{ color: '#64748b' }}>Dní bez 🍺</div>
                              <div style={{ fontWeight: 600 }}>{week.soberDays}</div>
                            </div>
                            <div>
                              <div style={{ color: '#64748b' }}>Aktivních dní</div>
                              <div style={{ fontWeight: 600 }}>{week.activeDays}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Graf vývoje bodů */}
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e3ece4', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#173b29' }}>📈 Průběh bodů</h3>
                  <div style={{ width: '100%', minHeight: '400px' }}>
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
                </div>

                {/* Predikce na základě aktuálního tempa */}
                {yearPrediction && (
                  <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e3ece4', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#173b29' }}>
                      🔮 Predikce letošního roku (aktuální tempo)
                    </h3>

                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Aktuální body:</span>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#173b29' }}>{yearPrediction.currentPoints.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Lineární projekce:</span>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#173b29' }}>{yearPrediction.linearProjection.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Historický průměr:</span>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#173b29' }}>{yearPrediction.historicalAverage > 0 ? yearPrediction.historicalAverage.toFixed(2) : 'N/A'}</span>
                      </div>
                    </div>

                    {yearPrediction.historicalAverage > 0 && (
                      <div style={{ background: '#f0f9ff', padding: '1rem', borderRadius: '12px', border: '1px solid #bfdbfe', marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem', color: '#1e40af' }}>
                          Trend: <strong>{yearPrediction.trendDescription}</strong>
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#1e40af' }}>
                          {yearPrediction.linearProjection > yearPrediction.historicalAverage
                            ? `Tempo ${((yearPrediction.linearProjection / yearPrediction.historicalAverage - 1) * 100).toFixed(1)}% nad historickým průměrem`
                            : `Tempo ${((1 - yearPrediction.linearProjection / yearPrediction.historicalAverage) * 100).toFixed(1)}% pod historickým průměrem`}
                        </div>
                      </div>
                    )}

                    <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '12px', border: '1px solid #bbf7d0', fontSize: '0.875rem', lineHeight: 1.6, color: '#166534' }}>
                      {yearPrediction.message}
                    </div>
                  </div>
                )}

                {/* Predikce na základě historických dat */}
                {historicalPredictions.length > 0 && (
                  <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e3ece4', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#173b29' }}>
                      🎯 Predikce na základě minulých let
                    </h3>
                    <div style={{ fontSize: '0.875rem', marginBottom: '1rem', color: '#64748b' }}>
                      Očekávané výsledky podle dat z let 2020-2025
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                      {historicalPredictions.map((pred, index) => (
                        <div
                          key={pred.name}
                          style={{
                            background: pred.name === users.find(u => u.id === statsUserId)?.name ? '#f0fdf4' : '#f8fafc',
                            padding: '1rem',
                            borderRadius: '12px',
                            border: pred.name === users.find(u => u.id === statsUserId)?.name ? '2px solid #10b981' : '1px solid #e3ece4'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#173b29' }}>{index + 1}.</span>
                              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#173b29' }}>{pred.name}</span>
                              {pred.trend === 'improving' && <span style={{ fontSize: '1rem' }}>📈</span>}
                              {pred.trend === 'declining' && <span style={{ fontSize: '1rem' }}>📉</span>}
                              {pred.trend === 'new' && <span style={{ fontSize: '1rem' }}>🆕</span>}
                            </div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>{pred.expectedPoints} bodů</div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                            <div>
                              Kurz: <strong style={{ color: '#f59e0b', fontSize: '1.1rem' }}>{pred.odds.toFixed(2)}</strong>
                            </div>
                            <div>
                              Šance: <strong style={{ color: '#173b29' }}>{pred.winProbability}%</strong>
                            </div>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Účast: {pred.participationYears} {pred.participationYears === 1 ? 'rok' : pred.participationYears < 5 ? 'roky' : 'let'} | Ø {pred.historicalAverage} | Loni: {pred.lastYearPoints !== null ? pred.lastYearPoints : 'N/A'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
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

            <div style={{ background: '#f0fdf4', padding: '1.5rem', borderRadius: '16px', border: '1px solid #86efac', marginBottom: '1rem' }}>
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

        {activeTab === 'settings' && (
          <section style={{ padding: '1.5rem', marginBottom: '5rem' }}>
            <div className="section-heading">
              <div><p className="eyebrow">NASTAVENÍ</p><h2>Nastavení <span>výzvy</span></h2></div>
            </div>

            {!isSettingsUnlocked ? (
              <div style={{ background: '#fff', padding: '2rem', borderRadius: '16px', border: '1px solid #e3ece4', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: '#173b29' }}>🔒 Zadejte heslo</h3>
                <input
                  type="password"
                  value={settingsPassword}
                  onChange={(e) => setSettingsPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && settingsPassword === 'kokot') {
                      setIsSettingsUnlocked(true)
                    }
                  }}
                  placeholder="Heslo..."
                  style={{ width: '100%', maxWidth: '300px', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d8e7da', fontSize: '1rem', textAlign: 'center' }}
                />
                <button
                  onClick={() => {
                    if (settingsPassword === 'kokot') {
                      setIsSettingsUnlocked(true)
                    } else {
                      alert('Špatné heslo!')
                    }
                  }}
                  style={{ marginTop: '1rem', padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Odemknout
                </button>
              </div>
            ) : (
              <div style={{ background: '#fff', padding: '2rem', borderRadius: '16px', border: '1px solid #e3ece4' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#173b29' }}>⚙️ Nastavení termínů výzvy</h3>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#555' }}>
                    Začátek výzvy
                  </label>
                  <input
                    type="date"
                    value={challengeStart}
                    onChange={async (e) => {
                      const newValue = e.target.value
                      setChallengeStart(newValue)
                      await updateSettings({ challenge_start: newValue })
                    }}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d8e7da', fontSize: '1rem' }}
                  />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#555' }}>
                    Konec výzvy
                  </label>
                  <input
                    type="date"
                    value={challengeEnd}
                    onChange={async (e) => {
                      const newValue = e.target.value
                      setChallengeEnd(newValue)
                      await updateSettings({ challenge_end: newValue })
                    }}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d8e7da', fontSize: '1rem' }}
                  />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#555' }}>
                    🌞 Sluníčkový den (body se nepočítají, pouze piva)
                  </label>
                  <input
                    type="date"
                    value={sunnyDay}
                    onChange={async (e) => {
                      const newValue = e.target.value
                      setSunnyDay(newValue)
                      await updateSettings({ sunny_day: newValue || null })
                    }}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fef3c7', background: '#fffbeb', fontSize: '1rem' }}
                    placeholder="Nevyplněno"
                  />
                </div>
                <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                  <p style={{ fontSize: '0.875rem', color: '#1e40af', margin: 0 }}>
                    <strong>Aktuální průběh:</strong> {daysElapsed} dní ({percentComplete}% hotovo), zbývá {daysRemaining} {daysRemaining === 1 ? 'den' : daysRemaining < 5 ? 'dny' : 'dní'}
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        <nav className="bottom-nav" aria-label="Hlavní navigace">
          <button className={activeTab === 'home' ? 'active' : ''} onClick={() => setActiveTab('home')}><Home /><span>Domů</span></button>
          <button className={activeTab === 'table' ? 'active' : ''} onClick={() => setActiveTab('table')}><Table /><span>Tabulka</span></button>
          <button className={activeTab === 'daily' ? 'active' : ''} onClick={() => setActiveTab('daily')}><CalendarDays /><span>Po dnech</span></button>
          <button className={activeTab === 'stats' ? 'active' : ''} onClick={() => setActiveTab('stats')}><BarChart3 /><span>Statistiky</span></button>
          <button className={activeTab === 'info' ? 'active' : ''} onClick={() => setActiveTab('info')}><CircleHelp /><span>Info</span></button>
          <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}><Settings /><span>Nastavení</span></button>
        </nav>
      </div>
    </main>
  )
}
