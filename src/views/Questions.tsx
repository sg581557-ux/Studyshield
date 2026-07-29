import { useState } from 'react'
import { supabase } from '../supabase'
import type { Question, Module } from '../supabase'

const DIFFICULTIES = {
  easy: { label: 'Easy', color: 'bg-green-100 text-green-700 border-green-200' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  hard: { label: 'Hard', color: 'bg-red-100 text-red-700 border-red-200' },
}

const Q_STATUSES = {
  unanswered: { label: 'Unanswered', color: 'bg-gray-100 text-gray-600' },
  answered: { label: 'Answered', color: 'bg-green-100 text-green-700' },
  reviewing: { label: 'Reviewing', color: 'bg-brand-100 text-brand-700' },
}

export default function Questions({ questions, modules, refresh }: { questions: Question[]; modules: Module[]; refresh: () => Promise<void> }) {
  const [showForm, setShowForm] = useState(false)
  const [question, setQuestion] = useState('')
  const [moduleId, setModuleId] = useState('')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [answerText, setAnswerText] = useState('')

  const addQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return
    await supabase.from('questions').insert({
      question: question.trim(),
      module_id: moduleId || null,
      difficulty,
    })
    setQuestion(''); setModuleId(''); setDifficulty('medium'); setShowForm(false)
    refresh()
  }

  const saveAnswer = async (q: Question) => {
    await supabase.from('questions').update({ answer: answerText, status: 'answered' }).eq('id', q.id)
    setExpandedId(null); setAnswerText('')
    refresh()
  }

  const setStatus = async (q: Question, status: 'unanswered' | 'answered' | 'reviewing') => {
    await supabase.from('questions').update({ status }).eq('id', q.id)
    refresh()
  }

  const deleteQuestion = async (id: string) => {
    await supabase.from('questions').delete().eq('id', id)
    refresh()
  }

  const expand = (q: Question) => {
    if (expandedId === q.id) { setExpandedId(null); setAnswerText('') }
    else { setExpandedId(q.id); setAnswerText(q.answer || '') }
  }

  const counts = {
    unanswered: questions.filter((q) => q.status === 'unanswered').length,
    answered: questions.filter((q) => q.status === 'answered').length,
    reviewing: questions.filter((q) => q.status === 'reviewing').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Questions</h2>
          <p className="text-sm text-gray-500 mt-1">Track questions and write answers for each module</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 bg-brand-600 text-white rounded-xl font-medium text-sm hover:bg-brand-700 transition-colors">
          {showForm ? 'Cancel' : '+ Add Question'}
        </button>
      </div>

      {/* Summary */}
      {questions.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {(['unanswered', 'answered', 'reviewing'] as const).map((s) => (
            <div key={s} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{counts[s]}</p>
              <p className="text-xs text-gray-500 mt-0.5">{Q_STATUSES[s].label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={addQuestion} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4 animate-fade-in">
          <h3 className="font-semibold text-gray-800">New Question</h3>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Question</label>
            <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} placeholder="e.g. What is the time complexity of quicksort?"
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-brand-500 focus:outline-none text-sm resize-none" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Module (optional)</label>
              <select value={moduleId} onChange={(e) => setModuleId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-brand-500 focus:outline-none text-sm bg-white">
                <option value="">No module</option>
                {modules.map((m) => <option key={m.id} value={m.id}>{m.name}{m.code ? ` (${m.code})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Difficulty</label>
              <div className="flex gap-2">
                {(['easy', 'medium', 'hard'] as const).map((d) => (
                  <button key={d} type="button" onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${difficulty === d ? DIFFICULTIES[d].color : 'border-gray-200 text-gray-500'}`}>
                    {DIFFICULTIES[d].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button type="submit" className="w-full bg-brand-600 text-white rounded-xl py-3 font-semibold hover:bg-brand-700 transition-colors">Add Question</button>
        </form>
      )}

      {/* Question list */}
      {questions.length === 0 && !showForm ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.209 0 4 1.791 4 4 0 .764-.214 1.481-.588 2.095M9 13h6m-3-8v1m0 6v1m-6 0h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-500 font-medium">No questions yet</p>
          <p className="text-sm text-gray-400 mt-1">Click "Add Question" to start building your question bank</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => {
            const d = DIFFICULTIES[q.difficulty]
            const s = Q_STATUSES[q.status]
            const mod = modules.find((m) => m.id === q.module_id)
            const isExpanded = expandedId === q.id
            return (
              <div key={q.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden group">
                <div className="p-4 cursor-pointer" onClick={() => expand(q)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{q.question}</p>
                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${d.color}`}>{d.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                        {mod && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{mod.code || mod.name}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); deleteQuestion(q.id) }} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                      <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                  {q.answer && !isExpanded && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2 bg-gray-50 rounded-lg p-2">{q.answer}</p>
                  )}
                </div>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3 animate-fade-in">
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Answer</label>
                    <textarea value={answerText} onChange={(e) => setAnswerText(e.target.value)} rows={4}
                      placeholder="Write your answer here..."
                      className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-brand-500 focus:outline-none text-sm resize-none mb-3" />
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => saveAnswer(q)} className="px-4 py-2 bg-brand-600 text-white rounded-xl font-medium text-sm hover:bg-brand-700 transition-colors">Save Answer</button>
                      <button onClick={() => setStatus(q, 'reviewing')} className="px-3 py-2 bg-brand-50 text-brand-700 rounded-xl font-medium text-sm hover:bg-brand-100 transition-colors">Mark Reviewing</button>
                      <button onClick={() => setStatus(q, 'unanswered')} className="px-3 py-2 bg-gray-50 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-100 transition-colors">Mark Unanswered</button>
                    </div>
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
