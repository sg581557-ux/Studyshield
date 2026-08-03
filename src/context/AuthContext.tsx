import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, OAUTH_REDIRECT_URL, RESET_PASSWORD_REDIRECT_URL, SIGNUP_REDIRECT_URL } from "../lib/supabase";
import { db } from "../services/db";
import { friendlyAuthError, stringifyError } from "../lib/authErrors";
import { useToast } from "./ToastContext";
import type { Profile } from "../lib/types";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  /** True while the initial session + profile restore is in flight (app boot). */
  loading: boolean;
  /** True whenever a profile (re)load is in flight — guards show a loader instead of flashing redirects. */
  profileLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  /** Google OAuth — redirects the browser to Google, then back to /auth/callback. */
  signInWithGoogle: () => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>;
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
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const profileLoads = useRef(0);
  const prevUserRef = useRef<User | null>(null);

  async function loadProfile(uid: string, email: string, fullName: string | null) {
    const n = ++profileLoads.current;
    setProfileLoading(true);
    try {
      let p = await db.getProfile(uid);
      if (p === null && profileLoads.current === n) {
        // No profile row (e.g. user signed up before the profile trigger
        // migration was applied) — create one so onboarding always works.
        await db.ensureProfile(uid, email, fullName);
        p = await db.getProfile(uid);
      }
      if (profileLoads.current === n) setProfile(p);
    } catch (err) {
      console.error("[auth] loadProfile threw", err);
      if (profileLoads.current === n) setProfile(null);
    } finally {
      if (profileLoads.current === n) setProfileLoading(false);
    }
  }

  useEffect(() => {
    // Subscribe to auth state changes FIRST — never gate app boot on
    // getSession(). The client emits INITIAL_SESSION only after initialisation
    // has fully completed (storage recovery + OAuth callback URL processing —
    // detectSessionInUrl=true handles both the PKCE ?code= exchange and the
    // implicit #access_token flow). INITIAL_SESSION (or SIGNED_IN, which can
    // precede it on an OAuth callback) is therefore the authoritative "boot
    // done" signal: loading stays true until it arrives, so the app can never
    // observe a temporary null user while the callback URL is still being
    // exchanged.
    if (!supabase) {
      console.error("[auth] Supabase client not initialized — auth unavailable");
      setLoading(false);
      return;
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const hadSession = Boolean(prevUserRef.current);
      prevUserRef.current = session?.user ?? null;
      setUser(session?.user ?? null);
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
        setLoading(false);
      }
      (async () => {
        try {
          if (session?.user) {
            await loadProfile(session.user.id, session.user.email ?? "", session.user.user_metadata?.full_name ?? null);
          } else {
            if (event === "SIGNED_OUT" && hadSession) {
              toast.info("Your session expired. Please sign in again.");
            }
            setProfile(null);
          }
        } catch (err) {
          console.error("[auth] onAuthStateChange threw", err);
        }
      })();
    });

    return () => sub.subscription.unsubscribe();
  }, [toast]);

  async function signIn(email: string, password: string) {
    if (!supabase) throw new Error("Supabase client not initialized");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }
  async function signInWithGoogle() {
    if (!supabase) throw new Error("Supabase client not initialized");
    // Redirect flow: the browser leaves for Google and returns to
    // /auth/callback with the tokens. detectSessionInUrl exchanges them,
    // loadProfile() creates the profile for new users, and the callback
    // page routes to onboarding or the dashboard. access_type=offline lets
    // Supabase exchange for a refresh token; prompt=consent guarantees
    // Google issues one on first auth.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: OAUTH_REDIRECT_URL,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) throw error;
  }
  async function signUp(name: string, email: string, password: string) {
    if (!supabase) throw new Error("Supabase client not initialized");
    // When the project requires email confirmation (mailer_autoconfirm=false,
    // the default for new Supabase projects), signUp returns a user but NO
    // session — the caller must route to a "check your email" state. The
    // confirmation email links back to /auth/callback, which auto-logs the
    // user in after verification and sends them to onboarding.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: SIGNUP_REDIRECT_URL,
      },
    });
    if (error) throw error;
    return { needsEmailConfirmation: !data.session };
  }
  async function signOut() {
    await supabase?.auth.signOut();
    setProfile(null);
    setUser(null);
  }
  async function forgotPassword(email: string) {
    if (!supabase) throw new Error("Supabase client not initialized");
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: RESET_PASSWORD_REDIRECT_URL,
      });
      // GoTrue returns HTTP 200 with an EMPTY body {} on success (even for
      // unknown emails — anti-enumeration). An empty "{}" response here is a
      // SUCCESS, not an error; an error only surfaces via the `error` field.
      console.info(`[auth] resetPasswordForEmail accepted for ${email}; redirectTo=${RESET_PASSWORD_REDIRECT_URL}; response=${JSON.stringify(data)}`);
      if (error) throw error;
    } catch (err) {
      console.error("[auth] resetPasswordForEmail failed", stringifyError(err));
      throw err;
    }
  }
  async function refreshProfile() {
    if (user) await loadProfile(user.id, user.email ?? "", user.user_metadata?.full_name ?? null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        profileLoading,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        forgotPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function authErrorMessage(err: unknown): string {
  return friendlyAuthError(err);
}
