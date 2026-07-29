import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import type { StudySession, Todo, BacklogItem, UserChapter } from '../lib/types'

// ─── Inline SVG Icon Components ──────────────────────────────────────────────
const ClockIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
)
const TrendUpIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
)
const FlameIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>
)
const TargetIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
)
const BookIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
)
const CheckCircleIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
)
const ChartIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
)

// ─── Time Range ──────────────────────────────────────────────────────────────
type RangeKey = '7' | '30' | '90' | 'all'
const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: '7', label: '7 Days', days: 7 },
  { key: '30', label: '30 Days', days: 30 },
  { key: '90', label: '90 Days', days: 90 },
  { key: 'all', label: 'All Time', days: 0 },
]

// ─── Chart Colors ─────────────────────────────────────────────────────────────
const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16']

// ─── Helpers ──────────────────────────────────────────────────────────────────
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
function fmtDate(d: Date) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
function fmtDuration(mins: number) {
  const h = Math.floor(mins / 60); const m = Math.round(mins % 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function Analytics() {
  const { user } = useAuth()
  const [range, setRange] = useState<RangeKey>('7')
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [backlog, setBacklog] = useState<BacklogItem[]>([])
  const [chapters, setChapters] = useState<UserChapter[]>([])

  // ─── Fetch Data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    let cancelled = false;
    (async () => {
      setLoading(true)
      try {
        const rangeCfg = RANGES.find((r) => r.key === range)!
        let sessionQuery = supabase.from('study_sessions').select('*').eq('user_id', user.id).eq('completed', true)
        if (rangeCfg.days > 0) {
          const since = new Date(); since.setDate(since.getDate() - rangeCfg.days)
          sessionQuery = sessionQuery.gte('started_at', since.toISOString())
        }
        const [sRes, tRes, bRes, cRes] = await Promise.all([
          sessionQuery.order('started_at', { ascending: true }),
          supabase.from('todos').select('*').eq('user_id', user.id),
          supabase.from('backlog_items').select('*').eq('user_id', user.id),
          supabase.from('user_chapters').select('*').eq('user_id', user.id),
        ])
        if (cancelled) return
        if (sRes.data) setSessions(sRes.data as StudySession[])
        if (tRes.data) setTodos(tRes.data as Todo[])
        if (bRes.data) setBacklog(bRes.data as BacklogItem[])
        if (cRes.data) setChapters(cRes.data as UserChapter[])
      } catch (err) {
        console.error('Analytics fetch error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user, range])

  // ─── Derived Stats ───────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0)
    const rangeCfg = RANGES.find((r) => r.key === range)!
    const dayCount = rangeCfg.days > 0 ? rangeCfg.days : Math.max(1, sessions.length)
    const avgDaily = dayCount > 0 ? totalMinutes / dayCount : 0

    // Best day
    const byDay: Record<string, number> = {}
    sessions.forEach((s) => {
      const d = fmtDate(new Date(s.started_at))
      byDay[d] = (byDay[d] || 0) + (s.duration || 0)
    })
    const bestDayEntry = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0]
    const bestDay = bestDayEntry ? { date: bestDayEntry[0], minutes: bestDayEntry[1] } : null

    // Streak (consecutive days with at least one session, counting back from today)
    const studyDates = new Set(sessions.map((s) => startOfDay(new Date(s.started_at)).getTime()))
    let streak = 0
    const cursor = startOfDay(new Date())
    while (studyDates.has(cursor.getTime())) { streak++; cursor.setDate(cursor.getDate() - 1) }

    // Subject distribution
    const bySubject: Record<string, number> = {}
    sessions.forEach((s) => { bySubject[s.subject] = (bySubject[s.subject] || 0) + (s.duration || 0) })
    const subjectDist = Object.entries(bySubject).sort((a, b) => b[1] - a[1])

    // Time over time (per day)
    const timeSeries: { date: string; minutes: number }[] = []
    if (rangeCfg.days > 0 && rangeCfg.days <= 90) {
      const dayMap: Record<string, number> = {}
      sessions.forEach((s) => { const d = fmtDate(new Date(s.started_at)); dayMap[d] = (dayMap[d] || 0) + (s.duration || 0) })
      for (let i = rangeCfg.days - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        const key = fmtDate(d)
        timeSeries.push({ date: key, minutes: dayMap[key] || 0 })
      }
    } else {
      // group by week for all-time
      const weekMap: Record<string, number> = {}
      sessions.forEach((s) => {
        const d = new Date(s.started_at)
        const weekNum = Math.floor((d.getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000))
        const key = `W${weekNum}`
        weekMap[key] = (weekMap[key] || 0) + (s.duration || 0)
      })
      Object.entries(weekMap).forEach(([date, minutes]) => timeSeries.push({ date, minutes }))
    }

    // Productivity score
    const totalTasks = todos.length
    const completedTasks = todos.filter((t) => t.status === 'completed').length
    const productivity = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // Chapter status breakdown
    const chapterStatuses: Record<string, number> = { 'not-started': 0, 'in-progress': 0, completed: 0, 'needs-review': 0 }
    chapters.forEach((c) => { if (chapterStatuses[c.status] !== undefined) chapterStatuses[c.status]++ })

    // Backlog completion rate
    const backlogTotal = backlog.length
    const backlogDone = backlog.filter((b) => b.status === 'completed').length
    const backlogRate = backlogTotal > 0 ? Math.round((backlogDone / backlogTotal) * 100) : 0

    // Weekly heatmap (7 days x 4 weeks)
    const heatmap: number[][] = Array.from({ length: 4 }, () => Array(7).fill(0))
    sessions.forEach((s) => {
      const d = new Date(s.started_at)
      const weeksAgo = Math.floor((Date.now() - d.getTime()) / (7 * 24 * 60 * 60 * 1000))
      if (weeksAgo >= 0 && weeksAgo < 4) {
        const dow = d.getDay()
        heatmap[3 - weeksAgo][dow] += s.duration || 0
      }
    })
    const maxHeat = Math.max(1, ...heatmap.flat())

    return { totalMinutes, avgDaily, bestDay, streak, subjectDist, timeSeries, productivity, completedTasks, totalTasks, chapterStatuses, backlogRate, backlogDone, backlogTotal, heatmap, maxHeat }
  }, [sessions, todos, backlog, chapters, range])

  // ─── Line Chart (Study Time Over Time) ──────────────────────────────────────
  const renderLineChart = () => {
    const data = stats.timeSeries
    if (data.length === 0) return null
    const w = 600; const h = 200; const pad = 30
    const maxVal = Math.max(1, ...data.map((d) => d.minutes))
    const stepX = data.length > 1 ? (w - pad * 2) / (data.length - 1) : 0
    const points = data.map((d, i) => {
      const x = pad + i * stepX
      const y = h - pad - (d.minutes / maxVal) * (h - pad * 2)
      return `${x},${y}`
    })
    const pathD = `M ${points.join(' L ')}`
    const areaD = `${pathD} L ${pad + (data.length - 1) * stepX},${h - pad} L ${pad},${h - pad} Z`
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={pad} y1={h - pad - t * (h - pad * 2)} x2={w - pad} y2={h - pad - t * (h - pad * 2)} stroke="currentColor" strokeWidth="1" className="text-neutral-200 dark:text-neutral-800" />
        ))}
        <path d={areaD} fill="url(#lineGrad)" />
        <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <circle key={i} cx={pad + i * stepX} cy={h - pad - (d.minutes / maxVal) * (h - pad * 2)} r="3" fill="#6366f1" />
        ))}
        {data.length <= 14 && data.map((d, i) => (
          <text key={i} x={pad + i * stepX} y={h - 8} textAnchor="middle" className="fill-neutral-500 text-[10px]">{d.date}</text>
        ))}
      </svg>
    )
  }

  // ─── Donut Chart (Subject Distribution) ──────────────────────────────────────
  const renderDonutChart = () => {
    const data = stats.subjectDist
    if (data.length === 0) return null
    const total = data.reduce((sum, [, m]) => sum + m, 0)
    const size = 200; const stroke = 30; const r = (size - stroke) / 2; const cx = size / 2; const cy = size / 2
    const circumference = 2 * Math.PI * r
    let offset = 0
    return (
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-48 h-48 -rotate-90">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-neutral-200 dark:text-neutral-800" />
          {data.slice(0, 10).map(([subj, mins], i) => {
            const frac = mins / total
            const dash = frac * circumference
            const seg = (
              <circle
                key={subj}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              />
            )
            offset += dash
            return seg
          })}
        </svg>
        <div className="flex flex-col gap-2 text-sm">
          {data.slice(0, 8).map(([subj, mins], i) => (
            <div key={subj} className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="text-neutral-700 dark:text-neutral-300">{subj}</span>
              <span className="text-neutral-400">{fmtDuration(mins)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ─── Bar Chart (Chapter Status) ──────────────────────────────────────────────
  const renderChapterBars = () => {
    const data = stats.chapterStatuses
    const entries = Object.entries(data) as [string, number][]
    const max = Math.max(1, ...entries.map(([, v]) => v))
    const labels: Record<string, string> = { 'not-started': 'Not Started', 'in-progress': 'In Progress', completed: 'Completed', 'needs-review': 'Needs Review' }
    const colors: Record<string, string> = { 'not-started': '#94a3b8', 'in-progress': '#f59e0b', completed: '#10b981', 'needs-review': '#ef4444' }
    return (
      <div className="flex flex-col gap-3">
        {entries.map(([key, val]) => (
          <div key={key} className="flex items-center gap-3">
            <span className="w-28 text-sm text-neutral-600 dark:text-neutral-400">{labels[key]}</span>
            <div className="flex-1 h-6 rounded-md bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
              <div className="h-full rounded-md flex items-center justify-end pr-2 text-xs text-white font-medium" style={{ width: `${(val / max) * 100}%`, backgroundColor: colors[key], minWidth: val > 0 ? '1.5rem' : 0 }}>{val > 0 ? val : ''}</div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ─── Heatmap ──────────────────────────────────────────────────────────────────
  const renderHeatmap = () => {
    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    return (
      <div className="flex gap-2">
        <div className="flex flex-col gap-1 pt-6">
          {dayLabels.map((d, i) => <div key={i} className="h-4 text-[10px] text-neutral-400 flex items-center">{d}</div>)}
        </div>
        <div className="flex flex-col gap-1">
          {['3 wks ago', '2 wks ago', 'Last wk', 'This wk'].map((label, wi) => (
            <div key={wi} className="flex items-center gap-1">
              <span className="w-16 text-[10px] text-neutral-400">{label}</span>
              <div className="flex gap-1">
                {stats.heatmap[wi].map((val, di) => {
                  const intensity = val / stats.maxHeat
                  const bg = val === 0 ? 'bg-neutral-200 dark:bg-neutral-800' : intensity > 0.66 ? 'bg-primary-600' : intensity > 0.33 ? 'bg-primary-400' : 'bg-primary-300'
                  return <div key={di} className={`h-4 w-4 rounded-sm ${bg}`} title={`${val}m`} />
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ─── LOADING STATE ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="glass-card p-8 flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          <p className="text-neutral-500">Loading analytics…</p>
        </div>
      </div>
    )
  }

  // ─── EMPTY STATE ──────────────────────────────────────────────────────────────
  if (sessions.length === 0 && todos.length === 0 && backlog.length === 0 && chapters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="glass-card p-8 max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/20 text-primary-500">
            <ChartIcon className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">No data yet</h2>
          <p className="mt-2 text-neutral-500">Start a study session, add todos, or track chapters to see your analytics here.</p>
        </div>
      </div>
    )
  }

  // ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header + range selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Analytics</h1>
          <p className="text-sm text-neutral-500">Track your study progress and productivity.</p>
        </div>
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <button key={r.key} onClick={() => setRange(r.key)} className={`badge ${range === r.key ? 'bg-primary-600 text-white' : 'bg-white/10 text-neutral-600 dark:text-neutral-300 hover:bg-white/20'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-primary-500"><ClockIcon className="h-5 w-5" /><span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Total Study</span></div>
          <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">{fmtDuration(stats.totalMinutes)}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-emerald-500"><TrendUpIcon className="h-5 w-5" /><span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Avg Daily</span></div>
          <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">{fmtDuration(stats.avgDaily)}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-amber-500"><TargetIcon className="h-5 w-5" /><span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Best Day</span></div>
          <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">{stats.bestDay ? fmtDuration(stats.bestDay.minutes) : '—'}</p>
          <p className="text-xs text-neutral-400">{stats.bestDay?.date || ''}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-rose-500"><FlameIcon className="h-5 w-5" /><span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Streak</span></div>
          <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">{stats.streak} {stats.streak === 1 ? 'day' : 'days'}</p>
        </div>
      </div>

      {/* Line chart */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Study Time Over Time</h2>
        <div className="mt-4">{stats.timeSeries.length > 0 ? renderLineChart() : <p className="text-neutral-400 text-sm py-8 text-center">No study sessions in this range.</p>}</div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Donut chart */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Subject Distribution</h2>
          <div className="mt-4">{stats.subjectDist.length > 0 ? renderDonutChart() : <p className="text-neutral-400 text-sm py-8 text-center">No subject data yet.</p>}</div>
        </div>

        {/* Productivity + Backlog */}
        <div className="glass-card p-6 flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2"><CheckCircleIcon className="h-5 w-5 text-emerald-500" /> Productivity Score</h2>
            <div className="mt-4 flex items-center gap-4">
              <div className="relative h-24 w-24">
                <svg viewBox="0 0 100 100" className="-rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="10" className="text-neutral-200 dark:text-neutral-800" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#10b981" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(stats.productivity / 100) * 2 * Math.PI * 42} ${2 * Math.PI * 42}`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-neutral-900 dark:text-white">{stats.productivity}%</div>
              </div>
              <p className="text-sm text-neutral-500">{stats.completedTasks} of {stats.totalTasks} tasks completed</p>
            </div>
          </div>
          <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2"><BookIcon className="h-5 w-5 text-amber-500" /> Backlog Completion</h2>
            <div className="mt-3 flex items-center gap-4">
              <div className="relative h-24 w-24">
                <svg viewBox="0 0 100 100" className="-rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="10" className="text-neutral-200 dark:text-neutral-800" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#f59e0b" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(stats.backlogRate / 100) * 2 * Math.PI * 42} ${2 * Math.PI * 42}`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-neutral-900 dark:text-white">{stats.backlogRate}%</div>
              </div>
              <p className="text-sm text-neutral-500">{stats.backlogDone} of {stats.backlogTotal} backlog items done</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chapter status breakdown */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Chapter Status Breakdown</h2>
        <div className="mt-4">{chapters.length > 0 ? renderChapterBars() : <p className="text-neutral-400 text-sm py-4 text-center">No chapters tracked yet.</p>}</div>
      </div>

      {/* Heatmap */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Weekly Heatmap</h2>
        <p className="text-xs text-neutral-400 mt-1">Study intensity over the last 4 weeks</p>
        <div className="mt-4 overflow-x-auto">{renderHeatmap()}</div>
      </div>
    </div>
  )
}

export default Analytics
