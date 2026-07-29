import { useState } from 'react'
import { supabase } from '../supabase'
import type { BacklogItem, Module } from '../supabase'

const PRIORITIES = {
  high: { label: 'High', color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  low: { label: 'Low', color: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' },
}

const STATUSES = {
  todo: { label: 'To Do', color: 'bg-gray-50 border-gray-200' },
  doing: { label: 'In Progress', color: 'bg-brand-50 border-brand-200' },
  done: { label: 'Done', color: 'bg-green-50 border-green-200' },
}

type Status = 'todo' | 'doing' | 'done'

export default function BacklogPlanner({ items, modules, refresh }: { items: BacklogItem[]; modules: Module[]; refresh: () => Promise<void> }) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [moduleId, setModuleId] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [dueDate, setDueDate] = useState('')

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    await supabase.from('backlog_items').insert({
      title: title.trim(),
      module_id: moduleId || null,
      priority,
      due_date: dueDate || null,
    })
    setTitle(''); setModuleId(''); setPriority('medium'); setDueDate(''); setShowForm(false)
    refresh()
  }

  const moveItem = async (item: BacklogItem, direction: 'left' | 'right') => {
    const order: Status[] = ['todo', 'doing', 'done']
    const idx = order.indexOf(item.status)
    const newStatus = direction === 'right' ? order[Math.min(idx + 1, 2)] : order[Math.max(idx - 1, 0)]
    await supabase.from('backlog_items').update({ status: newStatus }).eq('id', item.id)
    refresh()
  }

  const deleteItem = async (id: string) => {
    await supabase.from('backlog_items').delete().eq('id', id)
    refresh()
  }

  const columns: Status[] = ['todo', 'doing', 'done']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Backlog Planner</h2>
          <p className="text-sm text-gray-500 mt-1">Plan and track your study tasks across stages</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 bg-brand-600 text-white rounded-xl font-medium text-sm hover:bg-brand-700 transition-colors">
          {showForm ? 'Cancel' : '+ Add Task'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={addItem} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4 animate-fade-in">
          <h3 className="font-semibold text-gray-800">New Task</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Task Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Review sorting algorithms"
                className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-brand-500 focus:outline-none text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Module (optional)</label>
              <select value={moduleId} onChange={(e) => setModuleId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-brand-500 focus:outline-none text-sm bg-white">
                <option value="">No module</option>
                {modules.map((m) => <option key={m.id} value={m.id}>{m.name}{m.code ? ` (${m.code})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-brand-500 focus:outline-none text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Priority</label>
              <div className="flex gap-2">
                {(['high', 'medium', 'low'] as const).map((p) => (
                  <button key={p} type="button" onClick={() => setPriority(p)}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${priority === p ? PRIORITIES[p].color : 'border-gray-200 text-gray-500'}`}>
                    <span className={`w-2 h-2 rounded-full ${PRIORITIES[p].dot}`} />
                    {PRIORITIES[p].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button type="submit" className="w-full bg-brand-600 text-white rounded-xl py-3 font-semibold hover:bg-brand-700 transition-colors">Add Task</button>
        </form>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        {columns.map((col) => {
          const colItems = items.filter((i) => i.status === col)
          return (
            <div key={col} className={`rounded-2xl border-2 ${STATUSES[col].color} p-4 min-h-[200px]`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">{STATUSES[col].label}</h3>
                <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">{colItems.length}</span>
              </div>
              <div className="space-y-2">
                {colItems.map((item) => {
                  const p = PRIORITIES[item.priority]
                  const mod = modules.find((m) => m.id === item.module_id)
                  return (
                    <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm group">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-medium text-gray-800 flex-1">{item.title}</p>
                        <button onClick={() => deleteItem(item.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${p.color} flex items-center gap-1`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />{p.label}
                        </span>
                        {mod && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{mod.code || mod.name}</span>}
                        {item.due_date && <span className="text-xs text-gray-500">{new Date(item.due_date).toLocaleDateString()}</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveItem(item, 'left')} disabled={col === 'todo'}
                          className="flex-1 py-1 rounded-lg bg-gray-50 text-gray-500 text-xs font-medium hover:bg-gray-100 disabled:opacity-30 transition-colors">←</button>
                        <button onClick={() => moveItem(item, 'right')} disabled={col === 'done'}
                          className="flex-1 py-1 rounded-lg bg-gray-50 text-gray-500 text-xs font-medium hover:bg-gray-100 disabled:opacity-30 transition-colors">→</button>
                      </div>
                    </div>
                  )
                })}
                {colItems.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No tasks</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
