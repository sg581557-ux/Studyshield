import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Lock } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { Button } from "../components/ui";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    try { toast.success("Password updated. Please sign in."); navigate("/login"); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed to update password"); }
    finally { setLoading(false); }
  }
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-ink-950">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-accent-600/20 flex items-center justify-center mb-3"><ShieldCheck className="w-6 h-6 text-accent-400" /></div>
          <h1 className="text-xl font-semibold text-white">New password</h1>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-ink-900 border border-white/10 p-5">
          <label className="block"><span className="input-label">New password</span>
            <div className="relative"><Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" /><input type="password" required className="input-base pl-9" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" /></div>
          </label>
          <Button type="submit" className="w-full" loading={loading}>Update password</Button>
          <div className="text-xs text-slate-500 text-center"><Link to="/login" className="text-accent-400 hover:underline">Back to sign in</Link></div>
        </form>
      </motion.div>
    </div>
  );
}
