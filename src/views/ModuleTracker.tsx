import { useState } from 'react'
import { supabase } from '../supabase'
import type { Module } from '../supabase'

const COLORS = [
  { name: 'brand', bg: 'bg-brand-500', text: 'text-brand-700', light: 'bg-brand-50', border: 'border-brand-200' },
  { name: 'green', bg: 'bg-green-500', text: 'text-green-700', light: 'bg-green-50', border: 'border-green-200' },
  { name: 'amber', bg: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-50', border: 'border-amber-200' },
  { name: 'rose', bg: 'bg-rose-500', text: 'text-rose-700', light: 'bg-rose-50', border: 'border-rose-200' },
  { name: 'cyan', bg: 'bg-cyan-500', text: 'text-cyan-700', light: 'bg-cyan-50', border: 'border-cyan-200' },
  { name: 'violet', bg: 'bg-violet-500', text: 'text-violet-700', light: 'bg-violet-50', border: 'border-violet-200' },
]

function colorFor(name: string) {
  return COLORS.find((c) => c.name === name) || COLORS[0]
}

export default function ModuleTracker({ modules, refresh }: { modules: Module[]; refresh: () => Promise<void> }) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [totalTopics, setTotalTopics] = useState(10)
  const [color, setColor] = useState('brand')

  const addModule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await supabase.from('modules').insert({
      name: name.trim(),
      code: code.trim() || null,
      total_topics: totalTopics,
      color,
    })
    setName(''); setCode(''); setTotalTopics(10); setColor('brand'); setShowForm(false)
    refresh()
  }

  const updateProgress = async (m: Module, delta: number) => {
    const newCompleted = Math.max(0, Math.min(m.total_topics, m.completed_topics + delta))
    await supabase.from('modules').update({ completed_topics: newCompleted }).eq('id', m.id)
    refresh()
  }

  const deleteModule = async (id: string) => {
    await supabase.from('modules').delete().eq('id', id)
    refresh()
  }

  const totalTopicsAll = modules.reduce((s, m) => s + m.total_topics, 0)
  const completedAll = modules.reduce((s, m) => s + m.completed_topics, 0)
  const overallPct = totalTopicsAll > 0 ? Math.round((completedAll / totalTopicsAll) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Module Tracker</h2>
          <p className="text-sm text-gray-500 mt-1">Track your progress across all modules</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 bg-brand-600 text-white rounded-xl font-medium text-sm hover:bg-brand-700 transition-colors">
          {showForm ? 'Cancel' : '+ Add Module'}
        </button>
      </div>

      {/* Overall progress */}
      {modules.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Overall Progress</h3>
            <span className="text-2xl font-bold text-brand-600">{overallPct}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full transition-all duration-500" style={{ width: `${overallPct}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-2">{completedAll} of {totalTopicsAll} topics completed across {modules.length} modules</p>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={addModule} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4 animate-fade-in">
          <h3 className="font-semibold text-gray-800">New Module</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Module Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Data Structures"
                className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-brand-500 focus:outline-none text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Module Code</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. CS201"
                className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-brand-500 focus:outline-none text-sm" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Total Topics</label>
              <input type="number" min={1} max={200} value={totalTopics} onChange={(e) => setTotalTopics(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-brand-500 focus:outline-none text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Color</label>
              <div className="flex gap-2 pt-1">
                {COLORS.map((c) => (
                  <button key={c.name} type="button" onClick={() => setColor(c.name)}
                    className={`w-8 h-8 rounded-lg ${c.bg} ${color === c.name ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`} />
                ))}
              </div>
            </div>
          </div>
          <button type="submit" className="w-full bg-brand-600 text-white rounded-xl py-3 font-semibold hover:bg-brand-700 transition-colors">
            Create Module
          </button>
        </form>
      )}

      {/* Module cards */}
      {modules.length === 0 && !showForm ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-gray-500 font-medium">No modules yet</p>
          <p className="text-sm text-gray-400 mt-1">Click "Add Module" to start tracking your courses</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m) => {
            const c = colorFor(m.color)
            const pct = m.total_topics > 0 ? Math.round((m.completed_topics / m.total_topics) * 100) : 0
            return (
              <div key={m.id} className={`bg-white rounded-2xl shadow-sm border ${c.border} p-5 group`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${c.bg}`} />
                      <h3 className="font-semibold text-gray-800">{m.name}</h3>
                    </div>
                    {m.code && <p className="text-xs text-gray-400 mt-0.5 ml-5">{m.code}</p>}
                  </div>
                  <button onClick={() => deleteModule(m.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div className={`h-full ${c.bg} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-500">{m.completed_topics} / {m.total_topics} topics</span>
                  <span className={`text-sm font-bold ${c.text}`}>{pct}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateProgress(m, -1)} disabled={m.completed_topics === 0}
                    className="flex-1 py-1.5 rounded-lg bg-gray-50 text-gray-600 text-sm font-medium hover:bg-gray-100 disabled:opacity-40 transition-colors">−</button>
                  <button onClick={() => updateProgress(m, 1)} disabled={m.completed_topics >= m.total_topics}
                    className="flex-1 py-1.5 rounded-lg bg-gray-50 text-gray-600 text-sm font-medium hover:bg-gray-100 disabled:opacity-40 transition-colors">+</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
