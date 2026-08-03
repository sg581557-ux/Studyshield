import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { supabase, RESET_PASSWORD_REDIRECT_URL } from './supabase'
import type { Profile, UserRole } from './types'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  role: UserRole
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [role, setRole] = useState<UserRole>('user')
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (uid: string, email?: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    if (error) { console.error('Profile fetch error:', error); return }
    if (data) {
      setProfile(data as Profile)
    } else {
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles').insert({ id: uid, email: email || '', onboarding_completed: false, onboarding_step: 0, is_admin: false }).select('*').maybeSingle()
      if (insertError) console.error('Profile create error:', insertError)
      else if (newProfile) setProfile(newProfile as Profile)
    }

    // Fetch user role — auto-assigned by DB trigger on signup
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', uid)
      .maybeSingle()

    if (roleError) {
      // If user_roles row doesn't exist yet (e.g., OAuth login before trigger),
      // call the upsert function to create it
      if (email) {
        await supabase.rpc('upsert_user_role', { p_user_id: uid, p_email: email })
        const { data: retryRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', uid)
          .maybeSingle()
        setRole((retryRole?.role as UserRole) || 'user')
      }
    } else if (roleData) {
      setRole(roleData.role as UserRole)
    } else {
      setRole('user')
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id, user.email)
  }, [user, fetchProfile])

  useEffect(() => {
    let mounted = true
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      if (session?.user) { setUser(session.user); await fetchProfile(session.user.id, session.user.email) }
      setLoading(false)
    }
    init()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session?.user) { setUser(session.user); await fetchProfile(session.user.id, session.user.email) }
        else { setUser(null); setProfile(null); setRole('user') }
      })()
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [fetchProfile])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message || null }
  }

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: error.message }
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles').insert({ id: data.user.id, email, onboarding_completed: false, onboarding_step: 0, is_admin: false })
      if (profileError) console.error('Profile creation error:', profileError)
    }
    return { error: null }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    return { error: error?.message || null }
  }

  const signOut = async () => { await supabase.auth.signOut(); setUser(null); setProfile(null); setRole('user') }
  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: RESET_PASSWORD_REDIRECT_URL,
    })
    return { error: error?.message || null }
  }

  return (
    <AuthContext.Provider value={{ user, profile, role, loading, signIn, signUp, signInWithGoogle, signOut, resetPassword, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
