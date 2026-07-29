import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Mail, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Button } from "../components/ui";

export default function Login() {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    try { await signIn(email.trim(), password); toast.success("Welcome back!"); navigate("/app"); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Sign-in failed"); }
    finally { setLoading(false); }
  }
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-ink-950">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-accent-600/20 flex items-center justify-center mb-3"><ShieldCheck className="w-6 h-6 text-accent-400" /></div>
          <h1 className="text-xl font-semibold text-white">StudyShield</h1>
          <p className="text-xs text-slate-500 mt-1">Sign in to continue</p>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-ink-900 border border-white/10 p-5">
          <label className="block"><span className="input-label">Email</span>
            <div className="relative"><Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" /><input type="email" required className="input-base pl-9" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
          </label>
          <label className="block"><span className="input-label">Password</span>
            <div className="relative"><Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" /><input type="password" required className="input-base pl-9" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></div>
          </label>
          <Button type="submit" className="w-full" loading={loading}>Sign in</Button>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <Link to="/forgot-password" className="hover:text-accent-400">Forgot password?</Link>
            <Link to="/signup" className="hover:text-accent-400">Create account</Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
