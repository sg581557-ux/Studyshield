import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { useDebounce, useLocalStorage } from '../lib/hooks'
import { supabase } from '../lib/supabase'
import {
  FORMULA_DB,
  searchFormulas,
  getExamsFromFormulas,
  getSubjectsFromFormulas,
  getChaptersFromFormulas,
  type FormulaEntry,
} from '../lib/formulaData'
import type { Formula } from '../lib/types'
import { SmartFormula } from '../components/FormulaVault/LaTeXRenderer'

// ─── Inline SVG Icon Components ──────────────────────────────────────────────
const SearchIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
)
const StarIcon = ({ className = 'h-5 w-5', filled = false }: { className?: string; filled?: boolean }) => (
  <svg className={className} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
)
const PinIcon = ({ className = 'h-5 w-5', filled = false }: { className?: string; filled?: boolean }) => (
  <svg className={className} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" /></svg>
)
const PlusIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
)
const XIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
)
const ChevronDownIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
)
const ClockIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
)
const TrendingUpIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
)
const BookIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
)
const AlertIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
)
const LightbulbIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6" /><path d="M10 22h4" /><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" /></svg>
)
const FormulaIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" /></svg>
)

// ─── Types ────────────────────────────────────────────────────────────────────
type FilterTab = 'all' | 'favorites' | 'pinned' | 'recent' | 'used'

interface UserFormulaState {
  favorites: Record<string, boolean>
  pinned: Record<string, boolean>
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="glass-card p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-5 w-2/3 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-5 w-5 rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>
      <div className="h-8 w-full rounded bg-neutral-200 dark:bg-neutral-800 mb-3" />
      <div className="flex gap-2">
        <div className="h-5 w-16 rounded-full bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-5 w-20 rounded-full bg-neutral-200 dark:bg-neutral-800" />
      </div>
    </div>
  )
}

// ─── Formula Card ──────────────────────────────────────────────────────────────
interface FormulaCardProps {
  entry: FormulaEntry
  isFavorite: boolean
  isPinned: boolean
  onToggleFavorite: () => void
  onTogglePin: () => void
  onOpen: () => void
}

function FormulaCard({ entry, isFavorite, isPinned, onToggleFavorite, onTogglePin, onOpen }: FormulaCardProps) {
  return (
    <div className="glass-card p-5 flex flex-col gap-3 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <button onClick={onOpen} className="text-left flex-1 min-w-0">
          <h3 className="font-semibold text-neutral-900 dark:text-white text-sm leading-snug line-clamp-2 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
            {entry.name}
          </h3>
        </button>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onToggleFavorite}
            className={`p-1.5 rounded-lg transition-colors ${isFavorite ? 'text-warning-500 hover:bg-warning-50 dark:hover:bg-warning-950/30' : 'text-neutral-400 hover:text-warning-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
            aria-label="Toggle favorite"
          >
            <StarIcon className="h-4 w-4" filled={isFavorite} />
          </button>
          <button
            onClick={onTogglePin}
            className={`p-1.5 rounded-lg transition-colors ${isPinned ? 'text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/30' : 'text-neutral-400 hover:text-primary-600 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
            aria-label="Toggle pin"
          >
            <PinIcon className="h-4 w-4" filled={isPinned} />
          </button>
        </div>
      </div>
      <button onClick={onOpen} className="text-left">
        <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2.5 overflow-x-auto">
          <SmartFormula value={entry.formula} className="text-sm" displayMode={false} />
        </div>
      </button>
      <div className="flex flex-wrap gap-1.5">
        <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-950/40 dark:text-primary-400">{entry.subject}</span>
        <span className="badge bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">{entry.chapter}</span>
        <span className="badge bg-accent-100 text-accent-700 dark:bg-accent-950/40 dark:text-accent-400">{entry.exam}</span>
      </div>
    </div>
  )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
interface DetailModalProps {
  entry: FormulaEntry | null
  isFavorite: boolean
  isPinned: boolean
  onToggleFavorite: () => void
  onTogglePin: () => void
  onClose: () => void
}

function DetailModal({ entry, isFavorite, isPinned, onToggleFavorite, onTogglePin, onClose }: DetailModalProps) {
  if (!entry) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-card p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{entry.name}</h2>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-950/40 dark:text-primary-400">{entry.subject}</span>
              <span className="badge bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">{entry.chapter}</span>
              <span className="badge bg-accent-100 text-accent-700 dark:bg-accent-950/40 dark:text-accent-400">{entry.exam}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onToggleFavorite}
              className={`btn-ghost p-2 ${isFavorite ? 'text-warning-500' : ''}`}
              aria-label="Toggle favorite"
            >
              <StarIcon className="h-5 w-5" filled={isFavorite} />
            </button>
            <button
              onClick={onTogglePin}
              className={`btn-ghost p-2 ${isPinned ? 'text-primary-600 dark:text-primary-400' : ''}`}
              aria-label="Toggle pin"
            >
              <PinIcon className="h-5 w-5" filled={isPinned} />
            </button>
            <button onClick={onClose} className="btn-ghost p-2" aria-label="Close">
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-primary-50 dark:bg-primary-950/30 px-4 py-3 mb-5 overflow-x-auto">
          <SmartFormula value={entry.formula} className="text-lg" displayMode={true} />
        </div>

        <div className="space-y-4">
          {entry.variables.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 flex items-center gap-1.5">
                <FormulaIcon className="h-4 w-4" /> Variables
              </h4>
              <div className="space-y-1.5">
                {entry.variables.map((v, i) => (
                  <div key={i} className="flex items-baseline gap-2 text-sm">
                    <span className="font-mono font-semibold text-primary-600 dark:text-primary-400 min-w-[60px]">{v.symbol}</span>
                    <span className="text-neutral-600 dark:text-neutral-400 flex-1">{v.meaning}</span>
                    <span className="text-xs text-neutral-400">{v.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <BookIcon className="h-4 w-4" /> Notes
            </h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{entry.notes}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <AlertIcon className="h-4 w-4 text-error-500" /> Common Mistakes
            </h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{entry.commonMistakes}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <LightbulbIcon className="h-4 w-4 text-warning-500" /> Tricks
            </h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{entry.tricks}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">When to Use</h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{entry.whenToUse}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Example</h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 font-mono bg-neutral-50 dark:bg-neutral-800/50 rounded-lg px-3 py-2">{entry.example}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Add Formula Modal ─────────────────────────────────────────────────────────
interface AddFormulaModalProps {
  open: boolean
  onClose: () => void
  onAdd: (data: { name: string; formula: string; subject: string; chapter: string; exam: string; notes: string }) => void
}

function AddFormulaModal({ open, onClose, onAdd }: AddFormulaModalProps) {
  const [name, setName] = useState('')
  const [formula, setFormula] = useState('')
  const [subject, setSubject] = useState('')
  const [chapter, setChapter] = useState('')
  const [exam, setExam] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) {
      setName(''); setFormula(''); setSubject(''); setChapter(''); setExam(''); setNotes('')
    }
  }, [open])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !formula.trim()) return
    onAdd({ name: name.trim(), formula: formula.trim(), subject: subject.trim() || 'General', chapter: chapter.trim() || 'Custom', exam: exam.trim() || 'General', notes: notes.trim() })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-card p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Add Custom Formula</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><XIcon className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Name *</label>
            <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Quadratic Formula" autoFocus />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Formula *</label>
            <input className="input-field font-mono" value={formula} onChange={(e) => setFormula(e.target.value)} placeholder="e.g. x = (-b ± √(b²-4ac)) / 2a" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Subject</label>
              <input className="input-field" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Physics" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Chapter</label>
              <input className="input-field" value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="e.g. Kinematics" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Exam</label>
            <input className="input-field" value={exam} onChange={(e) => setExam(e.target.value)} placeholder="e.g. JEE Main" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Notes</label>
            <textarea className="input-field min-h-[80px] resize-y" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Add Formula</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function FormulaVault() {
  const { user } = useAuth()
  const { showToast } = useToast()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 250)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [examFilter, setExamFilter] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [chapterFilter, setChapterFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [detailEntry, setDetailEntry] = useState<FormulaEntry | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [customFormulas, setCustomFormulas] = useState<FormulaEntry[]>([])

  const [formulaState, setFormulaState] = useLocalStorage<UserFormulaState>(`formula_state_${user?.id ?? 'anon'}`, {
    favorites: {},
    pinned: {},
  })
  const [recentlyViewed, setRecentlyViewed] = useLocalStorage<string[]>(`formula_recent_${user?.id ?? 'anon'}`, [])
  const [mostUsed, setMostUsed] = useLocalStorage<Record<string, number>>(`formula_used_${user?.id ?? 'anon'}`, {})

  // ─── Load user's custom formulas from Supabase ──────────────────────────────
  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data, error } = await supabase.from('formulas').select('*').eq('user_id', user!.id)
      if (!cancelled && !error && data) {
        const custom: FormulaEntry[] = (data as Formula[]).map((f) => ({
          id: f.id,
          exam: f.exam || 'General',
          subject: f.subject,
          chapter: f.chapter,
          name: f.name,
          formula: f.formula,
          variables: [],
          notes: f.notes || '',
          commonMistakes: '',
          tricks: '',
          whenToUse: '',
          example: '',
        }))
        setCustomFormulas(custom)
        // Hydrate favorites/pinned from DB
        const favs: Record<string, boolean> = {}
        const pins: Record<string, boolean> = {}
        for (const f of data as Formula[]) {
          if (f.is_favorite) favs[f.id] = true
          if (f.is_pinned) pins[f.id] = true
        }
        setFormulaState((prev) => ({ favorites: { ...prev.favorites, ...favs }, pinned: { ...prev.pinned, ...pins } }))
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user?.id])

  // ─── All formulas (built-in + custom) ───────────────────────────────────────
  const allFormulas = useMemo(() => [...FORMULA_DB, ...customFormulas], [customFormulas])

  // ─── Dropdown options ───────────────────────────────────────────────────────
  const exams = useMemo(() => getExamsFromFormulas(), [])
  const subjects = useMemo(() => getSubjectsFromFormulas(examFilter || undefined), [examFilter])
  const chapters = useMemo(() => getChaptersFromFormulas(examFilter || undefined, subjectFilter || undefined), [examFilter, subjectFilter])

  // ─── Search results ─────────────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    const filters: Record<string, string | undefined> = {}
    if (examFilter) filters.exam = examFilter
    if (subjectFilter) filters.subject = subjectFilter
    if (chapterFilter) filters.chapter = chapterFilter

    // If no query but filters are set, filter allFormulas directly
    if (!debouncedSearch.trim() && (examFilter || subjectFilter || chapterFilter)) {
      return allFormulas
        .filter((f) => (!examFilter || f.exam === examFilter) && (!subjectFilter || f.subject === subjectFilter) && (!chapterFilter || f.chapter === chapterFilter))
        .map((formula) => ({ formula, score: 0 }))
    }

    // Include custom formulas in the search by running searchFormulas on built-in,
    // then manually matching custom ones
    const builtInResults = searchFormulas(debouncedSearch, filters as { exam?: string; subject?: string; chapter?: string })
    const builtInIds = new Set(builtInResults.map((r) => r.formula.id))

    const customResults = allFormulas
      .filter((f) => !builtInIds.has(f.id))
      .filter((f) => {
        if (examFilter && f.exam !== examFilter) return false
        if (subjectFilter && f.subject !== subjectFilter) return false
        if (chapterFilter && f.chapter !== chapterFilter) return false
        return true
      })
      .map((formula) => ({ formula, score: 0 }))

    return [...builtInResults, ...customResults]
  }, [debouncedSearch, examFilter, subjectFilter, chapterFilter, allFormulas])

  // ─── Filtered by tab ────────────────────────────────────────────────────────
  const filteredResults = useMemo(() => {
    let results = searchResults
    if (activeTab === 'favorites') {
      results = results.filter((r) => formulaState.favorites[r.formula.id])
    } else if (activeTab === 'pinned') {
      results = results.filter((r) => formulaState.pinned[r.formula.id])
    } else if (activeTab === 'recent') {
      const recentSet = new Set(recentlyViewed)
      results = results.filter((r) => recentSet.has(r.formula.id))
      // Sort by recency
      results.sort((a, b) => recentlyViewed.indexOf(b.formula.id) - recentlyViewed.indexOf(a.formula.id))
    } else if (activeTab === 'used') {
      results = results.filter((r) => (mostUsed[r.formula.id] || 0) > 0)
      results.sort((a, b) => (mostUsed[b.formula.id] || 0) - (mostUsed[a.formula.id] || 0))
    }
    return results
  }, [searchResults, activeTab, formulaState, recentlyViewed, mostUsed])

  // ─── Toggle favorite/pin ─────────────────────────────────────────────────────
  const toggleFavorite = useCallback(async (id: string) => {
    setFormulaState((prev) => {
      const newVal = !prev.favorites[id]
      return { ...prev, favorites: { ...prev.favorites, [id]: newVal } }
    })
    const isCustom = customFormulas.some((f) => f.id === id)
    if (isCustom && user?.id) {
      const newVal = !formulaState.favorites[id]
      await supabase.from('formulas').update({ is_favorite: newVal }).eq('id', id).eq('user_id', user.id)
    }
  }, [customFormulas, user?.id, formulaState, setFormulaState])

  const togglePin = useCallback(async (id: string) => {
    setFormulaState((prev) => {
      const newVal = !prev.pinned[id]
      return { ...prev, pinned: { ...prev.pinned, [id]: newVal } }
    })
    const isCustom = customFormulas.some((f) => f.id === id)
    if (isCustom && user?.id) {
      const newVal = !formulaState.pinned[id]
      await supabase.from('formulas').update({ is_pinned: newVal }).eq('id', id).eq('user_id', user.id)
    }
  }, [customFormulas, user?.id, formulaState, setFormulaState])

  // ─── Track recently viewed & most used ──────────────────────────────────────
  const trackView = useCallback((id: string) => {
    setRecentlyViewed((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, 20))
    setMostUsed((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
  }, [setRecentlyViewed, setMostUsed])

  // ─── Open detail ────────────────────────────────────────────────────────────
  const openDetail = useCallback((entry: FormulaEntry) => {
    setDetailEntry(entry)
    trackView(entry.id)
  }, [trackView])

  // ─── Add custom formula ──────────────────────────────────────────────────────
  const handleAddFormula = useCallback(async (data: { name: string; formula: string; subject: string; chapter: string; exam: string; notes: string }) => {
    if (!user?.id) {
      showToast('Please sign in to save formulas', 'warning')
      return
    }
    const id = crypto.randomUUID()
    const { error } = await supabase.from('formulas').insert({
      id,
      user_id: user.id,
      name: data.name,
      formula: data.formula,
      subject: data.subject,
      chapter: data.chapter,
      exam: data.exam,
      notes: data.notes,
      is_favorite: false,
      is_pinned: false,
      view_count: 0,
    })
    if (error) {
      showToast('Failed to add formula', 'error')
      return
    }
    const newEntry: FormulaEntry = {
      id, exam: data.exam, subject: data.subject, chapter: data.chapter,
      name: data.name, formula: data.formula, variables: [], notes: data.notes,
      commonMistakes: '', tricks: '', whenToUse: '', example: '',
    }
    setCustomFormulas((prev) => [...prev, newEntry])
    setAddOpen(false)
    showToast('Formula added!', 'success')
  }, [user?.id, showToast])

  // ─── Reset dependent filters ────────────────────────────────────────────────
  const handleExamChange = (val: string) => { setExamFilter(val); setSubjectFilter(''); setChapterFilter('') }
  const handleSubjectChange = (val: string) => { setSubjectFilter(val); setChapterFilter('') }

  const tabs: { key: FilterTab; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All', icon: <BookIcon className="h-4 w-4" /> },
    { key: 'favorites', label: 'Favorites', icon: <StarIcon className="h-4 w-4" /> },
    { key: 'pinned', label: 'Pinned', icon: <PinIcon className="h-4 w-4" /> },
    { key: 'recent', label: 'Recently Viewed', icon: <ClockIcon className="h-4 w-4" /> },
    { key: 'used', label: 'Most Used', icon: <TrendingUpIcon className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Formula Vault</h1>
          <p className="text-sm text-neutral-500 mt-1">Instant search across {allFormulas.length} formulas</p>
        </div>
        <button onClick={() => setAddOpen(true)} className="btn-primary text-sm">
          <PlusIcon className="h-4 w-4" /> Add Formula
        </button>
      </div>

      {/* Search Bar */}
      <div className="glass-card p-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
          <input
            className="input-field pl-11"
            placeholder="Search by name, formula, variable, topic, chapter, subject, or exam..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
              <XIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          <div className="relative">
            <select className="input-field appearance-none pr-10" value={examFilter} onChange={(e) => handleExamChange(e.target.value)}>
              <option value="">All Exams</option>
              {exams.map((ex) => <option key={ex} value={ex}>{ex}</option>)}
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select className="input-field appearance-none pr-10" value={subjectFilter} onChange={(e) => handleSubjectChange(e.target.value)} disabled={!examFilter && exams.length > 0}>
              <option value="">All Subjects</option>
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select className="input-field appearance-none pr-10" value={chapterFilter} onChange={(e) => setChapterFilter(e.target.value)} disabled={!subjectFilter}>
              <option value="">All Chapters</option>
              {chapters.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
          <SearchIcon className="h-12 w-12 text-neutral-300 dark:text-neutral-700 mb-3" />
          <h3 className="text-base font-semibold text-neutral-700 dark:text-neutral-300 mb-1">No formulas found</h3>
          <p className="text-sm text-neutral-500">
            {debouncedSearch ? `No results for "${debouncedSearch}"` : 'Try adjusting your filters or add a custom formula'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-neutral-500">{filteredResults.length} formula{filteredResults.length !== 1 ? 's' : ''}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResults.map(({ formula }) => (
              <FormulaCard
                key={formula.id}
                entry={formula}
                isFavorite={!!formulaState.favorites[formula.id]}
                isPinned={!!formulaState.pinned[formula.id]}
                onToggleFavorite={() => toggleFavorite(formula.id)}
                onTogglePin={() => togglePin(formula.id)}
                onOpen={() => openDetail(formula)}
              />
            ))}
          </div>
        </>
      )}

      {/* Detail Modal */}
      <DetailModal
        entry={detailEntry}
        isFavorite={detailEntry ? !!formulaState.favorites[detailEntry.id] : false}
        isPinned={detailEntry ? !!formulaState.pinned[detailEntry.id] : false}
        onToggleFavorite={() => detailEntry && toggleFavorite(detailEntry.id)}
        onTogglePin={() => detailEntry && togglePin(detailEntry.id)}
        onClose={() => setDetailEntry(null)}
      />

      {/* Add Formula Modal */}
      <AddFormulaModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAddFormula} />
    </div>
  )
}
