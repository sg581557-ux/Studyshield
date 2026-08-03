import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Mail } from "lucide-react";
import { useAuth, authErrorMessage } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Button } from "../components/ui";

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // Supabase errors can be Error instances, plain objects, or null — never
  // pass them straight to React (that renders "{}" / "[object Object]").
  // Coerce to a safe, meaningful message.
  function resetErrorMessage(err: unknown): string {
    const message = authErrorMessage(err);
    if (!message || message === "{}" || message === "[object Object]") {
      return "Unable to send reset email. Please try again.";
    }
    return message;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
      toast.success("Password reset email sent. Check your inbox.");
    } catch (err: unknown) {
      // Detailed logging for debugging — never shown in the UI.
      console.error("[forgot-password] failed to send reset email", err);
      toast.error(resetErrorMessage(err));
    } finally { setLoading(false); }
  }
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-ink-950">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-accent-600/20 flex items-center justify-center mb-3"><ShieldCheck className="w-6 h-6 text-accent-400" /></div>
          <h1 className="text-xl font-semibold text-white">Reset password</h1>
        </div>
        {sent ? (
          <div className="rounded-2xl bg-ink-900 border border-white/10 p-5 text-center space-y-3"><p className="text-sm text-slate-300">Check your email for a reset link.</p><Link to="/login" className="text-xs text-accent-400 hover:underline">Back to sign in</Link></div>
        ) : (
          <form onSubmit={submit} className="space-y-4 rounded-2xl bg-ink-900 border border-white/10 p-5">
            <label className="block"><span className="input-label">Email</span>
              <div className="relative"><Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" /><input type="email" required className="input-base pl-9" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
            </label>
            <Button type="submit" className="w-full" loading={loading}>{loading ? "Sending link…" : "Send reset link"}</Button>
            <div className="text-xs text-slate-500 text-center"><Link to="/login" className="text-accent-400 hover:underline">Back to sign in</Link></div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
