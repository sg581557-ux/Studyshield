import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../auth'
import { supabase } from '../supabase'
import type { Module, BacklogItem, Question } from '../supabase'
import ModuleTracker from './ModuleTracker'
import BacklogPlanner from './BacklogPlanner'
import Questions from './Questions'

type Tab = 'modules' | 'backlog' | 'questions'

export default function Dashboard() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('modules')
  const [modules, setModules] = useState<Module[]>([])
  const [backlog, setBacklog] = useState<BacklogItem[]>([])
  const [questions, setQuestions] = useState<Question[]>([])

  const fetchModules = useCallback(async () => {
    const { data } = await supabase.from('modules').select('*').order('created_at', { ascending: false })
    if (data) setModules(data as Module[])
  }, [])

  const fetchBacklog = useCallback(async () => {
    const { data } = await supabase.from('backlog_items').select('*').order('created_at', { ascending: false })
    if (data) setBacklog(data as BacklogItem[])
  }, [])

  const fetchQuestions = useCallback(async () => {
    const { data } = await supabase.from('questions').select('*').order('created_at', { ascending: false })
    if (data) setQuestions(data as Question[])
  }, [])

  useEffect(() => { fetchModules(); fetchBacklog(); fetchQuestions() }, [fetchModules, fetchBacklog, fetchQuestions])

  const signOut = () => supabase.auth.signOut()

  const todoCount = backlog.filter((b) => b.status === 'todo').length
  const doingCount = backlog.filter((b) => b.status === 'doing').length
  const unansweredCount = questions.filter((q) => q.status === 'unanswered').length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-brand-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">StudyShield</h1>
              <p className="text-xs text-gray-400 hidden sm:block">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <nav className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              <NavBtn label="Modules" count={modules.length} tab="modules" current={tab} onClick={setTab} />
              <NavBtn label="Backlog" count={todoCount + doingCount} tab="backlog" current={tab} onClick={setTab} />
              <NavBtn label="Questions" count={unansweredCount} tab="questions" current={tab} onClick={setTab} />
            </nav>
            <button onClick={signOut} className="text-sm text-gray-500 hover:text-red-500 transition-colors px-3 py-2" title="Sign out">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {tab === 'modules' && <ModuleTracker modules={modules} refresh={fetchModules} />}
        {tab === 'backlog' && <BacklogPlanner items={backlog} modules={modules} refresh={fetchBacklog} />}
        {tab === 'questions' && <Questions questions={questions} modules={modules} refresh={fetchQuestions} />}
      </main>
    </div>
  )
}

function NavBtn({ label, count, tab, current, onClick }: { label: string; count: number; tab: Tab; current: Tab; onClick: (t: Tab) => void }) {
  return (
    <button onClick={() => onClick(tab)}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${current === tab ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
      {label}
      {count > 0 && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${current === tab ? 'bg-brand-100 text-brand-700' : 'bg-gray-200 text-gray-500'}`}>{count}</span>
      )}
    </button>
  )
}
