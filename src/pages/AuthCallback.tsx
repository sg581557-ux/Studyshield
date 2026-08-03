import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

// Lands here after:
//   1. Clicking the email-verification link, or
//   2. Returning from Google OAuth (Continue with Google).
// Supabase exchanges the tokens (detectSessionInUrl) and signs the user in;
// the route guards then route to onboarding (new users) or /dashboard
// (existing users). New OAuth users get their profile auto-created in
// AuthContext.loadProfile() -> db.ensureProfile().
export default function AuthCallback() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  // OAuth providers return errors (e.g. the user declined the consent
  // screen) as ?error=access_denied&error_description=... in the query or
  // fragment. Surface them instead of the generic timeout message.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const code = q.get("error") ?? h.get("error");
    if (code) {
      setOauthError(q.get("error_description") ?? h.get("error_description") ?? code);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setTimedOut(true), 10000);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loading && user) {
      navigate(profile?.onboarding_completed ? "/dashboard" : "/onboarding", { replace: true });
    }
  }, [user, profile, loading, navigate]);

  const failed = Boolean(oauthError) || (timedOut && !user);

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
                {oauthError
                  ? `Google sign-in didn't complete (${oauthError}). Try again, or use email and password.`
                  : "We couldn't complete the sign-in. This link may be invalid or expired."}
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
