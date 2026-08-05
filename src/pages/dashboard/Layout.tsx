import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Sparkles, ListChecks, RotateCcw, BookMarked, Sigma, Timer, BarChart3, Settings as SettingsIcon, LogOut, Menu, ShieldCheck, MessagesSquare, User, Plus, GraduationCap } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../lib/utils";
import { levelFromXP } from "../../lib/constants";
import ChapterProgressReminder from "../../components/ChapterProgressReminder";

const NAV = [
  { to: "/dashboard", end: true, label: "Home", icon: LayoutDashboard },
  { to: "/planner", label: "AI Planner", icon: Sparkles },
  { to: "/mentor", label: "AI Mentor", icon: MessagesSquare },
  { to: "/backlogs", label: "Backlog", icon: ListChecks },
  { to: "/recovery", label: "Recovery", icon: RotateCcw },
  { to: "/subjects", label: "Subjects", icon: BookMarked },
  { to: "/vault", label: "Formula Vault", icon: Sigma },
  { to: "/timer", label: "Focus Timer", icon: Timer },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
  { to: "/preferences", label: "Preferences", icon: GraduationCap },
];

export default function Layout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const lvl = levelFromXP(profile?.xp ?? 0);

  const closeMobileMenu = () => setMobileOpen(false);
  const handleNavSelect = () => closeMobileMenu();

  // Move focus into the drawer when it opens and return it to the menu
  // button when it closes (keyboard users never lose their place).
  const drawerRef = useRef<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const drawerWasOpen = useRef(false);
  useEffect(() => {
    if (mobileOpen) {
      drawerRef.current?.focus();
    } else if (drawerWasOpen.current) {
      menuButtonRef.current?.focus();
    }
    drawerWasOpen.current = mobileOpen;
  }, [mobileOpen]);

  // Close the mobile drawer on navigation. Render-phase adjustment so the
  // close lands in the same commit as the route change.
  const [prevPath, setPrevPath] = useState(location.pathname);
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const syncScrollLock = () => {
      const shouldLock = window.innerWidth < 768 && mobileOpen;
      document.body.style.overflow = shouldLock ? "hidden" : "";
      document.documentElement.style.overflow = shouldLock ? "hidden" : "";
    };

    const handleResize = () => {
      if (window.innerWidth >= 768) {
        closeMobileMenu();
      }
      syncScrollLock();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobileMenu();
      }
    };

    const handlePopState = () => {
      closeMobileMenu();
    };

    syncScrollLock();
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("popstate", handlePopState);
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [mobileOpen]);

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
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto" onClickCapture={handleNavSelect}>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} onClick={handleNavSelect}
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
            <div className="absolute inset-0 bg-black/60" onClick={closeMobileMenu} aria-hidden="true" />
            <motion.aside ref={drawerRef} id="mobile-nav" tabIndex={-1} initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }} transition={{ type: "spring", stiffness: 320, damping: 30 }} className="relative h-full w-60 bg-ink-900 border-r border-white/5 flex flex-col outline-none">{navContent}</motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden flex items-center justify-between px-4 h-14 border-b border-white/5 bg-ink-900 sticky top-0 z-30">
          <button ref={menuButtonRef} onClick={() => setMobileOpen(true)} aria-label="Open navigation menu" aria-expanded={mobileOpen} aria-controls="mobile-nav" className="text-slate-300"><Menu className="w-5 h-5" /></button>
          <span className="text-sm font-semibold text-white">StudyShield</span>
          <div className="w-5" />
        </header>
        <div className="flex-1 p-4 md:p-6 max-w-5xl w-full mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Floating quick-add — opens the backlog sheet from anywhere */}
      {location.pathname !== "/backlogs" && (
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => navigate("/backlogs?add=1")}
          aria-label="Add backlog"
          className="fixed right-6 z-40 w-14 h-14 rounded-full bg-accent-600 text-white shadow-xl shadow-accent-600/40 flex items-center justify-center hover:bg-accent-500 transition-colors"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)" }}
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      )}

      {/* Chapter progress reminder — weekly cadence + 80% chapter fast-track */}
      <ChapterProgressReminder />
    </div>
  );
}
