import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Sparkles, ListChecks, RotateCcw, BookMarked, Sigma, Timer, BarChart3, Settings as SettingsIcon, LogOut, Menu, X, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../lib/utils";
import { levelFromXP } from "../../lib/constants";

const NAV = [
  { to: "/app", end: true, label: "Home", icon: LayoutDashboard },
  { to: "/app/planner", label: "AI Planner", icon: Sparkles },
  { to: "/app/backlog", label: "Backlog", icon: ListChecks },
  { to: "/app/recovery", label: "Recovery", icon: RotateCcw },
  { to: "/app/subjects", label: "Subjects", icon: BookMarked },
  { to: "/app/formulas", label: "Formula Vault", icon: Sigma },
  { to: "/app/timer", label: "Focus Timer", icon: Timer },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/app/settings", label: "Settings", icon: SettingsIcon },
];

export default function Layout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const lvl = levelFromXP(profile?.xp ?? 0);

  async function doSignOut() {
    await signOut();
    navigate("/login");
  }

  const navContent = (
    <>
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="w-9 h-9 rounded-xl bg-accent-600/20 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-accent-400" /></div>
        <div><p className="text-sm font-semibold text-white">StudyShield</p><p className="text-[10px] text-slate-500">{lvl.title}</p></div>
      </div>
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setMobileOpen(false)}
            className={({ isActive }) => cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors", isActive ? "bg-accent-600/15 text-accent-400" : "text-slate-400 hover:text-white hover:bg-white/5")}>
            <n.icon className="w-4 h-4" /> {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-2 border-t border-white/5">
        <button onClick={doSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-danger-400 hover:bg-danger-600/10 transition-colors">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-ink-950 flex">
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-white/5 bg-ink-900">{navContent}</aside>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
            <motion.aside initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }} className="relative h-full w-60 bg-ink-900 border-r border-white/5 flex flex-col">{navContent}</motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden flex items-center justify-between px-4 h-14 border-b border-white/5 bg-ink-900 sticky top-0 z-30">
          <button onClick={() => setMobileOpen(true)} className="text-slate-300"><Menu className="w-5 h-5" /></button>
          <span className="text-sm font-semibold text-white">StudyShield</span>
          <div className="w-5" />
        </header>
        <div className="flex-1 p-4 md:p-6 max-w-5xl w-full mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
