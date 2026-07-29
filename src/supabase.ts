import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Module {
  id: string
  user_id: string
  name: string
  code: string | null
  total_topics: number
  completed_topics: number
  color: string
  created_at: string
}

export interface BacklogItem {
  id: string
  user_id: string
  title: string
  module_id: string | null
  priority: 'low' | 'medium' | 'high'
  status: 'todo' | 'doing' | 'done'
  due_date: string | null
  created_at: string
}

export interface Question {
  id: string
  user_id: string
  module_id: string | null
  question: string
  answer: string | null
  difficulty: 'easy' | 'medium' | 'hard'
  status: 'unanswered' | 'answered' | 'reviewing'
  created_at: string
}
