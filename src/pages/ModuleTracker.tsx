import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/toast'
import type { UserChapter, ChapterStatus, ChapterProgressFlags } from '../lib/types'
import {
  ChevronDown, ChevronRight, BookOpen, Circle, PlayCircle, CheckCircle2,
  AlertCircle, Filter, Layers, Expand, Minimize2, CheckSquare, Square,
  RefreshCw, GraduationCap,
} from 'lucide-react'

const STATUS_ORDER: ChapterStatus[] = ['not-started', 'in-progress', 'completed', 'needs-review']

const STATUS_CONFIG: Record<ChapterStatus, { label: string; badge: string; dot: string; icon: typeof Circle }> = {
  'not-started': {
    label: 'Not Started',
    badge: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
    dot: 'bg-neutral-400',
    icon: Circle,
  },
  'in-progress': {
    label: 'In Progress',
    badge: 'bg-primary-100 text-primary-700 dark:bg-primary-950/40 dark:text-primary-400',
    dot: 'bg-primary-500',
    icon: PlayCircle,
  },
  'completed': {
    label: 'Completed',
    badge: 'bg-success-100 text-success-700 dark:bg-success-950/40 dark:text-success-400',
    dot: 'bg-success-500',
    icon: CheckCircle2,
  },
  'needs-review': {
    label: 'Needs Review',
    badge: 'bg-warning-100 text-warning-700 dark:bg-warning-950/40 dark:text-warning-400',
    dot: 'bg-warning-500',
    icon: AlertCircle,
  },
}

const TASK_KEYS: { key: keyof ChapterProgressFlags; label: string }[] = [
  { key: 'lectureCompleted', label: 'Lecture' },
  { key: 'notesCompleted', label: 'Notes' },
  { key: 'dppCompleted', label: 'DPP' },
  { key: 'moduleQuestionsCompleted', label: 'Module Exercise 1' },
  { key: 'conceptMastered', label: 'Module Exercise 2' },
  { key: 'formulaRevised', label: 'Module Exercise 3' },
  { key: 'pyqsSolved', label: 'PYQs' },
  { key: 'revision1', label: 'Revision 1' },
  { key: 'revision2', label: 'Revision 2' },
  { key: 'revision3', label: 'Revision 3' },
  { key: 'fullyCompleted', label: 'Mock Test' },
]

function nextStatus(current: ChapterStatus): ChapterStatus {
  const idx = STATUS_ORDER.indexOf(current)
  return STATUS_ORDER[(idx + 1) % STATUS_ORDER.length]
}

function computeStatus(progress: ChapterProgressFlags): ChapterStatus {
  const allDone = TASK_KEYS.every((t) => progress[t.key])
  if (allDone) return 'completed'
  const anyDone = TASK_KEYS.some((t) => progress[t.key])
  return anyDone ? 'in-progress' : 'not-started'
}

function countDoneTasks(progress: ChapterProgressFlags): number {
  return TASK_KEYS.filter((t) => progress[t.key]).length
}

function StatPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="glass-card p-4 flex items-center gap-3">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
        <span className="text-sm font-bold text-white">{count}</span>
      </div>
      <span className="text-sm text-neutral-600 dark:text-neutral-400">{label}</span>
    </div>
  )
}

function ChapterSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 animate-pulse">
      <div className="h-5 w-5 rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="h-4 flex-1 rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="h-5 w-20 rounded bg-neutral-200 dark:bg-neutral-800" />
    </div>
  )
}

export default function ModuleTracker() {
  const { user, profile } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [chapters, setChapters] = useState<UserChapter[]>([])
  const [expandedExams, setExpandedExams] = useState<Set<string>>(new Set())
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set())
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  const [filterExam, setFilterExam] = useState('all')
  const [filterSubject, setFilterSubject] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const fetchChapters = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('user_chapters')
      .select('*')
      .eq('user_id', user.id)
      .order('exam', { ascending: true })
      .order('subject', { ascending: true })
      .order('chapter', { ascending: true })
    if (error) {
      showToast('Failed to load chapters', 'error')
      console.error(error)
    } else {
      setChapters((data || []) as UserChapter[])
    }
    setLoading(false)
  }, [user?.id, showToast])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false;
    (async () => {
      // Auto-seed if user has a target exam but no chapters
      if (profile?.target_exam) {
        setSeeding(true)
        await supabase.rpc('seed_user_chapters', { p_user_id: user.id, p_exam_name: profile.target_exam })
        if (!cancelled) setSeeding(false)
      }
      if (!cancelled) await fetchChapters()
    })()
    return () => { cancelled = true }
  }, [user?.id, profile?.target_exam, fetchChapters])

  const exams = useMemo(() => Array.from(new Set(chapters.map((c) => c.exam).filter(Boolean))).sort(), [chapters])
  const subjects = useMemo(() => {
    const filtered = filterExam === 'all' ? chapters : chapters.filter((c) => c.exam === filterExam)
    return Array.from(new Set(filtered.map((c) => c.subject).filter(Boolean))).sort()
  }, [chapters, filterExam])

  const filteredChapters = useMemo(() => {
    return chapters.filter((c) => {
      if (filterExam !== 'all' && c.exam !== filterExam) return false
      if (filterSubject !== 'all' && c.subject !== filterSubject) return false
      if (filterStatus !== 'all' && c.status !== filterStatus) return false
      return true
    })
  }, [chapters, filterExam, filterSubject, filterStatus])

  // Group: Exam → Subject → Chapters
  const grouped = useMemo(() => {
    const examMap = new Map<string, { exam: string; subjects: Map<string, { subject: string; chapters: UserChapter[] }> }>()
    for (const ch of filteredChapters) {
      if (!examMap.has(ch.exam)) {
        examMap.set(ch.exam, { exam: ch.exam, subjects: new Map() })
      }
      const examGroup = examMap.get(ch.exam)!
      if (!examGroup.subjects.has(ch.subject)) {
        examGroup.subjects.set(ch.subject, { subject: ch.subject, chapters: [] })
      }
      examGroup.subjects.get(ch.subject)!.chapters.push(ch)
    }
    return Array.from(examMap.values()).map((eg) => ({
      exam: eg.exam,
      subjects: Array.from(eg.subjects.values()).sort((a, b) => a.subject.localeCompare(b.subject)),
    }))
  }, [filteredChapters])

  const stats = useMemo(() => ({
    total: filteredChapters.length,
    completed: filteredChapters.filter((c) => c.status === 'completed').length,
    inProgress: filteredChapters.filter((c) => c.status === 'in-progress').length,
    notStarted: filteredChapters.filter((c) => c.status === 'not-started').length,
    needsReview: filteredChapters.filter((c) => c.status === 'needs-review').length,
  }), [filteredChapters])

  const cycleStatus = async (chapter: UserChapter) => {
    const newStatus = nextStatus(chapter.status)
    const prev = chapters
    setChapters((cur) => cur.map((c) => (c.id === chapter.id ? { ...c, status: newStatus } : c)))
    const { error } = await supabase.from('user_chapters').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', chapter.id)
    if (error) { showToast('Failed to update status', 'error'); setChapters(prev) }
    else { showToast(`Marked as "${STATUS_CONFIG[newStatus].label}"`, 'success') }
  }

  const toggleTask = async (chapter: UserChapter, taskKey: keyof ChapterProgressFlags) => {
    const currentProgress = (chapter.progress as ChapterProgressFlags) || ({} as ChapterProgressFlags)
    const newProgress = { ...currentProgress, [taskKey]: !currentProgress[taskKey] }
    const newStatus = computeStatus(newProgress)
    const prev = chapters
    setChapters((cur) => cur.map((c) => (c.id === chapter.id ? { ...c, progress: newProgress, status: newStatus } : c)))
    const { error } = await supabase.from('user_chapters').update({ progress: newProgress as Record<string, unknown>, status: newStatus, updated_at: new Date().toISOString() }).eq('id', chapter.id)
    if (error) { showToast('Failed to update task', 'error'); setChapters(prev) }
  }

  const toggleExam = (exam: string) => {
    setExpandedExams((prev) => { const n = new Set(prev); if (n.has(exam)) n.delete(exam); else n.add(exam); return n })
  }
  const toggleSubject = (key: string) => {
    setExpandedSubjects((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n })
  }
  const toggleChapter = (id: string) => {
    setExpandedChapters((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  const expandAll = () => {
    const allExams = new Set(grouped.map((g) => g.exam))
    const allSubjects = new Set<string>()
    const allChapters = new Set<string>()
    grouped.forEach((eg) => eg.subjects.forEach((sg) => {
      allSubjects.add(`${eg.exam}||${sg.subject}`)
      sg.chapters.forEach((ch) => allChapters.add(ch.id))
    }))
    setExpandedExams(allExams); setExpandedSubjects(allSubjects); setExpandedChapters(allChapters)
  }
  const collapseAll = () => { setExpandedExams(new Set()); setExpandedSubjects(new Set()); setExpandedChapters(new Set()) }

  const handleSeed = async () => {
    if (!user?.id || !profile?.target_exam) return
    setSeeding(true)
    const { error } = await supabase.rpc('seed_user_chapters', { p_user_id: user.id, p_exam_name: profile.target_exam })
    if (error) showToast('Failed to seed syllabus', 'error')
    else { showToast('Syllabus seeded successfully', 'success'); await fetchChapters() }
    setSeeding(false)
  }

  if (loading || seeding) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 rounded bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="glass-card p-4 h-16 animate-pulse" />)}
        </div>
        <div className="glass-card p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <div className="h-6 w-48 rounded bg-neutral-200 dark:bg-neutral-800 mb-3 animate-pulse" />
              <div className="space-y-1"><ChapterSkeleton /><ChapterSkeleton /><ChapterSkeleton /></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Module Tracker</h1>
          <p className="text-sm text-neutral-500 mt-1">Track your chapter progress across exams, subjects, and tasks.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={expandAll} className="btn-ghost text-xs flex items-center gap-1.5"><Expand className="h-3.5 w-3.5" /> Expand all</button>
          <button onClick={collapseAll} className="btn-ghost text-xs flex items-center gap-1.5"><Minimize2 className="h-3.5 w-3.5" /> Collapse all</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatPill label="Total" count={stats.total} color="bg-neutral-500" />
        <StatPill label="Completed" count={stats.completed} color="bg-success-600" />
        <StatPill label="In Progress" count={stats.inProgress} color="bg-primary-600" />
        <StatPill label="Not Started" count={stats.notStarted} color="bg-neutral-400" />
        <StatPill label="Needs Review" count={stats.needsReview} color="bg-warning-500" />
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-neutral-400" />
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Exam</label>
            <select value={filterExam} onChange={(e) => { setFilterExam(e.target.value); setFilterSubject('all') }} className="input-field">
              <option value="all">All Exams</option>
              {exams.map((ex) => <option key={ex} value={ex}>{ex}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Subject</label>
            <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="input-field">
              <option value="all">All Subjects</option>
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field">
              <option value="all">All Statuses</option>
              {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {chapters.length === 0 ? (
        <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 mb-4">
            <BookOpen className="h-8 w-8 text-neutral-400" />
          </div>
          {profile?.target_exam ? (
            <>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-1">No syllabus found</h3>
              <p className="text-sm text-neutral-500 max-w-sm mb-4">No syllabus found. Please seed the syllabus database.</p>
              <button onClick={handleSeed} className="btn-primary flex items-center gap-2">
                <RefreshCw className="h-4 w-4" /> Seed Syllabus
              </button>
            </>
          ) : (
            <>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-1">No target exam set</h3>
              <p className="text-sm text-neutral-500 max-w-sm">Please set your target exam in onboarding or profile to see your syllabus.</p>
            </>
          )}
        </div>
      ) : grouped.length === 0 ? (
        <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 mb-4">
            <Filter className="h-8 w-8 text-neutral-400" />
          </div>
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-1">No chapters match your filters</h3>
          <p className="text-sm text-neutral-500">Try adjusting your filter selections.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((examGroup) => {
            const examExpanded = expandedExams.has(examGroup.exam)
            const examTotal = examGroup.subjects.reduce((sum, sg) => sum + sg.chapters.length, 0)
            const examCompleted = examGroup.subjects.reduce((sum, sg) => sum + sg.chapters.filter((c) => c.status === 'completed').length, 0)
            const examPct = examTotal > 0 ? Math.round((examCompleted / examTotal) * 100) : 0

            return (
              <div key={examGroup.exam} className="glass-card overflow-hidden">
                {/* Exam header */}
                <button onClick={() => toggleExam(examGroup.exam)} className="flex items-center gap-3 w-full p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors text-left">
                  {examExpanded ? <ChevronDown className="h-5 w-5 text-neutral-400" /> : <ChevronRight className="h-5 w-5 text-neutral-400" />}
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary-600 to-accent-500 text-white">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{examGroup.exam}</p>
                    <p className="text-xs text-neutral-400">{examTotal} chapters • {examGroup.subjects.length} subjects</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="hidden sm:block w-28">
                      <div className="h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                        <div className="h-full rounded-full bg-success-500 transition-all" style={{ width: `${examPct}%` }} />
                      </div>
                    </div>
                    <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-950/40 dark:text-primary-400">{examPct}%</span>
                  </div>
                </button>

                {/* Subjects */}
                {examExpanded && (
                  <div className="border-t border-neutral-200/60 dark:border-neutral-800/60">
                    {examGroup.subjects.map((sg) => {
                      const subjectKey = `${examGroup.exam}||${sg.subject}`
                      const subjectExpanded = expandedSubjects.has(subjectKey)
                      const subjectCompleted = sg.chapters.filter((c) => c.status === 'completed').length
                      const subjectPct = sg.chapters.length > 0 ? Math.round((subjectCompleted / sg.chapters.length) * 100) : 0

                      return (
                        <div key={subjectKey} className="border-b border-neutral-100 dark:border-neutral-800/50 last:border-0">
                          {/* Subject header */}
                          <button onClick={() => toggleSubject(subjectKey)} className="flex items-center gap-3 w-full p-3 pl-8 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors text-left">
                            {subjectExpanded ? <ChevronDown className="h-4 w-4 text-neutral-400" /> : <ChevronRight className="h-4 w-4 text-neutral-400" />}
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400">
                              <Layers className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">{sg.subject}</p>
                              <p className="text-xs text-neutral-400">{sg.chapters.length} chapters</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs text-neutral-500">{subjectCompleted}/{sg.chapters.length}</span>
                              <span className="badge bg-success-100 text-success-700 dark:bg-success-950/40 dark:text-success-400">{subjectPct}%</span>
                            </div>
                          </button>

                          {/* Chapters */}
                          {subjectExpanded && (
                            <div className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                              {sg.chapters.map((ch) => {
                                const chExpanded = expandedChapters.has(ch.id)
                                const cfg = STATUS_CONFIG[ch.status]
                                const StatusIcon = cfg.icon
                                const progress = (ch.progress as ChapterProgressFlags) || ({} as ChapterProgressFlags)
                                const doneCount = countDoneTasks(progress)

                                return (
                                  <div key={ch.id}>
                                    {/* Chapter row */}
                                    <div className="flex items-center gap-2 p-2.5 pl-12 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group">
                                      <button onClick={() => toggleChapter(ch.id)} className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors">
                                        {chExpanded ? <ChevronDown className="h-3.5 w-3.5 text-neutral-400" /> : <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />}
                                      </button>
                                      <button onClick={() => cycleStatus(ch)} className={`flex h-5 w-5 items-center justify-center rounded-full ${cfg.dot} flex-shrink-0 hover:scale-110 transition-transform`}>
                                        <StatusIcon className="h-3 w-3 text-white" />
                                      </button>
                                      <span className="text-sm text-neutral-700 dark:text-neutral-300 flex-1 truncate">{ch.chapter}</span>
                                      {doneCount > 0 && <span className="text-xs text-neutral-400 hidden sm:inline">{doneCount}/11 tasks</span>}
                                      <button onClick={() => cycleStatus(ch)} className={`badge ${cfg.badge} group-hover:scale-105 transition-transform`}>{cfg.label}</button>
                                    </div>

                                    {/* Task checkboxes */}
                                    {chExpanded && (
                                      <div className="pl-14 pb-3 pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 bg-neutral-50/50 dark:bg-neutral-900/30">
                                        {TASK_KEYS.map((task) => {
                                          const done = !!progress[task.key]
                                          return (
                                            <button
                                              key={task.key}
                                              onClick={() => toggleTask(ch, task.key)}
                                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                                                done
                                                  ? 'bg-success-50 text-success-700 dark:bg-success-950/30 dark:text-success-400'
                                                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                              }`}
                                            >
                                              {done ? <CheckSquare className="h-3.5 w-3.5 text-success-500" /> : <Square className="h-3.5 w-3.5 text-neutral-400" />}
                                              <span className={done ? 'font-medium' : ''}>{task.label}</span>
                                            </button>
                                          )
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
