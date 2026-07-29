import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { db } from "../services/db";
import type { Profile } from "../lib/types";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const c = useContext(AuthContext);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const firstResolveDone = useRef(false);

  async function loadProfile(uid: string) {
    try {
      const p = await db.getProfile(uid);
      setProfile(p);
    } catch (err) {
      console.error("[auth] loadProfile threw", err);
      setProfile(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const safety = window.setTimeout(() => {
      if (!cancelled && !firstResolveDone.current) {
        firstResolveDone.current = true;
        setLoading(false);
      }
    }, 6000);

    (async () => {
      try {
        const { data } = await supabase?.auth.getSession() ?? { data: null as never };
        if (cancelled) return;
        const session: Session | null = data?.session ?? null;
        setUser(session?.user ?? null);
        if (session?.user) await loadProfile(session.user.id);
      } catch (err) {
        console.error("[auth] initial session load threw", err);
      } finally {
        if (!cancelled) {
          firstResolveDone.current = true;
          setLoading(false);
        }
      }
    })();

    const { data: sub } = supabase?.auth.onAuthStateChange((event, session) => {
      (async () => {
        try {
          setUser(session?.user ?? null);
          if (session?.user) {
            await loadProfile(session.user.id);
          } else {
            setProfile(null);
          }
        } catch (err) {
          console.error("[auth] onAuthStateChange threw", err);
        }
      })();
    }) ?? { subscription: null };

    return () => {
      cancelled = true;
      window.clearTimeout(safety);
      sub?.subscription?.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }
  async function signUp(email: string, password: string) {
    const { error } = await supabase!.auth.signUp({ email, password });
    if (error) throw error;
  }
  async function signOut() {
    await supabase?.auth.signOut();
    setProfile(null);
    setUser(null);
  }
  async function forgotPassword(email: string) {
    const { error } = await supabase!.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }
  async function refreshProfile() {
    if (user) await loadProfile(user.id);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, forgotPassword, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
