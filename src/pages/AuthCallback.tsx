import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

// Lands here after:
//   1. Clicking the email-verification link, or
//   2. Returning from Google OAuth (Continue with Google).
//
// AuthContext owns session restoration: it subscribes to onAuthStateChange
// before anything else and reports `loading: false` only once INITIAL_SESSION
// or SIGNED_IN arrives (the client processes the OAuth callback URL during
// initialisation — detectSessionInUrl=true — so the exchange has already
// happened by then). This page just waits: show the spinner, then route by
// onboarding state. It never redirects to /login on a temporary null user —
// that only happens after auth init has completed AND the grace period has
// elapsed (dead link / declined consent with no error param).
export default function AuthCallback() {
  const { user, profile, loading, profileLoading } = useAuth();
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const navigatedRef = useRef(false);

  // OAuth providers return errors (e.g. the user declined the consent
  // screen) as ?error=access_denied&error_description=... in the query or
  // fragment. Surface them instead of redirecting to /login silently.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const code = q.get("error") ?? h.get("error");
    if (code) {
      setOauthError(q.get("error_description") ?? h.get("error_description") ?? code);
    }
  }, []);

  // If no session has appeared after 5 seconds, head to /login.
  useEffect(() => {
    const t = window.setTimeout(() => setTimedOut(true), 5000);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (navigatedRef.current || oauthError) return;

    if (user) {
      // Authenticated — wait for the profile, then route by onboarding state.
      if (profileLoading) return;
      navigatedRef.current = true;
      navigate(profile?.onboarding_completed ? "/dashboard" : "/onboarding", { replace: true });
      return;
    }

    // No session. Only redirect once auth initialisation is complete
    // (INITIAL_SESSION/SIGNED_IN received → loading=false) AND the 5s grace
    // period has elapsed — never on a temporary null user while the OAuth
    // exchange is still in flight.
    if (!loading && timedOut) {
      navigatedRef.current = true;
      navigate("/login", { replace: true });
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
              <Link to="/login" className="text-xs text-accent-400 hover:underline block">Back to sign in</Link>
            </>
          ) : (
            <>
              <Loader2 className="w-6 h-6 text-accent-400 animate-spin mx-auto" />
              <p className="text-sm text-slate-300">Signing you in — just a moment.</p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
