import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'
import { useToast } from '../lib/toast'
import { supabase } from '../lib/supabase'

// ─── Inline SVG Icon Components ──────────────────────────────────────────────
const SunIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
)
const MoonIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
)
const BellIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
)
const ClockIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
)
const DownloadIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
)
const LogOutIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
)
const InfoIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
)
const ShieldIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
)

// ─── localStorage helpers ─────────────────────────────────────────────────────
const LS_NOTIF = 'studyshield-notifications'
const LS_POMODORO = 'studyshield-pomodoro'

interface NotifPrefs {
  sessionReminders: boolean
  taskDueAlerts: boolean
  weeklyReport: boolean
  streakAlerts: boolean
}
const DEFAULT_NOTIF: NotifPrefs = { sessionReminders: true, taskDueAlerts: true, weeklyReport: false, streakAlerts: true }

interface PomodoroSettings {
  focusDuration: number
  breakDuration: number
  longBreakDuration: number
}
const DEFAULT_POMODORO: PomodoroSettings = { focusDuration: 25, breakDuration: 5, longBreakDuration: 15 }

const APP_VERSION = '1.0.0'

function Settings() {
  const { user, profile, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { showToast } = useToast()

  const [notif, setNotif] = useState<NotifPrefs>(DEFAULT_NOTIF)
  const [pomodoro, setPomodoro] = useState<PomodoroSettings>(DEFAULT_POMODORO)
  const [exporting, setExporting] = useState(false)

  // ─── Load from localStorage ──────────────────────────────────────────────────
  useEffect(() => {
    try {
      const n = localStorage.getItem(LS_NOTIF)
      if (n) setNotif({ ...DEFAULT_NOTIF, ...JSON.parse(n) })
      const p = localStorage.getItem(LS_POMODORO)
      if (p) setPomodoro({ ...DEFAULT_POMODORO, ...JSON.parse(p) })
    } catch { /* ignore */ }
  }, [])

  const saveNotif = (key: keyof NotifPrefs, value: boolean) => {
    const next = { ...notif, [key]: value }
    setNotif(next)
    localStorage.setItem(LS_NOTIF, JSON.stringify(next))
    showToast('Notification preference saved', 'success')
  }

  const savePomodoro = (key: keyof PomodoroSettings, value: number) => {
    const next = { ...pomodoro, [key]: value }
    setPomodoro(next)
    localStorage.setItem(LS_POMODORO, JSON.stringify(next))
    showToast('Pomodoro settings saved', 'success')
  }

  // ─── Data Export ──────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!user) return
    setExporting(true)
    try {
      const [pRes, sRes, tRes, bRes, cRes, fRes, rRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('study_sessions').select('*').eq('user_id', user.id),
        supabase.from('todos').select('*').eq('user_id', user.id),
        supabase.from('backlog_items').select('*').eq('user_id', user.id),
        supabase.from('user_chapters').select('*').eq('user_id', user.id),
        supabase.from('formulas').select('*').eq('user_id', user.id),
        supabase.from('resources').select('*').eq('user_id', user.id),
      ])
      const exportData = {
        exportedAt: new Date().toISOString(),
        appVersion: APP_VERSION,
        profile: pRes.data,
        studySessions: sRes.data ?? [],
        todos: tRes.data ?? [],
        backlogItems: bRes.data ?? [],
        userChapters: cRes.data ?? [],
        formulas: fRes.data ?? [],
        resources: rRes.data ?? [],
      }
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `studyshield-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('Data exported successfully', 'success')
    } catch (err) {
      console.error('Export error:', err)
      showToast('Failed to export data', 'error')
    } finally {
      setExporting(false)
    }
  }

  // ─── Sign Out ──────────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    if (!window.confirm('Sign out of StudyShield?')) return
    await signOut()
    showToast('Signed out successfully', 'info')
  }

  // ─── Toggle Switch ────────────────────────────────────────────────────────────
  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-primary-600' : 'bg-neutral-300 dark:bg-neutral-700'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )

  // ─── MAIN ──────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Settings</h1>
        <p className="text-sm text-neutral-500">Customize your StudyShield experience.</p>
      </div>

      {/* Theme */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
          {theme === 'dark' ? <MoonIcon className="h-5 w-5 text-primary-500" /> : <SunIcon className="h-5 w-5 text-amber-500" />}
          Appearance
        </h2>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Theme</p>
            <p className="text-xs text-neutral-400">Switch between light and dark mode</p>
          </div>
          <button onClick={toggleTheme} className="btn-secondary flex items-center gap-2">
            {theme === 'dark' ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2"><BellIcon className="h-5 w-5 text-primary-500" /> Notification Preferences</h2>
        <p className="text-xs text-neutral-400 mt-1">Stored locally on this device</p>
        <div className="mt-4 space-y-4">
          {[
            { key: 'sessionReminders' as const, label: 'Session Reminders', desc: 'Remind me to start scheduled study sessions' },
            { key: 'taskDueAlerts' as const, label: 'Task Due Alerts', desc: 'Notify me when tasks are due soon' },
            { key: 'weeklyReport' as const, label: 'Weekly Report', desc: 'Email me a weekly study summary' },
            { key: 'streakAlerts' as const, label: 'Streak Alerts', desc: 'Warn me when my study streak is at risk' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{item.label}</p>
                <p className="text-xs text-neutral-400">{item.desc}</p>
              </div>
              <Toggle checked={notif[item.key]} onChange={() => saveNotif(item.key, !notif[item.key])} />
            </div>
          ))}
        </div>
      </div>

      {/* Pomodoro Settings */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2"><ClockIcon className="h-5 w-5 text-primary-500" /> Pomodoro Defaults</h2>
        <p className="text-xs text-neutral-400 mt-1">Default durations for the Pomodoro timer</p>
        <div className="mt-4 grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Focus (min)</label>
            <input type="number" min={5} max={120} value={pomodoro.focusDuration} onChange={(e) => savePomodoro('focusDuration', Math.max(1, Number(e.target.value) || 25))} className="input-field mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Short Break (min)</label>
            <input type="number" min={1} max={30} value={pomodoro.breakDuration} onChange={(e) => savePomodoro('breakDuration', Math.max(1, Number(e.target.value) || 5))} className="input-field mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Long Break (min)</label>
            <input type="number" min={5} max={60} value={pomodoro.longBreakDuration} onChange={(e) => savePomodoro('longBreakDuration', Math.max(1, Number(e.target.value) || 15))} className="input-field mt-1" />
          </div>
        </div>
      </div>

      {/* Data Export */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2"><DownloadIcon className="h-5 w-5 text-primary-500" /> Data Export</h2>
        <p className="text-xs text-neutral-400 mt-1">Download all your StudyShield data as a JSON file</p>
        <div className="mt-4">
          <button onClick={handleExport} disabled={exporting} className="btn-primary flex items-center gap-2">
            <DownloadIcon className="h-5 w-5" /> {exporting ? 'Exporting…' : 'Export My Data'}
          </button>
        </div>
      </div>

      {/* Account */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2"><ShieldIcon className="h-5 w-5 text-primary-500" /> Account</h2>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{profile?.email || user?.email}</p>
            <p className="text-xs text-neutral-400">{profile?.onboarding_completed ? 'Onboarding completed' : 'Onboarding incomplete'}</p>
          </div>
          <button onClick={handleSignOut} className="btn-secondary flex items-center gap-2 text-error-600 dark:text-error-400">
            <LogOutIcon className="h-5 w-5" /> Sign Out
          </button>
        </div>
      </div>

      {/* About */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2"><InfoIcon className="h-5 w-5 text-primary-500" /> About</h2>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-neutral-400">App Name</span><span className="font-medium text-neutral-900 dark:text-white">StudyShield</span></div>
          <div className="flex justify-between"><span className="text-neutral-400">Version</span><span className="font-medium text-neutral-900 dark:text-white">{APP_VERSION}</span></div>
          <div className="flex justify-between"><span className="text-neutral-400">Build</span><span className="font-medium text-neutral-900 dark:text-white">production</span></div>
        </div>
        <p className="mt-4 text-xs text-neutral-400">StudyShield helps students track their study progress, manage backlogs, and stay focused on exam preparation.</p>
      </div>
    </div>
  )
}

export default Settings
