import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/toast'
import type { StudySession } from '../lib/types'

// ─── Inline SVG Icon Components ──────────────────────────────────────────────
const PlayIcon = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
)
const PauseIcon = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
)
const RotateIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
)
const BellIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
)
const ClockIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
)
const BookIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
)
const CheckIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
)

// ─── Timer Modes ──────────────────────────────────────────────────────────────
interface TimerMode {
  key: string
  label: string
  focus: number // minutes
  break: number // minutes
  sessionType: StudySession['session_type']
}

const TIMER_MODES: TimerMode[] = [
  { key: 'pomodoro', label: 'Pomodoro', focus: 25, break: 5, sessionType: 'pomodoro' },
  { key: 'extended', label: 'Extended', focus: 50, break: 10, sessionType: 'focus' },
  { key: 'ultra', label: 'Ultra Focus', focus: 90, break: 20, sessionType: 'focus' },
  { key: 'custom', label: 'Custom', focus: 30, break: 5, sessionType: 'custom' },
]

type Phase = 'focus' | 'break' | 'idle'

// ─── Circular Progress Ring ────────────────────────────────────────────────────
function ProgressRing({ progress, phase, timeDisplay }: { progress: number; phase: Phase; timeDisplay: string }) {
  const size = 280
  const stroke = 12
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference
  const ringColor = phase === 'break' ? '#10b981' : phase === 'focus' ? '#6366f1' : '#d4d4d4'

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-neutral-200 dark:text-neutral-800"
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-5xl font-bold text-neutral-900 dark:text-white tabular-nums">{timeDisplay}</span>
        <span className={`text-sm font-medium mt-2 ${phase === 'break' ? 'text-success-600 dark:text-success-400' : phase === 'focus' ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-400'}`}>
          {phase === 'break' ? 'Break Time' : phase === 'focus' ? 'Focus Time' : 'Ready'}
        </span>
      </div>
    </div>
  )
}

// ─── Session Item ────────────────────────────────────────────────────────────────
function SessionItem({ session }: { session: StudySession }) {
  const time = formatDuration(session.duration)
  const timeLabel = new Date(session.started_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return (
    <div className="flex items-center gap-3 rounded-lg p-3 bg-neutral-50 dark:bg-neutral-800/50">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex-shrink-0">
        <ClockIcon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">{session.subject || 'Study Session'}</p>
        <p className="text-xs text-neutral-500">{timeLabel} · {session.session_type}</p>
      </div>
      <span className="text-sm font-semibold text-primary-600 dark:text-primary-400 flex-shrink-0">{time}</span>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────────
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function StudyTimer() {
  const { user } = useAuth()
  const { showToast } = useToast()

  const [mode, setMode] = useState<TimerMode>(TIMER_MODES[0])
  const [customFocus, setCustomFocus] = useState(30)
  const [customBreak, setCustomBreak] = useState(5)
  const [phase, setPhase] = useState<Phase>('idle')
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [subject, setSubject] = useState('')
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionStartRef = useRef<Date | null>(null)

  const activeMode = mode.key === 'custom' ? { ...mode, focus: customFocus, break: customBreak } : mode

  // ─── Fetch today's sessions ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    let cancelled = false
    async function fetch() {
      setLoading(true)
      const { data, error } = await supabase.from('study_sessions').select('*').eq('user_id', user!.id).order('started_at', { ascending: false })
      if (!cancelled && !error && data) setSessions(data as StudySession[])
      if (!cancelled) setLoading(false)
    }
    fetch()
    return () => { cancelled = true }
  }, [user?.id])

  // ─── Timer tick ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            // Phase complete
            handlePhaseComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning])

  // ─── Phase complete ────────────────────────────────────────────────────────────
  const handlePhaseComplete = () => {
    setIsRunning(false)

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('StudyShield Timer', {
        body: phase === 'focus' ? 'Focus session complete! Time for a break. 🎉' : 'Break over! Ready to focus again? 📚',
      })
    }

    showToast(phase === 'focus' ? 'Focus session complete! 🎉' : 'Break over! Ready to focus? 📚', phase === 'focus' ? 'success' : 'info')

    // Save session when focus phase completes
    if (phase === 'focus' && user?.id && sessionStartRef.current) {
      const now = new Date()
      const durationMin = activeMode.focus
      supabase.from('study_sessions').insert({
        user_id: user.id,
        subject: subject.trim() || 'Study Session',
        duration: durationMin,
        session_type: activeMode.sessionType,
        completed: true,
        started_at: sessionStartRef.current.toISOString(),
        ended_at: now.toISOString(),
      }).then(({ data, error }) => {
        if (!error && data) {
          setSessions((prev) => [data as StudySession, ...prev])
        } else if (!error) {
          // Fallback: refetch or prepend a minimal object
          setSessions((prev) => [{
            id: crypto.randomUUID(),
            user_id: user.id,
            subject: subject.trim() || 'Study Session',
            duration: durationMin,
            session_type: activeMode.sessionType,
            completed: true,
            started_at: sessionStartRef.current!.toISOString(),
            ended_at: now.toISOString(),
            created_at: now.toISOString(),
          }, ...prev])
        }
      })
      sessionStartRef.current = null
    }

    // Transition phase
    if (phase === 'focus') {
      setPhase('break')
      setSecondsLeft(activeMode.break * 60)
    } else if (phase === 'break') {
      setPhase('focus')
      setSecondsLeft(activeMode.focus * 60)
      sessionStartRef.current = new Date()
      setIsRunning(true)
    }
  }

  // ─── Controls ──────────────────────────────────────────────────────────────────
  const handleStart = () => {
    if (phase === 'idle') {
      setPhase('focus')
      setSecondsLeft(activeMode.focus * 60)
      sessionStartRef.current = new Date()
    }
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    setIsRunning(true)
  }

  const handlePause = () => {
    setIsRunning(false)
  }

  const handleReset = () => {
    setIsRunning(false)
    setPhase('idle')
    setSecondsLeft(activeMode.focus * 60)
    sessionStartRef.current = null
  }

  const handleModeChange = (newMode: TimerMode) => {
    setIsRunning(false)
    setPhase('idle')
    setMode(newMode)
    setSecondsLeft((newMode.key === 'custom' ? customFocus : newMode.focus) * 60)
    sessionStartRef.current = null
  }

  // ─── Update seconds when custom values change ────────────────────────────────
  useEffect(() => {
    if (mode.key === 'custom' && phase === 'idle') {
      setSecondsLeft(customFocus * 60)
    }
  }, [customFocus, customBreak, mode.key, phase])

  // ─── Today's sessions ────────────────────────────────────────────────────────────
  const todaySessions = useMemo(() => {
    const today = new Date()
    return sessions.filter((s) => isSameDay(new Date(s.started_at), today))
  }, [sessions])

  const todayTotalMinutes = useMemo(() => {
    return todaySessions.reduce((sum, s) => sum + (s.duration || 0), 0)
  }, [todaySessions])

  // ─── Progress ────────────────────────────────────────────────────────────────────
  const totalSeconds = (phase === 'break' ? activeMode.break : activeMode.focus) * 60
  const progress = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0
  const timeDisplay = formatTime(secondsLeft)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Study Timer</h1>
        <p className="text-sm text-neutral-500 mt-1">Focus with the Pomodoro technique</p>
      </div>

      {/* Timer Card */}
      <div className="glass-card p-8 flex flex-col items-center gap-6">
        {/* Mode pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {TIMER_MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => handleModeChange(m)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                mode.key === m.key
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Custom inputs */}
        {mode.key === 'custom' && phase === 'idle' && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs text-neutral-500">Focus</label>
              <input
                type="number"
                min={1}
                max={180}
                value={customFocus}
                onChange={(e) => setCustomFocus(Math.max(1, Math.min(180, parseInt(e.target.value) || 1)))}
                className="input-field w-20 text-center"
              />
              <span className="text-xs text-neutral-500">min</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-neutral-500">Break</label>
              <input
                type="number"
                min={1}
                max={60}
                value={customBreak}
                onChange={(e) => setCustomBreak(Math.max(1, Math.min(60, parseInt(e.target.value) || 1)))}
                className="input-field w-20 text-center"
              />
              <span className="text-xs text-neutral-500">min</span>
            </div>
          </div>
        )}

        {/* Progress Ring */}
        <ProgressRing progress={progress} phase={phase} timeDisplay={timeDisplay} />

        {/* Subject Input */}
        <div className="w-full max-w-sm">
          <div className="relative">
            <BookIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
            <input
              className="input-field pl-11"
              placeholder="What are you studying?"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isRunning}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {!isRunning ? (
            <button onClick={handleStart} className="btn-primary px-8 py-3 text-base">
              <PlayIcon className="h-5 w-5" /> {phase === 'idle' ? 'Start' : 'Resume'}
            </button>
          ) : (
            <button onClick={handlePause} className="btn-primary px-8 py-3 text-base">
              <PauseIcon className="h-5 w-5" /> Pause
            </button>
          )}
          <button onClick={handleReset} className="btn-secondary px-6 py-3 text-base">
            <RotateIcon className="h-5 w-5" /> Reset
          </button>
        </div>

        {/* Notification hint */}
        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
          <BellIcon className="h-3.5 w-3.5" />
          {'Notification' in window && Notification.permission === 'granted'
            ? 'Notifications enabled — you\'ll be alerted on completion'
            : 'Enable notifications for completion alerts'
          }
        </div>
      </div>

      {/* Today's Sessions */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400">
              <ClockIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Today's Sessions</h3>
              <p className="text-xs text-neutral-500">{todaySessions.length} session{todaySessions.length !== 1 ? 's' : ''} · {formatDuration(todayTotalMinutes)} total</p>
            </div>
          </div>
          {todayTotalMinutes > 0 && (
            <div className="flex items-center gap-1.5 text-sm font-semibold text-success-600 dark:text-success-400">
              <CheckIcon className="h-4 w-4" /> {formatDuration(todayTotalMinutes)}
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                <div className="h-9 w-9 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-1/2 rounded bg-neutral-200 dark:bg-neutral-800" />
                  <div className="h-3 w-1/3 rounded bg-neutral-200 dark:bg-neutral-800" />
                </div>
                <div className="h-5 w-12 rounded bg-neutral-200 dark:bg-neutral-800" />
              </div>
            ))}
          </div>
        ) : todaySessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ClockIcon className="h-10 w-10 text-neutral-300 dark:text-neutral-700 mb-2" />
            <p className="text-sm text-neutral-500">No sessions yet today. Start the timer to begin!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todaySessions.map((s) => <SessionItem key={s.id} session={s} />)}
          </div>
        )}
      </div>
    </div>
  )
}
