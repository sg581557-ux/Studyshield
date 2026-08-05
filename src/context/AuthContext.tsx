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

// Hard cap for a single profile load. On flaky mobile networks the Supabase
// REST call can hang indefinitely; without this, `profileLoading` never
// resolves and the auth callback (and every guard) shows an infinite spinner.
const PROFILE_LOAD_TIMEOUT_MS = 15000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error(`${label} (${ms}ms)`)), ms);
    promise.then(
      (v) => { window.clearTimeout(t); resolve(v); },
      (e) => { window.clearTimeout(t); reject(e); },
    );
  });
}

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
  // Boot-time guard: getSession() and INITIAL_SESSION can both fire; the
  // first one to complete wins the profile load and the loading flip.
  // A ref (not `loading` state) keeps the guard stable without re-running
  // the subscription effect.
  const bootedRef = useRef(false);

  async function loadProfile(uid: string, email: string, fullName: string | null, avatarUrl?: string | null) {
    const n = ++profileLoads.current;
    setProfileLoading(true);
    try {
      const p = await withTimeout((async () => {
        let row = await db.getProfile(uid);
        if (row === null && profileLoads.current === n) {
          // No profile row (e.g. user signed up before the profile trigger existed) — create one so onboarding always works.
          row = await db.ensureProfile(uid, email, fullName, avatarUrl);
          if (row) return row;
          row = await db.getProfile(uid);
        }
        return row;
      })(), PROFILE_LOAD_TIMEOUT_MS, "[auth] profile load timed out");
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
      // Boot-time one-off: nothing async has started yet, so this synchronous
      // state flip is the only way to bail out of the boot loader here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    // Explicitly call getSession() as a fallback: onAuthStateChange should
    // fire INITIAL_SESSION automatically once the client finishes initialising,
    // but if the OAuth code exchange fails silently or the storage is in an
    // unexpected state, that event may never arrive. getSession() awaits client
    // initialisation (storage recovery + OAuth callback URL processing), so it
    // can never resolve prematurely — exiting the boot loader here guarantees
    // the app can't hang on an infinite loading screen.
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !bootedRef.current) {
        bootedRef.current = true;
        setUser(session.user);
        const um = session.user.user_metadata ?? {};
        const fullName = um.full_name ?? um.name ?? null;
        const avatarUrl = um.picture ?? um.avatar_url ?? um.photo_url ?? null;
        void loadProfile(session.user.id, session.user.email ?? "", fullName, avatarUrl);
      }
    }).catch((err) => {
      console.error("[auth] getSession fallback failed", err);
    }).finally(() => {
      if (!bootedRef.current) {
        bootedRef.current = true;
        setLoading(false);
      }
    });

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
            const um = session.user.user_metadata ?? {};
            const fullName = um.full_name ?? um.name ?? null;
            const avatarUrl = um.picture ?? um.avatar_url ?? um.photo_url ?? null;
            await loadProfile(session.user.id, session.user.email ?? "", fullName, avatarUrl);
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
    const normalized = email.trim();
    const redirectTo = RESET_PASSWORD_REDIRECT_URL;
    console.info(`[auth] forgot-password: requesting reset link for "${normalized}" -> ${redirectTo}`);
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(normalized, {
        redirectTo,
      });
      // GoTrue returns HTTP 200 with an EMPTY body {} on success (even for
      // unknown emails — anti-enumeration). An empty "{}" response here is a
      // SUCCESS, not an error; an error only surfaces via the `error` field.
      console.info(`[auth] forgot-password: Supabase accepted the request; redirectTo=${redirectTo}; response=${JSON.stringify(data)}`);
      if (error) throw error;
    } catch (err) {
      // Never swallow the error: log the full object (message/status/code/
      // stack) so failures are diagnosable, then rethrow a normalized Error.
      console.error("[auth] forgot-password: resetPasswordForEmail FAILED", stringifyError(err));
      if (err instanceof Error) {
        console.error("[auth] forgot-password: stack trace:\n" + (err.stack ?? ""));
        const status = (err as { status?: number }).status;
        if (status) console.error(`[auth] forgot-password: HTTP status ${status}`);
        if (status === 429 || /rate limit|too many/i.test(err.message)) {
          console.error("[auth] forgot-password: GoTrue rate limit hit — email sends are throttled per address/IP; wait before retrying.");
        }
        throw new Error(err.message, { cause: err });
      }
      throw new Error("Failed to send password reset email.", { cause: err });
    }
  }
   async function refreshProfile() {
     if (user) {
       const um = user.user_metadata ?? {};
       const fullName = um.full_name ?? um.name ?? null;
       const avatarUrl = um.picture ?? um.avatar_url ?? um.photo_url ?? null;
       await loadProfile(user.id, user.email ?? "", fullName, avatarUrl);
     }
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
