import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { CrazyInlineLoader } from "../components/loaders/AestheticLoader";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

// Lands here after:
//   1. Clicking the email-verification link, or
//   2. Returning from Google OAuth (Continue with Google).
//
// The Supabase client (detectSessionInUrl=true) processes BOTH callback
// shapes during initialisation: the implicit flow (`#access_token=...`)
// and the PKCE flow (`?code=...`). AuthContext reports `loading: false`
// only after that initialisation completes, so this page just waits —
// but on slow mobile networks the exchange + first profile fetch can take
// a while, so it polls getSession() (authoritative: it awaits client
// initialisation) and only gives up after a generous grace period.

const GRACE_MS = 15000; // wait for the OAuth exchange on slow mobile networks
const POLL_MS = 3500;   // session recovery poll interval — slightly longer to avoid rapid reload flicker

function pendingOAuthTokens(): { code: string | null; accessToken: string | null } {
  const q = new URLSearchParams(window.location.search);
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return { code: q.get("code"), accessToken: h.get("access_token") };
}

export default function AuthCallback() {
  const { user, profile, loading, profileLoading } = useAuth();
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);
  // OAuth providers return errors (e.g. the user declined the consent
  // screen) as ?error=access_denied&error_description=... in the query or
  // fragment. The URL is immutable on this page, so the error is derived
  // once at mount instead of synced through an effect.
  const [oauthError, setOauthError] = useState<string | null>(() => {
    const q = new URLSearchParams(window.location.search);
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const code = q.get("error") ?? h.get("error");
    if (!code) return null;
    const desc = q.get("error_description") ?? h.get("error_description") ?? code;
    console.error(`[auth-callback] OAuth provider error: ${code} — ${desc}`);
    return desc;
  });
  const navigatedRef = useRef(false);
  const reloadedRef = useRef(false);
  const tokens = useRef(pendingOAuthTokens());

  // Grace period for the OAuth exchange + profile fetch. Deliberately
  // generous: 5s was too short for slow mobile connections and bounced
  // users to /login while the exchange was still completing.
  useEffect(() => {
    const t = window.setTimeout(() => setTimedOut(true), GRACE_MS);
    return () => window.clearTimeout(t);
  }, []);

  // Session recovery poll: if AuthContext missed the event (listener race),
  // getSession() is authoritative. We avoid a hard reload unless the page is
  // visible and we have seen the session twice (to avoid single-poll flicker).
  // This was previously a 2.5s interval with immediate reload → 3-4 perceived refreshes.
  useEffect(() => {
    if (navigatedRef.current || oauthError || user || !supabase) return;
    const client = supabase;
    let consecutiveHits = 0;
    const t = window.setInterval(() => {
      // Don't reload while tab hidden (user clicking elsewhere triggers visibilitychange)
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      void client.auth.getSession()
        .then(({ data: { session } }) => {
          if (navigatedRef.current || user) return;
          if (session?.user) {
            consecutiveHits += 1;
            if (consecutiveHits >= 2 && !reloadedRef.current) {
              reloadedRef.current = true;
              console.warn("[auth-callback] context missed the session event — reloading to pick it up");
              window.location.reload();
            }
          } else {
            consecutiveHits = 0;
          }
        })
        .catch((err) => console.error("[auth-callback] session poll failed", err));
    }, POLL_MS);
    return () => window.clearInterval(t);
  }, [user, oauthError]);

  // Route by onboarding state once authenticated; otherwise head to /login
  // after the grace period. When OAuth tokens are still in the URL but no
  // session materialised, show a recoverable error instead of a silent
  // bounce — the exchange genuinely failed (network cut, expired one-time
  // code, declined consent without an error param).
  useEffect(() => {
    if (navigatedRef.current || oauthError) return;

    if (user) {
      // Authenticated — wait for the profile, then route by onboarding state.
      if (profileLoading) return;
      navigatedRef.current = true;
      navigate(profile?.onboarding_completed ? "/dashboard" : "/onboarding", { replace: true });
      return;
    }

    if (timedOut) {
      if (tokens.current.code || tokens.current.accessToken) {
        console.error("[auth-callback] OAuth tokens present but no session after grace period", {
          hasCode: Boolean(tokens.current.code),
          hasAccessToken: Boolean(tokens.current.accessToken),
        });
        setOauthError("Google sign-in didn't complete. Your connection may be slow or interrupted — please try again.");
      } else {
        navigatedRef.current = true;
        navigate("/login", { replace: true });
      }
    }
  }, [user, profile, loading, profileLoading, timedOut, oauthError, navigate]);

  const failed = Boolean(oauthError);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-ink-950">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-accent-600/20 flex items-center justify-center mb-3"><ShieldCheck className="w-6 h-6 text-accent-400" /></div>
          <h1 className="text-xl font-semibold text-white">{failed ? "Sign-in issue" : "Completing your sign-in…"}</h1>
        </div>
        <div className="rounded-2xl bg-ink-900 border border-white/10 p-5 text-center space-y-3">
          {failed ? (
            <>
              <AlertTriangle className="w-6 h-6 text-warning-400 mx-auto" />
              <p className="text-sm text-slate-300">
                {`Google sign-in didn't complete (${oauthError}). Try again, or use email and password.`}
              </p>
              <div className="flex flex-col gap-2">
                <Link to="/login" className="text-xs text-accent-400 hover:underline block">Back to sign in</Link>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="text-xs text-slate-400 hover:text-white underline"
                >
                  Try again
                </button>
              </div>
            </>
          ) : (
            <>
              <CrazyInlineLoader message={timedOut ? "Still working… we're securing your session" : "Signing you in — just a moment…"} />
              {timedOut && (
                <p className="text-xs text-slate-500">
                  If you are still seeing this page after a few more seconds,{" "}
                  <Link to="/login" className="text-accent-400 hover:underline">click here to return to sign in</Link>.
                </p>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
