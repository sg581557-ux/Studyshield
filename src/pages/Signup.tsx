import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Mail, User } from "lucide-react";
import { useAuth, authErrorMessage } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Button } from "../components/ui";
import { PasswordInput, PasswordRequirements, passwordMeetsRequirements } from "../components/auth/PasswordInput";
import { GoogleSignInButton } from "../components/auth/GoogleSignInButton";

export default function Signup() {
  const { signUp, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email]);
  const passwordOk = passwordMeetsRequirements(password);
  const confirmTouched = confirm.length > 0;
  const confirmError = confirmTouched && password !== confirm;
  const formValid = name.trim().length > 0 && emailValid && passwordOk && !confirmError;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid) return;
    setLoading(true);
    try {
      const res = await signUp(name.trim(), email.trim(), password);
      if (res.needsEmailConfirmation) {
        // Project requires email confirmation (Supabase default). The
        // confirmation email links to /auth/callback, which auto-logs the
        // user in after verification and routes them to onboarding.
        toast.success("Verification email sent. Check your inbox (and spam folder) — you'll be signed in automatically after verifying.");
        navigate("/login", { replace: true });
      } else {
        toast.success("Account created! Welcome to StudyShield.");
        navigate("/onboarding", { replace: true });
      }
    } catch (err: unknown) {
      toast.error(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setGoogleLoading(true);
    try {
      // On success the browser redirects to Google, then back to
      // /auth/callback where the profile is auto-created for new users.
      await signInWithGoogle();
    } catch (err: unknown) {
      setGoogleLoading(false);
      toast.error(authErrorMessage(err));
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-ink-950">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-accent-600/20 flex items-center justify-center mb-3"><ShieldCheck className="w-6 h-6 text-accent-400" /></div>
          <h1 className="text-xl font-semibold text-white">Create your account</h1>
          <p className="text-xs text-slate-500 mt-1">Start your study journey</p>
        </div>
        <div className="space-y-4 rounded-2xl bg-ink-900 border border-white/10 p-5">
          <GoogleSignInButton onClick={() => void google()} loading={googleLoading} label="Sign up with Google" />
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-slate-500">or sign up with email</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <form onSubmit={submit} className="space-y-4" noValidate>
          <label className="block">
            <span className="input-label">Full name</span>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                autoComplete="name"
                className="input-base pl-9"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
          </label>
          <label className="block">
            <span className="input-label">Email</span>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                autoComplete="email"
                className="input-base pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            {email.trim().length > 0 && !emailValid && (
              <span className="text-xs text-red-400 mt-1 block">Enter a valid email address.</span>
            )}
          </label>
          <PasswordInput
            label="Password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 characters"
            hint={<PasswordRequirements password={password} />}
          />
          <PasswordInput
            label="Confirm password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat your password"
            error={confirmError ? "Passwords do not match." : null}
          />
          <Button type="submit" className="w-full" loading={loading} disabled={!formValid}>
            {loading ? "Signing up…" : "Create account"}
          </Button>
          <div className="text-xs text-slate-500 text-center">Already have an account? <Link to="/login" className="text-accent-400 hover:underline">Sign in</Link></div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
