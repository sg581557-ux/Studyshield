import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, ChartColumn, GraduationCap, Clock, Bug,
  MessageSquare, Megaphone, Activity, FileText, Download, Search,
  ChevronLeft, ChevronRight, ShieldCheck, Star, Crown, Ban, Trash2,
  RotateCcw, Zap, Check, X, RefreshCw, Eye, TriangleAlert, Loader,
  Database, Lock, Radio, HardDrive, Server, Wifi, Smartphone, Monitor,
  Tablet, Send, SlidersHorizontal, TrendingUp, Hourglass, ChartBar,
  ChevronDown, Save, LogOut, UserCog,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/toast'
import type {
  UserRole, AdminUserRow, PlatformStats, FeatureUsageStats,
  ExamAnalyticsData, StudyAnalyticsData, BugReport, FeedbackRow,
  AdminLogRow, AppHealth,
} from '../lib/types'

// ─── Tab configuration ──────────────────────────────────────────────────────
type TabId =
  | 'overview' | 'users' | 'features' | 'exams' | 'study'
  | 'bugs' | 'feedback' | 'announcements' | 'health' | 'logs' | 'export'

interface TabDef {
  id: TabId
  label: string
  icon: typeof LayoutDashboard
  minRole: UserRole
}

const ROLE_RANK: Record<UserRole, number> = { super_admin: 4, admin: 3, moderator: 2, user: 1 }

const TABS: TabDef[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, minRole: 'moderator' },
  { id: 'users', label: 'User Management', icon: Users, minRole: 'moderator' },
  { id: 'features', label: 'Feature Analytics', icon: ChartColumn, minRole: 'moderator' },
  { id: 'exams', label: 'Exam Analytics', icon: GraduationCap, minRole: 'moderator' },
  { id: 'study', label: 'Study Analytics', icon: Clock, minRole: 'moderator' },
  { id: 'bugs', label: 'Bug Reports', icon: Bug, minRole: 'moderator' },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare, minRole: 'moderator' },
  { id: 'announcements', label: 'Announcements', icon: Megaphone, minRole: 'admin' },
  { id: 'health', label: 'App Health', icon: Activity, minRole: 'admin' },
  { id: 'logs', label: 'Logs', icon: FileText, minRole: 'admin' },
  { id: 'export', label: 'Export', icon: Download, minRole: 'admin' },
]

const EXAM_LIST = ['JEE', 'NEET', 'CUET', 'WBJEE', 'BITSAT', 'CA', 'CAT', 'UPSC', 'SSC', 'Banking', 'Other']
const FEATURE_LIST = [
  'Pomodoro Timer', 'Study Timer', 'Formula Vault', 'Module Tracker',
  'Revision Planner', 'AI Mentor', 'Mock Tests', 'Website Blocker',
  'Android App Blocker', 'Notes', 'PYQ Practice', 'Planner',
]

// ─── API helpers ────────────────────────────────────────────────────────────
const ADMIN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api`

async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${ADMIN_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
      ...options?.headers,
    },
  })
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      message = body.error || body.message || message
    } catch { /* keep default */ }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0])
  const escape = (val: unknown) => {
    const s = val === null || val === undefined ? '' : String(val)
    return `"${s.replace(/"/g, '""')}"`
  }
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ─── Small shared UI atoms ──────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
          <div className="h-7 w-20 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
        </div>
        <div className="h-10 w-10 rounded-xl bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
      </div>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="glass-card flex flex-col items-center justify-center gap-4 p-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-error-100 text-error-600 dark:bg-error-600/20 dark:text-error-400">
        <TriangleAlert className="h-7 w-7" />
      </div>
      <div>
        <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Something went wrong</p>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{message}</p>
      </div>
      <button onClick={onRetry} className="btn-primary">
        <RefreshCw className="h-4 w-4" /> Retry
      </button>
    </div>
  )
}

function EmptyState({ icon: Icon = FileText, title, message }: { icon?: typeof LayoutDashboard; title: string; message: string }) {
  return (
    <div className="glass-card flex flex-col items-center justify-center gap-3 p-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
        <Icon className="h-7 w-7" />
      </div>
      <div>
        <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</p>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{message}</p>
      </div>
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const ok = status === 'healthy' || status === 'operational' || status === 'ok'
  return (
    <span className="relative flex h-3 w-3">
      {ok && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-400 opacity-75" />}
      <span className={`relative inline-flex h-3 w-3 rounded-full ${ok ? 'bg-success-500' : 'bg-error-500'}`} />
    </span>
  )
}

// ─── 1. Overview Tab ────────────────────────────────────────────────────────
function OverviewTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void }) {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    adminFetch<PlatformStats>('/stats')
      .then(data => { setStats(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false); showToast(err.message, 'error') })
  }, [showToast])

  useEffect(() => { load() }, [load])

  const cards: { key: keyof PlatformStats; label: string; icon: typeof LayoutDashboard; suffix?: string; gradient: string }[] = [
    { key: 'totalUsers', label: 'Total Registered Users', icon: Users, gradient: 'from-primary-600 to-accent-500' },
    { key: 'activeUsersToday', label: 'Active Users Today', icon: TrendingUp, gradient: 'from-success-500 to-primary-600' },
    { key: 'onlineUsers', label: 'Online Users', icon: Zap, gradient: 'from-accent-500 to-success-500' },
    { key: 'newUsersToday', label: 'New Users Today', icon: UserCog, gradient: 'from-primary-500 to-accent-600' },
    { key: 'premiumUsers', label: 'Premium Users', icon: Crown, gradient: 'from-warning-500 to-error-500' },
    { key: 'totalStudyHours', label: 'Total Study Hours', icon: Hourglass, suffix: 'h', gradient: 'from-accent-600 to-primary-500' },
    { key: 'averageStudyTime', label: 'Average Study Time', icon: Clock, suffix: 'm', gradient: 'from-primary-600 to-accent-400' },
    { key: 'averageStreak', label: 'Average Streak', icon: Zap, suffix: ' days', gradient: 'from-success-600 to-accent-500' },
    { key: 'totalSessions', label: 'Total Sessions', icon: Activity, gradient: 'from-accent-500 to-primary-600' },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!stats) return <EmptyState title="No data available" message="Platform statistics could not be loaded." />

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c, i) => (
        <motion.div
          key={c.key}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.04 }}
          className="glass-card p-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{c.label}</p>
              <p className="mt-2 text-3xl font-bold text-neutral-900 dark:text-neutral-50">
                {stats[c.key]?.toLocaleString() ?? 0}
                <span className="text-lg font-semibold text-neutral-400 dark:text-neutral-500">{c.suffix ?? ''}</span>
              </p>
            </div>
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${c.gradient} text-white shadow-lg`}>
              <c.icon className="h-6 w-6" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ─── 2. User Management Tab ─────────────────────────────────────────────────
const ROLE_OPTIONS: UserRole[] = ['user', 'moderator', 'admin', 'super_admin']

function UserManagementTab({ role, showToast }: { role: UserRole; showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void }) {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const perPage = 20

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    const q = search ? `&search=${encodeURIComponent(search)}` : ''
    adminFetch<{ users: AdminUserRow[]; totalPages: number }>(`/users?page=${page}&perPage=${perPage}${q}`)
      .then(data => { setUsers(data.users ?? []); setTotalPages(data.totalPages ?? 1); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false); showToast(err.message, 'error') })
  }, [page, search, showToast])

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load() }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])
  useEffect(() => { load() }, [load, page])

  const runAction = useCallback(async (userId: string, action: string, body?: Record<string, unknown>) => {
    setActionLoading(`${userId}-${action}`)
    setOpenMenu(null)
    try {
      await adminFetch(`/users/${action}`, { method: 'POST', body: JSON.stringify({ userId, ...body }) })
      showToast(`Action "${action}" completed`, 'success')
      load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed', 'error')
    } finally {
      setActionLoading(null)
    }
  }, [load, showToast])

  const canBan = role === 'super_admin' || role === 'admin'
  const canManagePremium = role === 'super_admin' || role === 'admin'
  const canChangeRole = role === 'super_admin'
  const canDelete = role === 'super_admin'
  const canReset = role === 'super_admin'
  const viewOnly = role === 'moderator'

  return (
    <div className="space-y-4">
      <div className="glass-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="input-field pl-10"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
          <span>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading} className="btn-secondary !px-3 !py-2">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading} className="btn-secondary !px-3 !py-2">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="glass-card overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-neutral-100 p-4 dark:border-neutral-800">
              <div className="h-4 w-32 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
              <div className="h-4 w-48 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
              <div className="h-4 w-20 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
              <div className="h-4 w-16 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="No users found" message="Try adjusting your search query." />
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
              <tr>
                {['Name', 'Email', 'Role', 'Class', 'Target Exam', 'Study Hrs', 'Streak', 'Last Active', 'Device', 'Status', 'Flags', 'Actions'].map(h => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {users.map(u => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b border-neutral-100 transition-colors hover:bg-neutral-50 dark:border-neutral-800/60 dark:hover:bg-neutral-800/40"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">{u.name || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-600 dark:text-neutral-400">{u.email}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`badge ${u.role === 'super_admin' ? 'bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-400' : u.role === 'admin' ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400' : u.role === 'moderator' ? 'bg-accent-100 text-accent-700 dark:bg-accent-500/20 dark:text-accent-400' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}`}>{u.role}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-600 dark:text-neutral-400">{u.class || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-600 dark:text-neutral-400">{u.targetExam || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-600 dark:text-neutral-400">{u.studyHours ?? 0}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-600 dark:text-neutral-400">{u.currentStreak ?? 0}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-600 dark:text-neutral-400">{u.lastActive ? new Date(u.lastActive).toLocaleDateString() : '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-neutral-500 dark:text-neutral-400">
                        {u.device === 'mobile' ? <Smartphone className="h-3.5 w-3.5" /> : u.device === 'tablet' ? <Tablet className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5" />}
                        {u.device || 'web'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <StatusDot status={u.isOnline ? 'healthy' : 'down'} />
                        {u.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex gap-1">
                        {u.isPremium && <span className="badge bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-400"><Crown className="h-3 w-3" /> Pro</span>}
                        {u.isBanned && <span className="badge bg-error-100 text-error-700 dark:bg-error-500/20 dark:text-error-400"><Ban className="h-3 w-3" /> Banned</span>}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {viewOnly ? (
                        <span className="inline-flex items-center gap-1 text-xs text-neutral-400"><Eye className="h-3.5 w-3.5" /> View</span>
                      ) : (
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}
                            disabled={actionLoading?.startsWith(u.id)}
                            className="btn-secondary !px-3 !py-1.5 text-xs"
                          >
                            {actionLoading?.startsWith(u.id) ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <SlidersHorizontal className="h-3.5 w-3.5" />}
                            Actions <ChevronDown className="h-3 w-3" />
                          </button>
                          <AnimatePresence>
                            {openMenu === u.id && (
                              <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
                              >
                                {canChangeRole && (
                                  <div className="border-b border-neutral-100 p-2 dark:border-neutral-800">
                                    <p className="px-2 py-1 text-[10px] font-semibold uppercase text-neutral-400">Change Role</p>
                                    {ROLE_OPTIONS.map(r => (
                                      <button
                                        key={r}
                                        onClick={() => runAction(u.id, 'change-role', { role: r })}
                                        className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 ${u.role === r ? 'font-bold text-primary-600 dark:text-primary-400' : 'text-neutral-700 dark:text-neutral-300'}`}
                                      >
                                        {r} {u.role === r && <Check className="h-3 w-3" />}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {canBan && (
                                  <button onClick={() => runAction(u.id, u.isBanned ? 'unban' : 'ban')} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">
                                    <Ban className="h-3.5 w-3.5" /> {u.isBanned ? 'Unban User' : 'Ban User'}
                                  </button>
                                )}
                                {canManagePremium && (
                                  <button onClick={() => runAction(u.id, u.isPremium ? 'remove-premium' : 'give-premium')} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">
                                    <Crown className="h-3.5 w-3.5" /> {u.isPremium ? 'Remove Premium' : 'Give Premium'}
                                  </button>
                                )}
                                {canReset && (
                                  <button onClick={() => runAction(u.id, 'reset-progress')} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">
                                    <RotateCcw className="h-3.5 w-3.5" /> Reset Progress
                                  </button>
                                )}
                                {canDelete && (
                                  <button onClick={() => runAction(u.id, 'delete')} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-600/10">
                                    <Trash2 className="h-3.5 w-3.5" /> Delete User
                                  </button>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── 3. Feature Analytics Tab ───────────────────────────────────────────────
function FeatureAnalyticsTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void }) {
  const [features, setFeatures] = useState<FeatureUsageStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true); setError(null)
    adminFetch<FeatureUsageStats[]>('/feature-analytics')
      .then(data => {
        // Merge with canonical feature list to guarantee all 12 are present
        const map = new Map((data ?? []).map(f => [f.featureName, f]))
        setFeatures(FEATURE_LIST.map(name => map.get(name) ?? { featureName: name, daily: 0, weekly: 0, monthly: 0, total: 0 }))
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false); showToast(err.message, 'error') })
  }, [showToast])

  useEffect(() => { load() }, [load])

  const mostUsed = useMemo(() => [...features].sort((a, b) => b.total - a.total)[0], [features])

  if (loading) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div>
  if (error) return <ErrorState message={error} onRetry={load} />
  if (features.length === 0) return <EmptyState icon={ChartColumn} title="No feature data" message="Feature usage analytics will appear here." />

  return (
    <div className="space-y-4">
      {mostUsed && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card flex items-center gap-4 bg-gradient-to-r from-primary-600/10 to-accent-500/10 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-accent-500 text-white"><Star className="h-6 w-6" /></div>
          <div>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Most Used Feature</p>
            <p className="text-xl font-bold text-neutral-900 dark:text-neutral-50">{mostUsed.featureName} <span className="text-sm font-medium text-neutral-400">— {mostUsed.total.toLocaleString()} total uses</span></p>
          </div>
        </motion.div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <motion.div key={f.featureName} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="glass-card p-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-neutral-900 dark:text-neutral-100">{f.featureName}</p>
              <ChartColumn className="h-5 w-5 text-primary-500" />
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
              {([['Daily', f.daily], ['Weekly', f.weekly], ['Monthly', f.monthly], ['Total', f.total]] as const).map(([label, val]) => (
                <div key={label} className="rounded-lg bg-neutral-50 py-2 dark:bg-neutral-800/50">
                  <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50">{val.toLocaleString()}</p>
                  <p className="text-[10px] uppercase text-neutral-400">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ─── 4. Exam Analytics Tab ──────────────────────────────────────────────────
function ExamAnalyticsTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void }) {
  const [data, setData] = useState<ExamAnalyticsData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true); setError(null)
    adminFetch<ExamAnalyticsData[]>('/exam-analytics')
      .then(raw => {
        const map = new Map((raw ?? []).map(e => [e.exam, e]))
        setData(EXAM_LIST.map(exam => map.get(exam) ?? { exam, count: 0 }))
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false); showToast(err.message, 'error') })
  }, [showToast])

  useEffect(() => { load() }, [load])

  const maxCount = useMemo(() => Math.max(1, ...data.map(d => d.count)), [data])
  const total = useMemo(() => data.reduce((s, d) => s + d.count, 0), [data])
  const BAR_W = 36
  const GAP = 16
  const chartW = data.length * (BAR_W + GAP)
  const chartH = 240

  if (loading) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div>
  if (error) return <ErrorState message={error} onRetry={load} />
  if (total === 0) return <EmptyState icon={GraduationCap} title="No exam data" message="Exam preparation analytics will appear here." />

  return (
    <div className="glass-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">Users by Target Exam</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{total.toLocaleString()} students preparing across {data.length} exams</p>
        </div>
        <GraduationCap className="h-8 w-8 text-primary-500" />
      </div>
      <div className="overflow-x-auto">
        <svg width={Math.max(chartW, 320)} height={chartH + 50} className="mx-auto block" role="img" aria-label="Users by target exam">
          <defs>
            <linearGradient id="examBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          {data.map((d, i) => {
            const h = (d.count / maxCount) * chartH
            const x = i * (BAR_W + GAP) + GAP / 2
            const y = chartH - h
            return (
              <g key={d.exam}>
                <motion.rect initial={{ height: 0, y: chartH }} animate={{ height: h, y }} transition={{ duration: 0.5, delay: i * 0.04 }} x={x} width={BAR_W} rx={6} fill="url(#examBar)" />
                <text x={x + BAR_W / 2} y={y - 8} textAnchor="middle" className="fill-neutral-700 dark:fill-neutral-200" style={{ fontSize: 11, fontWeight: 600 }}>{d.count}</text>
                <text x={x + BAR_W / 2} y={chartH + 20} textAnchor="middle" className="fill-neutral-500 dark:fill-neutral-400" style={{ fontSize: 10 }}>{d.exam}</text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// ─── 5. Study Analytics Tab ─────────────────────────────────────────────────
function StudyAnalyticsTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void }) {
  const [data, setData] = useState<StudyAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true); setError(null)
    adminFetch<StudyAnalyticsData>('/study-analytics')
      .then(d => { setData(d); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false); showToast(err.message, 'error') })
  }, [showToast])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div>
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!data) return <EmptyState icon={Clock} title="No study data" message="Study analytics will appear here." />

  const cards: { label: string; value: string; icon: typeof LayoutDashboard; suffix?: string }[] = [
    { label: 'Daily Study Hours', value: data.dailyStudyHours?.toFixed(1) ?? '0', icon: Clock, suffix: 'h' },
    { label: 'Weekly Study Hours', value: data.weeklyStudyHours?.toFixed(1) ?? '0', icon: TrendingUp, suffix: 'h' },
    { label: 'Monthly Study Hours', value: data.monthlyStudyHours?.toFixed(1) ?? '0', icon: Hourglass, suffix: 'h' },
    { label: 'Retention Rate', value: (data.retentionRate ?? 0).toFixed(1), icon: Zap, suffix: '%' },
    { label: 'Average Session Time', value: (data.averageSessionTime ?? 0).toFixed(0), icon: Activity, suffix: 'm' },
    { label: 'Average Productivity', value: (data.averageProductivity ?? 0).toFixed(1), icon: Star, suffix: '%' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="glass-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{c.label}</p>
                <p className="mt-2 text-3xl font-bold text-neutral-900 dark:text-neutral-50">{c.value}<span className="text-lg text-neutral-400">{c.suffix}</span></p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-accent-500 text-white"><c.icon className="h-5 w-5" /></div>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="glass-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Crown className="h-5 w-5 text-warning-500" />
          <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">Top Performing Users</h3>
        </div>
        {data.topUsers && data.topUsers.length > 0 ? (
          <div className="space-y-2">
            {data.topUsers.map((u, i) => (
              <motion.div key={u.userId ?? i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/50">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-600 to-accent-500 text-sm font-bold text-white">{i + 1}</span>
                <span className="flex-1 font-medium text-neutral-900 dark:text-neutral-100">{u.name}</span>
                <span className="font-semibold text-primary-600 dark:text-primary-400">{u.studyHours?.toFixed(1) ?? 0}h</span>
              </motion.div>
            ))}
          </div>
        ) : <EmptyState icon={TrendingUp} title="No top users yet" message="Top performers will appear here once data is available." />}
      </div>
    </div>
  )
}

// ─── 6. Bug Reports Tab ─────────────────────────────────────────────────────
function BugReportsTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void }) {
  const [bugs, setBugs] = useState<BugReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true); setError(null)
    adminFetch<BugReport[]>('/bug-reports')
      .then(d => { setBugs(d ?? []); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false); showToast(err.message, 'error') })
  }, [showToast])

  useEffect(() => { load() }, [load])

  const doAction = useCallback(async (id: string, action: 'resolve' | 'close') => {
    setActionLoading(`${id}-${action}`)
    try {
      await adminFetch(`/bug-reports/${id}/${action}`, { method: 'POST' })
      showToast(`Report ${action}d`, 'success')
      load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed', 'error')
    } finally {
      setActionLoading(null)
    }
  }, [load, showToast])

  const statusBadge = (s: BugReport['status']) => {
    const cls = s === 'open' ? 'bg-error-100 text-error-700 dark:bg-error-500/20 dark:text-error-400'
      : s === 'resolved' ? 'bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-400'
      : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
    return <span className={`badge ${cls}`}>{s}</span>
  }

  if (loading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
  if (error) return <ErrorState message={error} onRetry={load} />
  if (bugs.length === 0) return <EmptyState icon={Bug} title="No bug reports" message="All clear — no bug reports submitted yet." />

  return (
    <div className="glass-card overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          <tr>{['User', 'Email', 'Description', 'Screenshot', 'Date', 'Status', 'Actions'].map(h => <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {bugs.map(b => (
            <tr key={b.id} className="border-b border-neutral-100 dark:border-neutral-800/60">
              <td className="whitespace-nowrap px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">{b.email?.split('@')[0] || '—'}</td>
              <td className="whitespace-nowrap px-4 py-3 text-neutral-600 dark:text-neutral-400">{b.email}</td>
              <td className="max-w-xs px-4 py-3 text-neutral-600 dark:text-neutral-400"><p className="line-clamp-2">{b.description}</p></td>
              <td className="px-4 py-3">
                {b.screenshot_url ? (
                  <a href={b.screenshot_url} target="_blank" rel="noreferrer" className="inline-block">
                    <img src={b.screenshot_url} alt="screenshot" className="h-12 w-12 rounded-lg object-cover ring-1 ring-neutral-200 dark:ring-neutral-700" />
                  </a>
                ) : <span className="text-xs text-neutral-400">—</span>}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-neutral-600 dark:text-neutral-400">{new Date(b.created_at).toLocaleDateString()}</td>
              <td className="whitespace-nowrap px-4 py-3">{statusBadge(b.status)}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <div className="flex gap-2">
                  <button onClick={() => doAction(b.id, 'resolve')} disabled={b.status === 'resolved' || actionLoading === `${b.id}-resolve`} className="btn-secondary !px-3 !py-1.5 text-xs">
                    {actionLoading === `${b.id}-resolve` ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Resolve
                  </button>
                  <button onClick={() => doAction(b.id, 'close')} disabled={b.status === 'closed' || actionLoading === `${b.id}-close`} className="btn-secondary !px-3 !py-1.5 text-xs">
                    {actionLoading === `${b.id}-close` ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} Close
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── 7. Feedback Tab ────────────────────────────────────────────────────────
function FeedbackTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void }) {
  const [feedback, setFeedback] = useState<FeedbackRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

  const load = useCallback(() => {
    setLoading(true); setError(null)
    adminFetch<FeedbackRow[]>('/feedback')
      .then(d => { setFeedback(d ?? []); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false); showToast(err.message, 'error') })
  }, [showToast])

  useEffect(() => { load() }, [load])

  const categories = useMemo(() => ['all', ...Array.from(new Set(feedback.map(f => f.category).filter(Boolean)))], [feedback])
  const filtered = useMemo(() => feedback.filter(f =>
    (category === 'all' || f.category === category) &&
    (!search || f.email?.toLowerCase().includes(search.toLowerCase()) || f.message?.toLowerCase().includes(search.toLowerCase()))
  ), [feedback, search, category])

  const exportCSV = () => {
    downloadCSV('feedback.csv', filtered.map(f => ({ email: f.email, rating: f.rating ?? '', category: f.category, message: f.message, date: f.created_at })))
    showToast('Feedback exported', 'success')
  }

  if (loading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div className="space-y-4">
      <div className="glass-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search feedback…" className="input-field pl-10" />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)} className="input-field sm:w-48">
          {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
        </select>
        <button onClick={exportCSV} className="btn-primary"><Download className="h-4 w-4" /> Export CSV</button>
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No feedback found" message="User feedback will appear here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((f, i) => (
            <motion.div key={f.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="glass-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100">{f.email}</p>
                  <p className="text-xs text-neutral-400">{f.category} · {new Date(f.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className={`h-4 w-4 ${(f.rating ?? 0) > s ? 'fill-warning-400 text-warning-400' : 'text-neutral-300 dark:text-neutral-700'}`} />
                  ))}
                </div>
              </div>
              <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">{f.message}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 8. Announcements Tab ───────────────────────────────────────────────────
function AnnouncementsTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void }) {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState<'push' | 'in_app'>('in_app')
  const [target, setTarget] = useState<'all' | 'premium' | 'exam' | 'class'>('all')
  const [targetValue, setTargetValue] = useState('')
  const [sending, setSending] = useState(false)

  const send = useCallback(async () => {
    if (!title.trim() || !message.trim()) { showToast('Title and message are required', 'warning'); return }
    setSending(true)
    try {
      await adminFetch('/announcements', { method: 'POST', body: JSON.stringify({ title, message, type, targetAudience: target, targetValue: target === 'all' || target === 'premium' ? null : targetValue }) })
      showToast('Announcement sent', 'success')
      setTitle(''); setMessage(''); setTargetValue('')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to send', 'error')
    } finally {
      setSending(false)
    }
  }, [title, message, type, target, targetValue, showToast])

  const needsValue = target === 'exam' || target === 'class'

  return (
    <div className="mx-auto max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
        <div className="mb-5 flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-primary-500" />
          <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">Create Announcement</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title…" className="input-field" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Message</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder="Write your message…" className="input-field resize-none" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Type</label>
              <select value={type} onChange={e => setType(e.target.value as 'push' | 'in_app')} className="input-field">
                <option value="in_app">In-App</option>
                <option value="push">Push Notification</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Target Audience</label>
              <select value={target} onChange={e => { setTarget(e.target.value as typeof target); setTargetValue('') }} className="input-field">
                <option value="all">All Users</option>
                <option value="premium">Premium Users</option>
                <option value="exam">By Exam</option>
                <option value="class">By Class</option>
              </select>
            </div>
          </div>
          {needsValue && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Target Value {target === 'exam' ? '(e.g. JEE, NEET)' : '(e.g. Class 12, Class 11)'}</label>
              <input value={targetValue} onChange={e => setTargetValue(e.target.value)} placeholder={target === 'exam' ? 'JEE' : 'Class 12'} className="input-field" />
            </div>
          )}
          <button onClick={send} disabled={sending} className="btn-primary w-full">
            {sending ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send Announcement
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── 9. App Health Tab ──────────────────────────────────────────────────────
function AppHealthTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void }) {
  const [health, setHealth] = useState<AppHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true); setError(null)
    adminFetch<AppHealth>('/app-health')
      .then(d => { setHealth(d); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false); showToast(err.message, 'error') })
  }, [showToast])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div>
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!health) return <EmptyState icon={Activity} title="No health data" message="App health metrics will appear here." />

  const services: { name: string; icon: typeof LayoutDashboard; info: { status: string; error?: string }; extra?: string }[] = [
    { name: 'Database', icon: Database, info: health.database, extra: health.storageUsage?.dbSizeBytes ? `${(health.storageUsage.dbSizeBytes / 1048576).toFixed(1)} MB` : undefined },
    { name: 'Authentication', icon: Lock, info: health.authentication },
    { name: 'Realtime', icon: Radio, info: health.realtime },
    { name: 'Storage', icon: HardDrive, info: health.storage, extra: health.storage?.buckets != null ? `${health.storage.buckets} buckets` : undefined },
    { name: 'API', icon: Wifi, info: health.api },
    { name: 'Server Health', icon: Server, info: health.serverHealth, extra: health.serverHealth?.uptime },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((s, i) => {
        const ok = s.info.status === 'healthy' || s.info.status === 'operational' || s.info.status === 'ok'
        return (
          <motion.div key={s.name} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${ok ? 'bg-success-100 text-success-600 dark:bg-success-500/20 dark:text-success-400' : 'bg-error-100 text-error-600 dark:bg-error-500/20 dark:text-error-400'}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100">{s.name}</p>
                  <p className={`text-xs font-medium capitalize ${ok ? 'text-success-600 dark:text-success-400' : 'text-error-600 dark:text-error-400'}`}>{s.info.status}</p>
                </div>
              </div>
              <StatusDot status={s.info.status} />
            </div>
            {s.extra && <p className="mt-3 text-xs text-neutral-400">{s.extra}</p>}
            {s.info.error && <p className="mt-2 text-xs text-error-500 dark:text-error-400">{s.info.error}</p>}
          </motion.div>
        )
      })}
    </div>
  )
}

// ─── 10. Logs Tab ───────────────────────────────────────────────────────────
function LogsTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void }) {
  const [logs, setLogs] = useState<AdminLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true); setError(null)
    adminFetch<AdminLogRow[]>('/logs')
      .then(d => { setLogs(d ?? []); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false); showToast(err.message, 'error') })
  }, [showToast])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}</div>
  if (error) return <ErrorState message={error} onRetry={load} />
  if (logs.length === 0) return <EmptyState icon={FileText} title="No logs yet" message="Admin audit logs will appear here." />

  return (
    <div className="glass-card overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          <tr>{['Admin Email', 'Action', 'Target User', 'Details', 'Date'].map(h => <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {logs.map(l => (
            <tr key={l.id} className="border-b border-neutral-100 dark:border-neutral-800/60">
              <td className="whitespace-nowrap px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">{l.admin_email}</td>
              <td className="whitespace-nowrap px-4 py-3"><span className="badge bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400">{l.action}</span></td>
              <td className="whitespace-nowrap px-4 py-3 text-neutral-600 dark:text-neutral-400">{l.target_user_email ?? '—'}</td>
              <td className="max-w-xs px-4 py-3 text-neutral-600 dark:text-neutral-400">{l.details ? JSON.stringify(l.details) : '—'}</td>
              <td className="whitespace-nowrap px-4 py-3 text-neutral-600 dark:text-neutral-400">{new Date(l.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── 11. Export Tab ─────────────────────────────────────────────────────────
function ExportTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error' | 'info' | 'warning') => void }) {
  const [busy, setBusy] = useState<string | null>(null)

  const exportData = useCallback(async (kind: 'users' | 'analytics' | 'feedback' | 'bugs') => {
    setBusy(kind)
    try {
      let rows: Record<string, unknown>[] = []
      let filename = ''
      if (kind === 'users') {
        const data = await adminFetch<{ users: AdminUserRow[] }>('/users?page=1&perPage=10000')
        rows = (data.users ?? []).map(u => ({ name: u.name, email: u.email, role: u.role, class: u.class, targetExam: u.targetExam, studyHours: u.studyHours, streak: u.currentStreak, lastActive: u.lastActive, isOnline: u.isOnline, isPremium: u.isPremium, isBanned: u.isBanned }))
        filename = 'users.csv'
      } else if (kind === 'analytics') {
        const [features, exams, study] = await Promise.all([
          adminFetch<FeatureUsageStats[]>('/feature-analytics'),
          adminFetch<ExamAnalyticsData[]>('/exam-analytics'),
          adminFetch<StudyAnalyticsData>('/study-analytics'),
        ])
        rows = (features ?? []).map(f => ({ type: 'feature', name: f.featureName, daily: f.daily, weekly: f.weekly, monthly: f.monthly, total: f.total }))
        rows.push(...(exams ?? []).map(e => ({ type: 'exam', name: e.exam, count: e.count })))
        rows.push({ type: 'study', dailyStudyHours: study.dailyStudyHours, weeklyStudyHours: study.weeklyStudyHours, monthlyStudyHours: study.monthlyStudyHours, retentionRate: study.retentionRate, averageSessionTime: study.averageSessionTime, averageProductivity: study.averageProductivity })
        filename = 'analytics.csv'
      } else if (kind === 'feedback') {
        const data = await adminFetch<FeedbackRow[]>('/feedback')
        rows = (data ?? []).map(f => ({ email: f.email, rating: f.rating ?? '', category: f.category, message: f.message, date: f.created_at }))
        filename = 'feedback.csv'
      } else {
        const data = await adminFetch<BugReport[]>('/bug-reports')
        rows = (data ?? []).map(b => ({ email: b.email, description: b.description, status: b.status, screenshot: b.screenshot_url ?? '', date: b.created_at }))
        filename = 'bug-reports.csv'
      }
      downloadCSV(filename, rows)
      showToast(`${kind} exported`, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Export failed', 'error')
    } finally {
      setBusy(null)
    }
  }, [showToast])

  const buttons: { kind: 'users' | 'analytics' | 'feedback' | 'bugs'; label: string; icon: typeof LayoutDashboard; desc: string }[] = [
    { kind: 'users', label: 'Export Users', icon: Users, desc: 'All registered users with roles, stats & flags' },
    { kind: 'analytics', label: 'Export Analytics', icon: ChartBar, desc: 'Feature, exam & study analytics combined' },
    { kind: 'feedback', label: 'Export Feedback', icon: MessageSquare, desc: 'All user feedback with ratings' },
    { kind: 'bugs', label: 'Export Bug Reports', icon: Bug, desc: 'All bug reports with status & screenshots' },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {buttons.map((b, i) => (
        <motion.div key={b.kind} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-accent-500 text-white"><b.icon className="h-6 w-6" /></div>
          <div className="flex-1">
            <p className="font-semibold text-neutral-900 dark:text-neutral-100">{b.label}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{b.desc}</p>
          </div>
          <button onClick={() => exportData(b.kind)} disabled={busy === b.kind} className="btn-primary !px-3">
            {busy === b.kind ? <Loader className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          </button>
        </motion.div>
      ))}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function DeveloperDashboard() {
  const { user, profile, role, loading, signOut } = useAuth()
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const allowedTabs = useMemo(() => TABS.filter(t => ROLE_RANK[role] >= ROLE_RANK[t.minRole]), [role])

  useEffect(() => {
    if (!loading && allowedTabs.length > 0 && !allowedTabs.some(t => t.id === activeTab)) {
      setActiveTab(allowedTabs[0].id)
    }
  }, [loading, allowedTabs, activeTab])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader className="h-8 w-8 animate-spin text-primary-500" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading dashboard…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="glass-card max-w-md p-8 text-center">
          <Lock className="mx-auto h-10 w-10 text-neutral-400" />
          <h2 className="mt-4 text-xl font-bold text-neutral-900 dark:text-neutral-50">Authentication Required</h2>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">Please sign in to access the developer dashboard.</p>
        </div>
      </div>
    )
  }

  if (ROLE_RANK[role] < ROLE_RANK['moderator']) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="glass-card max-w-md p-8 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-neutral-400" />
          <h2 className="mt-4 text-xl font-bold text-neutral-900 dark:text-neutral-50">Access Restricted</h2>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">You need moderator privileges or higher to view this dashboard.</p>
        </div>
      </div>
    )
  }

  const toast = showToast
  const tabProps = { showToast: toast }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-primary-50/30 dark:from-neutral-950 dark:via-neutral-900 dark:to-primary-950/20">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-accent-500 text-white shadow-lg shadow-primary-600/30">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gradient">Developer Dashboard</h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {profile?.name || profile?.email || user.email} · <span className="font-semibold text-primary-600 dark:text-primary-400">{role}</span>
              </p>
            </div>
          </div>
          <button onClick={() => signOut()} className="btn-secondary">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </motion.div>

        {/* Tab bar */}
        <div className="mb-6 flex flex-wrap gap-2 rounded-2xl glass-card p-2">
          {allowedTabs.map(tab => {
            const active = tab.id === activeTab
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${active ? 'text-white' : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'}`}
              >
                {active && <motion.span layoutId="tabBg" className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-600 to-accent-500 shadow-lg shadow-primary-600/30" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                <tab.icon className="relative z-10 h-4 w-4" />
                <span className="relative z-10 hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {activeTab === 'overview' && <OverviewTab {...tabProps} />}
            {activeTab === 'users' && <UserManagementTab role={role} showToast={toast} />}
            {activeTab === 'features' && <FeatureAnalyticsTab {...tabProps} />}
            {activeTab === 'exams' && <ExamAnalyticsTab {...tabProps} />}
            {activeTab === 'study' && <StudyAnalyticsTab {...tabProps} />}
            {activeTab === 'bugs' && <BugReportsTab {...tabProps} />}
            {activeTab === 'feedback' && <FeedbackTab {...tabProps} />}
            {activeTab === 'announcements' && <AnnouncementsTab {...tabProps} />}
            {activeTab === 'health' && <AppHealthTab {...tabProps} />}
            {activeTab === 'logs' && <LogsTab {...tabProps} />}
            {activeTab === 'export' && <ExportTab {...tabProps} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
