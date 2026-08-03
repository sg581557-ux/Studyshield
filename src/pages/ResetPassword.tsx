import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { authErrorMessage } from "../context/AuthContext";
import { stringifyError } from "../lib/authErrors";
import { useToast } from "../context/ToastContext";
import { Button } from "../components/ui";
import { PasswordInput, PasswordRequirements, passwordMeetsRequirements } from "../components/auth/PasswordInput";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [validLink, setValidLink] = useState<boolean | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!supabase) { if (!cancelled) setValidLink(false); return; }
        // detectSessionInUrl (set on the client) exchanges the recovery token
        // in the URL hash for a real session; getUser() confirms the link.
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.error("[reset-password] session check failed", stringifyError(error));
        }
        if (!cancelled) setValidLink(Boolean(user));
      } catch (err) {
        console.error("[reset-password] session check threw", stringifyError(err));
        if (!cancelled) setValidLink(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const passwordOk = passwordMeetsRequirements(password);
  const confirmError = confirm.length > 0 && password !== confirm;
  const formValid = passwordOk && !confirmError;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid) return;
    setLoading(true);
    setSubmitError(null);
    try {
      if (!supabase) throw new Error("Supabase client not initialized");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("This reset link is invalid or has expired.");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      toast.success("Password updated. Please sign in.");
      navigate("/login", { replace: true });
    } catch (err: unknown) {
      console.error("[reset-password] password update failed", stringifyError(err));
      const message = authErrorMessage(err);
      setSubmitError(message);
      toast.error(message);
      if (message.includes("invalid or expired")) navigate("/forgot-password", { replace: true });
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-ink-950">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-accent-600/20 flex items-center justify-center mb-3"><ShieldCheck className="w-6 h-6 text-accent-400" /></div>
          <h1 className="text-xl font-semibold text-white">New password</h1>
        </div>

        {validLink === false ? (
          <div className="rounded-2xl bg-ink-900 border border-white/10 p-5 text-center space-y-3">
            <AlertTriangle className="w-6 h-6 text-warning-400 mx-auto" />
            <p className="text-sm text-slate-300">This reset link is invalid or has expired.</p>
            <Link to="/forgot-password" className="text-xs text-accent-400 hover:underline block">Request a new link</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 rounded-2xl bg-ink-900 border border-white/10 p-5" noValidate>
            <PasswordInput
              label="New password"
              required
              autoFocus
              disabled={validLink === null}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              hint={<PasswordRequirements password={password} />}
            />
            <PasswordInput
              label="Confirm password"
              required
              disabled={validLink === null}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              error={confirmError ? "Passwords do not match." : null}
            />
            <Button type="submit" className="w-full" loading={loading || validLink === null} disabled={validLink === null || !formValid}>
              {loading ? "Updating…" : "Update password"}
            </Button>
            {submitError && (
              <div className="flex items-start gap-2 rounded-xl bg-danger-500/10 border border-danger-500/30 px-3 py-2.5">
                <AlertTriangle className="w-4 h-4 text-danger-400 shrink-0 mt-0.5" />
                <p className="text-xs text-danger-300">{submitError}</p>
              </div>
            )}
            <div className="text-xs text-slate-500 text-center"><Link to="/login" className="text-accent-400 hover:underline">Back to sign in</Link></div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
