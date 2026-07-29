import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/toast'
import type { Todo } from '../lib/types'

// ─── Inline SVG Icon Components ──────────────────────────────────────────────
const PlusIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
)
const XIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
)
const CheckIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
)
const TrashIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
)
const EditIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
)
const ChevronDownIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
)
const ClockIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
)
const AlertCircleIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
)
const CheckSquareIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
)
const ListIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
)

// ─── Constants ───────────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  low: { label: 'Low', dot: 'bg-neutral-400', badge: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400' },
  medium: { label: 'Medium', dot: 'bg-warning-500', badge: 'bg-warning-100 text-warning-700 dark:bg-warning-950/40 dark:text-warning-400' },
  high: { label: 'High', dot: 'bg-error-500', badge: 'bg-error-100 text-error-700 dark:bg-error-950/40 dark:text-error-400' },
} as const

const STATUS_CONFIG = {
  'pending': { label: 'Pending', badge: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400' },
  'in-progress': { label: 'In Progress', badge: 'bg-primary-100 text-primary-700 dark:bg-primary-950/40 dark:text-primary-400' },
  'completed': { label: 'Completed', badge: 'bg-success-100 text-success-700 dark:bg-success-950/40 dark:text-success-400' },
} as const

type Priority = keyof typeof PRIORITY_CONFIG
type Status = keyof typeof STATUS_CONFIG
type SortBy = 'due_date' | 'priority' | 'created_at'

const PRIORITY_WEIGHT: Record<Priority, number> = { high: 3, medium: 2, low: 1 }

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 animate-pulse">
      <div className="h-5 w-5 rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-2/3 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-3 w-1/3 rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>
      <div className="h-5 w-16 rounded-full bg-neutral-200 dark:bg-neutral-800" />
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="glass-card p-4">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent} mb-2`}>{icon}</div>
      <p className="text-2xl font-bold text-neutral-900 dark:text-white">{value}</p>
      <p className="text-xs text-neutral-500 mt-0.5">{label}</p>
    </div>
  )
}

// ─── Todo Modal ────────────────────────────────────────────────────────────────
interface TodoModalProps {
  open: boolean
  editing: Todo | null
  onClose: () => void
  onSave: (data: { title: string; description: string; priority: Priority; status: Status; due_date: string | null; tags: string[] }) => void
}

function TodoModal({ open, editing, onClose, onSave }: TodoModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [status, setStatus] = useState<Status>('pending')
  const [dueDate, setDueDate] = useState('')
  const [tags, setTags] = useState('')

  useEffect(() => {
    if (open) {
      if (editing) {
        setTitle(editing.title)
        setDescription(editing.description || '')
        setPriority(editing.priority)
        setStatus(editing.status)
        setDueDate(editing.due_date ? editing.due_date.split('T')[0] : '')
        setTags(editing.tags?.join(', ') || '')
      } else {
        setTitle(''); setDescription(''); setPriority('medium'); setStatus('pending'); setDueDate(''); setTags('')
      }
    }
  }, [open, editing])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const tagArr = tags.split(',').map((t) => t.trim()).filter(Boolean)
    onSave({
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      due_date: dueDate || null,
      tags: tagArr,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-card p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">{editing ? 'Edit Todo' : 'Add Todo'}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><XIcon className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Title *</label>
            <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" autoFocus />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Description</label>
            <textarea className="input-field min-h-[70px] resize-y" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add details..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Priority</label>
              <div className="relative">
                <select className="input-field appearance-none pr-10" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Status</label>
              <div className="relative">
                <select className="input-field appearance-none pr-10" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
                <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Due Date</label>
            <input type="date" className="input-field" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Tags (comma-separated)</label>
            <input className="input-field" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="revision, important" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editing ? 'Save Changes' : 'Add Todo'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────────
function isOverdue(dueDate: string | null, status: Status): boolean {
  if (!dueDate || status === 'completed') return false
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due < today
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function TodoManager() {
  const { user } = useAuth()
  const { showToast } = useToast()

  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Todo | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('')
  const [statusFilter, setStatusFilter] = useState<Status | ''>('')
  const [sortBy, setSortBy] = useState<SortBy>('created_at')

  // ─── Fetch todos ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    let cancelled = false
    async function fetch() {
      setLoading(true)
      const { data, error } = await supabase.from('todos').select('*').eq('user_id', user!.id).order('created_at', { ascending: false })
      if (!cancelled && !error && data) setTodos(data as Todo[])
      if (!cancelled) setLoading(false)
    }
    fetch()
    return () => { cancelled = true }
  }, [user?.id])

  // ─── Stats ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = todos.length
    const pending = todos.filter((t) => t.status === 'pending').length
    const inProgress = todos.filter((t) => t.status === 'in-progress').length
    const completed = todos.filter((t) => t.status === 'completed').length
    return { total, pending, inProgress, completed }
  }, [todos])

  // ─── Filtered + sorted todos ─────────────────────────────────────────────────
  const filteredTodos = useMemo(() => {
    let result = [...todos]
    if (priorityFilter) result = result.filter((t) => t.priority === priorityFilter)
    if (statusFilter) result = result.filter((t) => t.status === statusFilter)
    result.sort((a, b) => {
      if (sortBy === 'due_date') {
        const aDate = a.due_date ? new Date(a.due_date).getTime() : Infinity
        const bDate = b.due_date ? new Date(b.due_date).getTime() : Infinity
        return aDate - bDate
      }
      if (sortBy === 'priority') {
        return PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]
      }
      // created_at desc
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    return result
  }, [todos, priorityFilter, statusFilter, sortBy])

  // ─── Add / Edit todo ──────────────────────────────────────────────────────────
  const handleSave = async (data: { title: string; description: string; priority: Priority; status: Status; due_date: string | null; tags: string[] }) => {
    if (!user?.id) { showToast('Please sign in to manage todos', 'warning'); return }
    if (editing) {
      const { error } = await supabase.from('todos').update({
        title: data.title,
        description: data.description || null,
        priority: data.priority,
        status: data.status,
        due_date: data.due_date,
        tags: data.tags,
      }).eq('id', editing.id).eq('user_id', user.id)
      if (error) { showToast('Failed to update todo', 'error'); return }
      setTodos((prev) => prev.map((t) => t.id === editing.id ? { ...t, ...data, description: data.description || null, tags: data.tags } : t))
      showToast('Todo updated!', 'success')
    } else {
      const { data: inserted, error } = await supabase.from('todos').insert({
        user_id: user.id,
        title: data.title,
        description: data.description || null,
        priority: data.priority,
        status: data.status,
        due_date: data.due_date,
        tags: data.tags,
      }).select('*').single()
      if (error) { showToast('Failed to add todo', 'error'); return }
      if (inserted) setTodos((prev) => [inserted as Todo, ...prev])
      showToast('Todo added!', 'success')
    }
    setModalOpen(false)
    setEditing(null)
  }

  // ─── Delete todo ──────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('todos').delete().eq('id', id).eq('user_id', user?.id ?? '')
    if (error) { showToast('Failed to delete todo', 'error'); return }
    setTodos((prev) => prev.filter((t) => t.id !== id))
    showToast('Todo deleted', 'success')
  }

  // ─── Quick complete toggle ────────────────────────────────────────────────────
  const toggleComplete = async (todo: Todo) => {
    const newStatus: Status = todo.status === 'completed' ? 'pending' : 'completed'
    const { error } = await supabase.from('todos').update({ status: newStatus }).eq('id', todo.id).eq('user_id', user?.id ?? '')
    if (error) { showToast('Failed to update status', 'error'); return }
    setTodos((prev) => prev.map((t) => t.id === todo.id ? { ...t, status: newStatus } : t))
    showToast(newStatus === 'completed' ? 'Todo completed! 🎉' : 'Todo reopened', 'success')
  }

  const openAdd = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (todo: Todo) => { setEditing(todo); setModalOpen(true) }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Todo Manager</h1>
          <p className="text-sm text-neutral-500 mt-1">Stay on top of your tasks</p>
        </div>
        <button onClick={openAdd} className="btn-primary text-sm">
          <PlusIcon className="h-4 w-4" /> Add Todo
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="glass-card p-4 animate-pulse"><div className="h-9 w-9 rounded-lg bg-neutral-200 dark:bg-neutral-800 mb-2" /><div className="h-7 w-16 rounded bg-neutral-200 dark:bg-neutral-800 mb-1" /><div className="h-3 w-12 rounded bg-neutral-200 dark:bg-neutral-800" /></div>)
        ) : (
          <>
            <StatCard icon={<ListIcon className="h-5 w-5 text-white" />} label="Total" value={String(stats.total)} accent="bg-primary-600" />
            <StatCard icon={<ClockIcon className="h-5 w-5 text-white" />} label="Pending" value={String(stats.pending)} accent="bg-warning-500" />
            <StatCard icon={<EditIcon className="h-5 w-5 text-white" />} label="In Progress" value={String(stats.inProgress)} accent="bg-accent-500" />
            <StatCard icon={<CheckSquareIcon className="h-5 w-5 text-white" />} label="Completed" value={String(stats.completed)} accent="bg-success-600" />
          </>
        )}
      </div>

      {/* Filters + Sort */}
      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <select className="input-field appearance-none pr-10" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as Priority | '')}>
              <option value="">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
          </div>
          <div className="relative flex-1">
            <select className="input-field appearance-none pr-10" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as Status | '')}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
          </div>
          <div className="relative flex-1">
            <select className="input-field appearance-none pr-10" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
              <option value="created_at">Sort: Newest</option>
              <option value="due_date">Sort: Due Date</option>
              <option value="priority">Sort: Priority</option>
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Todo List */}
      {loading ? (
        <div className="glass-card divide-y divide-neutral-100 dark:divide-neutral-800">
          {Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)}
        </div>
      ) : filteredTodos.length === 0 ? (
        <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
          <CheckSquareIcon className="h-12 w-12 text-neutral-300 dark:text-neutral-700 mb-3" />
          <h3 className="text-base font-semibold text-neutral-700 dark:text-neutral-300 mb-1">No todos found</h3>
          <p className="text-sm text-neutral-500">
            {priorityFilter || statusFilter ? 'Try adjusting your filters' : 'Add your first todo to get started'}
          </p>
        </div>
      ) : (
        <div className="glass-card divide-y divide-neutral-100 dark:divide-neutral-800">
          {filteredTodos.map((todo) => {
            const overdue = isOverdue(todo.due_date, todo.status)
            const isCompleted = todo.status === 'completed'
            return (
              <div key={todo.id} className="flex items-start gap-3 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                {/* Quick complete toggle */}
                <button
                  onClick={() => toggleComplete(todo)}
                  className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors flex-shrink-0 ${
                    isCompleted ? 'bg-success-600 border-success-600 text-white' : 'border-neutral-300 dark:border-neutral-600 hover:border-success-500'
                  }`}
                  aria-label="Toggle complete"
                >
                  {isCompleted && <CheckIcon className="h-3.5 w-3.5" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full flex-shrink-0 ${PRIORITY_CONFIG[todo.priority].dot}`} />
                    <h3 className={`text-sm font-medium truncate ${isCompleted ? 'text-neutral-400 line-through' : 'text-neutral-900 dark:text-white'}`}>
                      {todo.title}
                    </h3>
                  </div>
                  {todo.description && (
                    <p className={`text-xs mt-1 line-clamp-2 ${isCompleted ? 'text-neutral-400' : 'text-neutral-500'}`}>{todo.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className={`badge ${STATUS_CONFIG[todo.status].badge}`}>{STATUS_CONFIG[todo.status].label}</span>
                    <span className={`badge ${PRIORITY_CONFIG[todo.priority].badge}`}>{PRIORITY_CONFIG[todo.priority].label}</span>
                    {todo.due_date && (
                      <span className={`badge ${overdue ? 'bg-error-100 text-error-700 dark:bg-error-950/40 dark:text-error-400' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}`}>
                        {overdue && <AlertCircleIcon className="h-3 w-3 mr-0.5" />}
                        {formatDate(todo.due_date)}
                      </span>
                    )}
                    {todo.tags?.map((tag, i) => (
                      <span key={i} className="badge bg-accent-100 text-accent-700 dark:bg-accent-950/40 dark:text-accent-400">#{tag}</span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(todo)} className="p-1.5 rounded-lg text-neutral-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/30 transition-colors" aria-label="Edit todo">
                    <EditIcon className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(todo.id)} className="p-1.5 rounded-lg text-neutral-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-950/30 transition-colors" aria-label="Delete todo">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <TodoModal open={modalOpen} editing={editing} onClose={() => { setModalOpen(false); setEditing(null) }} onSave={handleSave} />
    </div>
  )
}
