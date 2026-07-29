import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  User,
  Mail,
  Phone,
  Calendar,
  Save,
  MapPin,
  GraduationCap,
  Target,
  Heart,
  Clock,
  Flame,
  Trophy,
  BookOpen,
  RefreshCw,
  FileText,
  Award,
  Quote,
  Camera,
  Sparkles,
  TrendingUp,
  Loader2,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/toast'
import type { Profile as ProfileType } from '../lib/types'
import { ALL_EXAMS, EXAM_YEARS, BOARDS, CLASSES, STUDY_SESSIONS } from '../lib/examData'

// ─── Constants ───────────────────────────────────────────────────────────────
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say']
const STREAMS = ['Science', 'Commerce', 'Arts', 'General']

// ─── Form State ──────────────────────────────────────────────────────────────
interface FormState {
  photo_url: string
  full_name: string
  email: string
  phone: string
  date_of_birth: string
  gender: string
  city: string
  state: string
  country: string
  school_name: string
  student_class: string
  board: string
  stream: string
  target_exam: string
  exam_year: string
  dream_college: string
  dream_branch: string
  dream_career: string
  daily_goal_hours: number | string
  preferred_study_time: string
  weekly_goal_days: number | string
  motivation_quote: string
}

// ─── Animation variants ──────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: 'easeOut' as const },
  },
}

function Profile() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)

  // ─── Safe accessors for fields not present on the Profile type ──────────────
  const pstr = (key: string): string => {
    const p = profile as unknown as Record<string, unknown>
    const v = p[key]
    return v == null ? '' : String(v)
  }
  const pnum = (key: string): number => {
    const p = profile as unknown as Record<string, unknown>
    const v = p[key]
    return typeof v === 'number' ? v : 0
  }

  // ─── Initialize form from profile ───────────────────────────────────────────
  useEffect(() => {
    if (!profile) return
    const ob = (profile.onboarding_data ?? {}) as Record<string, unknown>
    setForm({
      photo_url:
        profile.photo_url ?? profile.avatar_url ?? profile.profile_photo ?? '',
      full_name: profile.full_name ?? (ob.fullName as string) ?? '',
      email: profile.email ?? '',
      phone: profile.phone ?? '',
      date_of_birth: pstr('date_of_birth'),
      gender: pstr('gender'),
      city: profile.city ?? '',
      state: profile.state ?? '',
      country: profile.country ?? '',
      school_name: profile.school_name ?? (ob.schoolCollegeName as string) ?? '',
      student_class: profile.class ?? (ob.studentClass as string) ?? '',
      board: profile.board ?? (ob.board as string) ?? '',
      stream: profile.stream ?? '',
      target_exam: profile.target_exam ?? (ob.targetExam as string) ?? '',
      exam_year:
        profile.exam_year ??
        profile.target_year ??
        (ob.examYear as string) ??
        String(new Date().getFullYear() + 1),
      dream_college: profile.dream_college ?? '',
      dream_branch: profile.dream_branch ?? '',
      dream_career: pstr('dream_career'),
      daily_goal_hours: profile.daily_goal_hours ?? (ob.dailyStudyHours as number) ?? 4,
      preferred_study_time:
        profile.preferred_study_time ??
        profile.study_time ??
        (ob.preferredStudySession as string) ??
        '',
      weekly_goal_days: pnum('weekly_goal_days') || (ob.weeklyGoalDays as number) || 6,
      motivation_quote: pstr('motivation_quote'),
    })
  }, [profile])

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const update = (key: keyof FormState, value: string | number) => {
    setForm((f) => (f ? { ...f, [key]: value } : f))
  }

  const handleSave = async () => {
    if (!user || !profile || !form) return
    setSaving(true)
    try {
      const updates: Partial<ProfileType> & Record<string, unknown> = {
        full_name: form.full_name,
        display_name: form.full_name,
        photo_url: form.photo_url || null,
        avatar_url: form.photo_url || null,
        profile_photo: form.photo_url || null,
        phone: form.phone || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        city: form.city || null,
        state: form.state || null,
        country: form.country || null,
        school_name: form.school_name || null,
        class: form.student_class || null,
        board: form.board || null,
        stream: form.stream || null,
        target_exam: form.target_exam || null,
        exam_year: form.exam_year || null,
        target_year: form.exam_year || null,
        dream_college: form.dream_college || null,
        dream_branch: form.dream_branch || null,
        dream_career: form.dream_career || null,
        daily_goal_hours: Number(form.daily_goal_hours) || 4,
        preferred_study_time: form.preferred_study_time || null,
        study_time: form.preferred_study_time || null,
        weekly_goal_days: Number(form.weekly_goal_days) || null,
        motivation_quote: form.motivation_quote || null,
        onboarding_data: {
          ...(profile.onboarding_data ?? {}),
          fullName: form.full_name,
          studentClass: form.student_class,
          board: form.board,
          targetExam: form.target_exam,
          examYear: form.exam_year,
          schoolCollegeName: form.school_name,
        },
        updated_at: new Date().toISOString(),
      }
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
      if (error) throw error
      await refreshProfile()
      showToast('Profile saved successfully', 'success')
    } catch (err) {
      console.error('Profile save error:', err)
      showToast('Failed to save profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (loading || !profile || !form) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="glass-card p-8 flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
          <p className="text-neutral-500">Loading profile…</p>
        </div>
      </div>
    )
  }

  // ─── Read-only statistics ───────────────────────────────────────────────────
  const currentStreak = pnum('current_streak')
  const longestStreak = pnum('longest_streak')
  const studyHours = pnum('study_hours')
  const modulesCompleted = pnum('modules_completed')
  const revisionCount = pnum('revision_count')
  const mockTests = pnum('mock_tests_count')
  const achievementsRaw = (profile as unknown as Record<string, unknown>)[
    'achievements'
  ]
  const achievements: string[] = Array.isArray(achievementsRaw)
    ? (achievementsRaw as string[])
    : []

  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const photoPreview =
    form.photo_url ||
    profile.photo_url ||
    profile.avatar_url ||
    profile.profile_photo ||
    ''

  // ─── Reusable field components ──────────────────────────────────────────────
  const Field = ({
    label,
    icon: Icon,
    children,
  }: {
    label: string
    icon: React.ComponentType<{ className?: string }>
    children: React.ReactNode
  }) => (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-400">
        <Icon className="h-4 w-4 text-primary-500" />
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  )

  const inputCls = 'input-field'
  const statCards = [
    {
      label: 'Current Streak',
      value: `${currentStreak} day${currentStreak === 1 ? '' : 's'}`,
      icon: Flame,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
    },
    {
      label: 'Longest Streak',
      value: `${longestStreak} day${longestStreak === 1 ? '' : 's'}`,
      icon: Trophy,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Study Hours',
      value: `${studyHours}h`,
      icon: Clock,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Modules Completed',
      value: String(modulesCompleted),
      icon: BookOpen,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Revision Count',
      value: String(revisionCount),
      icon: RefreshCw,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
    {
      label: 'Mock Tests',
      value: String(mockTests),
      icon: FileText,
      color: 'text-rose-500',
      bg: 'bg-rose-500/10',
    },
  ]

  // ─── MAIN ───────────────────────────────────────────────────────────────────
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-4xl mx-auto"
    >
      {/* ─── Header ─── */}
      <motion.div
        variants={cardVariants}
        className="flex items-center gap-4"
      >
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/20 text-primary-500 overflow-hidden ring-2 ring-primary-500/30">
          {photoPreview ? (
            <img
              src={photoPreview}
              alt="Profile"
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-8 w-8" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {profile.full_name || 'Your Profile'}
          </h1>
          <p className="text-sm text-neutral-500">{profile.email}</p>
          <p className="text-xs text-neutral-400 mt-0.5">Member since {memberSince}</p>
        </div>
      </motion.div>

      {/* ─── Section 1: Profile Photo & Basic Info ─── */}
      <motion.div variants={cardVariants} className="glass-card p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary-500" />
          Profile Photo &amp; Basic Info
        </h2>

        {/* Photo URL + preview */}
        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary-500/10 text-primary-500 overflow-hidden ring-2 ring-primary-500/20">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Profile preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-10 w-10" />
            )}
          </div>
          <div className="flex-1 w-full">
            <Field label="Profile Photo URL" icon={Camera}>
              <input
                type="url"
                value={form.photo_url}
                onChange={(e) => update('photo_url', e.target.value)}
                className={inputCls}
                placeholder="https://example.com/photo.jpg"
              />
            </Field>
            <p className="mt-1 text-xs text-neutral-400">
              Paste an image URL — it will preview instantly.
            </p>
          </div>
        </div>

        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          <Field label="Full Name" icon={User}>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => update('full_name', e.target.value)}
              className={inputCls}
              placeholder="Your name"
            />
          </Field>

          <Field label="Email (read-only)" icon={Mail}>
            <input
              type="email"
              value={form.email}
              readOnly
              disabled
              className={`${inputCls} opacity-60 cursor-not-allowed`}
            />
          </Field>

          <Field label="Phone" icon={Phone}>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              className={inputCls}
              placeholder="+91 98765 43210"
            />
          </Field>

          <Field label="Date of Birth" icon={Calendar}>
            <input
              type="date"
              value={form.date_of_birth}
              onChange={(e) => update('date_of_birth', e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Gender" icon={User}>
            <select
              value={form.gender}
              onChange={(e) => update('gender', e.target.value)}
              className={inputCls}
            >
              <option value="">Select gender</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </motion.div>

      {/* ─── Section 2: Location ─── */}
      <motion.div variants={cardVariants} className="glass-card p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary-500" />
          Location
        </h2>
        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          <Field label="City" icon={MapPin}>
            <input
              type="text"
              value={form.city}
              onChange={(e) => update('city', e.target.value)}
              className={inputCls}
              placeholder="e.g. Mumbai"
            />
          </Field>
          <Field label="State" icon={MapPin}>
            <input
              type="text"
              value={form.state}
              onChange={(e) => update('state', e.target.value)}
              className={inputCls}
              placeholder="e.g. Maharashtra"
            />
          </Field>
          <Field label="Country" icon={MapPin}>
            <input
              type="text"
              value={form.country}
              onChange={(e) => update('country', e.target.value)}
              className={inputCls}
              placeholder="e.g. India"
            />
          </Field>
        </div>
      </motion.div>

      {/* ─── Section 3: Academic Information ─── */}
      <motion.div variants={cardVariants} className="glass-card p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary-500" />
          Academic Information
        </h2>
        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          <Field label="School / College Name" icon={GraduationCap}>
            <input
              type="text"
              value={form.school_name}
              onChange={(e) => update('school_name', e.target.value)}
              className={inputCls}
              placeholder="Optional"
            />
          </Field>

          <Field label="Class" icon={User}>
            <select
              value={form.student_class}
              onChange={(e) => update('student_class', e.target.value)}
              className={inputCls}
            >
              <option value="">Select class</option>
              {CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Board" icon={GraduationCap}>
            <select
              value={form.board}
              onChange={(e) => update('board', e.target.value)}
              className={inputCls}
            >
              <option value="">Select board</option>
              {BOARDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Stream" icon={BookOpen}>
            <select
              value={form.stream}
              onChange={(e) => update('stream', e.target.value)}
              className={inputCls}
            >
              <option value="">Select stream</option>
              {STREAMS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Target Exam" icon={Target}>
            <select
              value={form.target_exam}
              onChange={(e) => update('target_exam', e.target.value)}
              className={inputCls}
            >
              <option value="">Select exam</option>
              {ALL_EXAMS.map((ex) => (
                <option key={ex} value={ex}>
                  {ex}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Target Year" icon={Calendar}>
            <select
              value={String(form.exam_year)}
              onChange={(e) => update('exam_year', e.target.value)}
              className={inputCls}
            >
              {EXAM_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </motion.div>

      {/* ─── Section 4: Aspirations ─── */}
      <motion.div variants={cardVariants} className="glass-card p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary-500" />
          Aspirations
        </h2>
        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          <Field label="Dream College" icon={GraduationCap}>
            <input
              type="text"
              value={form.dream_college}
              onChange={(e) => update('dream_college', e.target.value)}
              className={inputCls}
              placeholder="e.g. IIT Bombay"
            />
          </Field>

          <Field label="Dream Branch" icon={BookOpen}>
            <input
              type="text"
              value={form.dream_branch}
              onChange={(e) => update('dream_branch', e.target.value)}
              className={inputCls}
              placeholder="e.g. Computer Science"
            />
          </Field>

          <Field label="Dream Career" icon={TrendingUp}>
            <input
              type="text"
              value={form.dream_career}
              onChange={(e) => update('dream_career', e.target.value)}
              className={inputCls}
              placeholder="e.g. Software Engineer"
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Motivation Quote" icon={Quote}>
              <textarea
                value={form.motivation_quote}
                onChange={(e) => update('motivation_quote', e.target.value)}
                rows={3}
                className={inputCls}
                placeholder="Write a quote that keeps you going…"
              />
            </Field>
          </div>
        </div>
      </motion.div>

      {/* ─── Section 5: Study Preferences ─── */}
      <motion.div variants={cardVariants} className="glass-card p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary-500" />
          Study Preferences
        </h2>
        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          <Field label="Daily Study Goal (hours)" icon={Clock}>
            <input
              type="number"
              min={0}
              max={24}
              value={form.daily_goal_hours}
              onChange={(e) => update('daily_goal_hours', e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Preferred Study Time" icon={Sparkles}>
            <select
              value={form.preferred_study_time}
              onChange={(e) => update('preferred_study_time', e.target.value)}
              className={inputCls}
            >
              <option value="">Select session</option>
              {STUDY_SESSIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Weekly Goal (days)" icon={Calendar}>
            <input
              type="number"
              min={1}
              max={7}
              value={form.weekly_goal_days}
              onChange={(e) => update('weekly_goal_days', e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </motion.div>

      {/* ─── Section 6: Statistics (read-only) ─── */}
      <motion.div variants={cardVariants} className="glass-card p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary-500" />
          Statistics
        </h2>
        <p className="text-xs text-neutral-400 mt-1">
          These update automatically as you study — read-only.
        </p>

        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="flex items-center gap-3 rounded-xl border border-white/10 dark:border-white/5 bg-white/5 dark:bg-white/5 p-4"
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${stat.bg}`}
                >
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-neutral-400">
                    {stat.label}
                  </p>
                  <p className="text-lg font-bold text-neutral-900 dark:text-white truncate">
                    {stat.value}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Achievements */}
        {achievements.length > 0 && (
          <div className="mt-6">
            <p className="flex items-center gap-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-400">
              <Award className="h-4 w-4 text-primary-500" />
              Achievements
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {achievements.map((a, i) => (
                <span
                  key={`${a}-${i}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400"
                >
                  <Award className="h-3.5 w-3.5" />
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}
        {achievements.length === 0 && (
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-4">
            <Award className="h-5 w-5 text-neutral-400" />
            <p className="text-sm text-neutral-400">
              No achievements yet — keep studying to unlock them!
            </p>
          </div>
        )}
      </motion.div>

      {/* ─── Save button ─── */}
      <motion.div variants={cardVariants} className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Save className="h-5 w-5" />
          )}
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </motion.div>
    </motion.div>
  )
}

export default Profile
