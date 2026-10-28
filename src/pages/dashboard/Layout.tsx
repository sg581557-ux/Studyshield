import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Sparkles,
  ListChecks,
  RotateCcw,
  BookMarked,
  Sigma,
  Timer,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  ShieldCheck,
  MessagesSquare,
  User,
  GraduationCap,
  Search,
  Command,
  Flame,
  ChevronRight,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../lib/utils";
import { levelFromXP } from "../../lib/constants";
import ChapterProgressReminder from "../../components/ChapterProgressReminder";
import { SEO } from "../../components/SEO";
import StreakPopup from "../../components/StreakPopup";
import { db } from "../../services/db";
import { computeCurrentStreakWithPlans } from "../../services/planner/learningModel";
import { localTodayISO } from "../../lib/date";
import { useScrollLock } from "../../hooks/useScrollLock";

const NAV = [
  { to: "/dashboard", end: true, label: "Home", icon: LayoutDashboard, desc: "Overview" },
  { to: "/planner", label: "AI Planner", icon: Sparkles, desc: "Smart schedule" },
  { to: "/mentor", label: "Echo", icon: MessagesSquare, desc: "Chat & solve" },
  { to: "/backlogs", label: "Backlog", icon: ListChecks, desc: "Pending work" },
  { to: "/recovery", label: "Recovery", icon: RotateCcw, desc: "Missed tasks" },
  { to: "/subjects", label: "Chapter Tracker", icon: BookMarked, desc: "Chapters & progress" },
  { to: "/vault", label: "Formula Vault", icon: Sigma, desc: "Quick revision" },
  { to: "/timer", label: "Focus Timer", icon: Timer, desc: "Pomodoro" },
  { to: "/analytics", label: "Analytics", icon: BarChart3, desc: "Insights" },
  { to: "/profile", label: "Profile", icon: User, desc: "Your journey" },
  { to: "/settings", label: "Settings", icon: SettingsIcon, desc: "Preferences" },
  { to: "/preferences", label: "Academic", icon: GraduationCap, desc: "School & coaching" },
] as const;

const GROUPS = [
  { label: "Command", ids: ["/dashboard", "/planner", "/mentor"] },
  { label: "Study Engine", ids: ["/backlogs", "/recovery", "/subjects", "/vault"] },
  { label: "Performance", ids: ["/timer", "/analytics"] },
  { label: "You", ids: ["/profile", "/settings", "/preferences"] },
];

function groupForPath(path: string) {
  return GROUPS.find((g) => g.ids.includes(path))?.label ?? "StudyShield";
}

export default function Layout() {
  const { profile, signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [profileWindowOpen, setProfileWindowOpen] = useState(false);
  const profileWindowRef = useRef<HTMLDivElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const lvl = levelFromXP(profile?.xp ?? 0);
  const displayName = profile?.display_name || profile?.full_name || user?.email?.split("@")[0] || "Scholar";
  const email = user?.email ?? profile?.email ?? "";
  const initials = displayName.slice(0, 2).toUpperCase();
  const xpPct = lvl.pct;

  // --- Streak popup: wonderful animation on every entry (once per day per user) ---
  const [streakOpen, setStreakOpen] = useState(false);
  const [streakInfo, setStreakInfo] = useState({ current: 0, longest: 0 });
  // Per-uid+day guard — prevents double popup within same session / StrictMode double mount
  // Value is `${uid}:${todayLocal}` when already shown; reset automatically on uid/day change
  const streakShownRef = useRef<string | null>(null);

  // Stable callbacks for popup (avoid StreakPopup effect thrash from inline arrows)
  const handleStreakClose = useCallback(() => setStreakOpen(false), []);
  // Pending navigate after popup exit — healed via onExitComplete, not rAF (rAF raced with passive cleanup)
  const pendingNavRef = useRef<string | null>(null);
  const pendingNavTimerRef = useRef<number | null>(null);
  const handleStreakPrimary = useCallback(() => {
    const target = streakInfo.current === 0 ? "/planner" : "/dashboard";
    pendingNavRef.current = target;
    setStreakOpen(false);
    // Fallback timer in case onExitComplete doesn't fire (e.g. reduced-motion, rapid toggle)
    if (pendingNavTimerRef.current != null) window.clearTimeout(pendingNavTimerRef.current);
    pendingNavTimerRef.current = window.setTimeout(() => {
      const t = pendingNavRef.current;
      pendingNavRef.current = null;
      pendingNavTimerRef.current = null;
      if (t) navigate(t);
    }, 320);
  }, [navigate, streakInfo.current]);
  const handleStreakExitComplete = useCallback(() => {
    const t = pendingNavRef.current;
    if (t) {
      pendingNavRef.current = null;
      if (pendingNavTimerRef.current != null) {
        window.clearTimeout(pendingNavTimerRef.current);
        pendingNavTimerRef.current = null;
      }
      navigate(t);
    }
  }, [navigate]);
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (pendingNavTimerRef.current != null) window.clearTimeout(pendingNavTimerRef.current);
    };
  }, []);

  const currentNav = useMemo(() => NAV.find((n) => ((n as { end?: boolean }).end ? location.pathname === n.to : location.pathname.startsWith(n.to))), [location.pathname]);
  const filteredNav = useMemo(() => {
    if (!query.trim()) return [...NAV];
    const q = query.toLowerCase();
    return NAV.filter((n) => n.label.toLowerCase().includes(q) || n.desc.toLowerCase().includes(q));
  }, [query]);

  const closeMobileMenu = useCallback(() => {
    setMobileOpen(false);
  }, []);
  const handleNavSelect = useCallback(() => closeMobileMenu(), [closeMobileMenu]);

  const drawerRef = useRef<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const drawerWasOpen = useRef(false);
  useEffect(() => {
    if (mobileOpen) drawerRef.current?.focus();
    else if (drawerWasOpen.current) menuButtonRef.current?.focus();
    drawerWasOpen.current = mobileOpen;
  }, [mobileOpen]);

  // Close drawer on every route change — replaces the old render-phase
  // setState that could get stuck in concurrent mode and left body locked.
  useEffect(() => {
    setMobileOpen(false);
    setProfileWindowOpen(false);
  }, [location.pathname]);

  // Shared scroll-lock for drawer + command palette (ref-counted with streak popup)
  const shouldLockDrawer = mobileOpen;
  const shouldLockCommand = commandOpen;
  const shouldLockProfileWindow = profileWindowOpen;
  useScrollLock(shouldLockDrawer, "mobile-drawer");
  useScrollLock(shouldLockCommand, "command-palette");
  useScrollLock(shouldLockProfileWindow, "profile-window");

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    // Use matchMedia instead of innerWidth so scrollbar paddingRight from useScrollLock doesn't trigger false resize near 768px
    const mql = window.matchMedia("(min-width: 768px)");
    const handleResize = () => {
      if (mql.matches) closeMobileMenu();
    };
    // Initial check
    handleResize();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (profileWindowOpen) {
          setProfileWindowOpen(false);
          return;
        }
        if (commandOpen) setCommandOpen(false);
        else closeMobileMenu();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((v) => !v);
      }
    };
    const handlePopState = () => {
      closeMobileMenu();
      setCommandOpen(false);
      setProfileWindowOpen(false);
    };
    // Prefer modern addEventListener on MediaQueryList, fallback to resize
    if (mql.addEventListener) mql.addEventListener("change", handleResize);
    else window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("popstate", handlePopState);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", handleResize);
      else window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [closeMobileMenu, commandOpen, profileWindowOpen]);

  useEffect(() => {
    if (commandOpen) {
      const t = window.setTimeout(() => commandInputRef.current?.focus(), 80);
      return () => window.clearTimeout(t);
    } else {
      setQuery("");
    }
  }, [commandOpen]);

  // Streak — show a wonderful pop-up every time the user enters (once per day)
  const profileId = profile?.id;
  const userId = user?.id;
  const onboardingDone = profile?.onboarding_completed ?? false;
  const longestStreakVal = profile?.longest_streak ?? 0;
  useEffect(() => {
    if (!profile || !user || !onboardingDone) return;
    const uid = userId ?? profileId;
    if (!uid) return;
    // preview via ?streak=1 or ?streakPreview
    const params = new URLSearchParams(window.location.search);
    const forcePreview = params.has("streakPreview") || params.get("streak") === "1";

    const today = localTodayISO();
    const storageKey = `studyshield:streakPopup:${uid}`;
    const sessionKey = `${uid}:${today}`;
    if (!forcePreview && streakShownRef.current === sessionKey) return;
    const lastShownPre = (() => {
      try {
        return window.localStorage.getItem(storageKey);
      } catch {
        return null;
      }
    })();
    if (!forcePreview && lastShownPre === today) {
      streakShownRef.current = sessionKey;
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (cancelled) return;
      // Fresh read inside timer — another tab may have written during the 850ms wait
      const freshLastShown = (() => {
        try {
          return window.localStorage.getItem(storageKey);
        } catch {
          return null;
        }
      })();
      if (!forcePreview && freshLastShown === today) {
        streakShownRef.current = sessionKey;
        return;
      }
      try {
        const [stats, tasks, plans] = await Promise.all([
          db.getStudyStats().catch(() => null),
          db.getAllTasks().catch(() => null),
          db.getAllDailyPlanInputs().catch(() => []),
        ]);
        if (cancelled) return;
        // Fresh check again after network (still not shown → proceed)
        const fresh2 = (() => {
          try {
            return window.localStorage.getItem(storageKey);
          } catch {
            return null;
          }
        })();
        if (!forcePreview && fresh2 === today) {
          streakShownRef.current = sessionKey;
          return;
        }

        // Compute streak including both completed tasks AND plan generation (daily_plan_inputs) — so generating plan starts streak even before tasks completed
        const fetchedTasks = tasks ?? null;
        const planDates = new Set((plans as unknown as { plan_date: string }[]).map((p) => p.plan_date));
        const computed = fetchedTasks ? computeCurrentStreakWithPlans(fetchedTasks, planDates) : (stats?.streak_days ?? 0);
        const tasksFetchedOk = fetchedTasks !== null;
        // If tasks were fetched, `computed` is truth (0 means broken). Plan dates ensure generate counts.
        const effectiveCurrent = tasksFetchedOk ? computed : (stats?.streak_days ?? 0);
        const profileLongest = longestStreakVal;
        const effectiveLongest = Math.max(profileLongest, stats?.streak_days ?? 0, computed);

        if (cancelled) return;
        setStreakInfo({ current: effectiveCurrent, longest: effectiveLongest });
        setStreakOpen(true);
        streakShownRef.current = sessionKey;
        try {
          window.localStorage.setItem(storageKey, today);
        } catch {
          // ignore
        }

        // Sync profile longest_streak if we beat the record
        if (effectiveLongest > profileLongest && uid) {
          db.upsertProfile({ id: uid, longest_streak: effectiveLongest }).catch(() => {});
        }
        // Keep study_stats in sync if our live computed differs (only when we have a live computed)
        // Uses planDates-aware computed so a bump from generate isn't overwritten back to 0
        if (tasksFetchedOk && stats && computed !== stats.streak_days) {
          db.upsertStudyStats({ streak_days: computed }).catch(() => {});
        }
      } catch (e) {
        console.error("[Layout streak] failed", e);
      }
    }, 850);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [profileId, userId, onboardingDone, longestStreakVal]);

  // Listen for immediate streak bump from AIPlanner generate (max 1/day) so sidebar popup shows 1 without stale 0
  useEffect(() => {
    const h = (e: Event) => {
      const detail = (e as CustomEvent).detail as number | undefined;
      if (typeof detail === "number" && detail > 0) {
        setStreakInfo((prev) => ({ current: detail, longest: Math.max(prev.longest, detail, longestStreakVal) }));
      }
    };
    window.addEventListener("studyshield:streak-updated" as unknown as string, h as EventListener);
    return () => window.removeEventListener("studyshield:streak-updated" as unknown as string, h as EventListener);
  }, [longestStreakVal]);

  async function doSignOut() {
    await signOut();
    navigate("/login");
  }

  const navContent = (
    <>
      {/* Brand */}
      <div className="px-4 pt-5 pb-4">
        <div className="relative overflow-hidden rounded-[20px] border border-white/[0.06] bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-[1px]">
          <div className="rounded-[19px] bg-gradient-to-br from-zinc-900 via-zinc-900 to-black px-3.5 py-3.5">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[radial-gradient(circle_at_center,rgba(56,177,255,0.22),transparent_70%)] blur-[1px]" />
            <div className="absolute -left-6 -bottom-6 h-20 w-20 rounded-full bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.18),transparent_70%)]" />
            <div className="relative flex items-center gap-3">
              <div className="relative flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 shadow-lg shadow-accent-600/20 isolate">
                <ShieldCheck className="h-6 w-6 text-white" />
                <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center pointer-events-none" aria-hidden>
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-30 motion-safe:animate-pulse" style={{ willChange: "opacity" }} />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-zinc-900" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold tracking-tight text-white">StudyShield</p>
                <p className="text-[11px] font-medium leading-none text-zinc-400">Study OS • {lvl.title}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-accent-500 to-violet-500 transition-[width] duration-700 ease-out" style={{ width: `${xpPct}%` }} />
                  </div>
                  <span className="text-[10px] font-semibold text-zinc-400">{xpPct}%</span>
                </div>
              </div>
            </div>
            <div className="relative mt-3 flex items-center gap-1.5 rounded-xl bg-white/[0.04] px-2.5 py-2 ring-1 ring-white/[0.06]">
              <button
                type="button"
                onClick={() => setProfileWindowOpen(true)}
                aria-label="Open profile"
                title="Open profile"
                className="flex items-center gap-1.5 min-w-0 flex-1 text-left hover:opacity-90 transition"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-[10px] font-bold text-white">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-white">{displayName}</p>
                  <p className="truncate text-[10px] text-zinc-500">{email}</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  // Re-open with last computed current (truth), not longest
                  const cur = streakInfo.current;
                  const longest = Math.max(streakInfo.longest, profile?.longest_streak ?? 0, cur);
                  setStreakInfo({ current: cur, longest });
                  setStreakOpen(true);
                }}
                title={`Current ${streakInfo.current} • Longest ${Math.max(streakInfo.longest, profile?.longest_streak ?? 0)}`}
                aria-label="View streak"
                className="hidden items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold text-white hover:bg-white/15 transition sm:inline-flex"
              >
                <Flame className="h-3 w-3 text-amber-400" /> {streakInfo.current > 0 ? streakInfo.current : (profile?.longest_streak ?? 0)}
              </button>
            </div>
          </div>
        </div>

        {/* Command bar — opens palette */}
        <button
          onClick={() => setCommandOpen(true)}
          className="mt-3 flex w-full items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2.5 text-left backdrop-blur transition hover:bg-white/[0.06] hover:border-white/10"
        >
          <Search className="h-3.5 w-3.5 text-zinc-500" />
          <span className="flex-1 text-xs text-zinc-500">Search or jump to…</span>
          <span className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
            <Command className="h-3 w-3" />K
          </span>
        </button>
      </div>

      {/* Nav — removed onClickCapture that was swallowing NavLink clicks and leaving drawer stuck */}
      <div className="flex-1 overflow-y-auto px-3 pb-2 no-scrollbar">
        {GROUPS.map((g) => (
          <div key={g.label} className="mb-5">
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{g.label}</p>
            <div className="space-y-1">
              {NAV.filter((n) => g.ids.includes(n.to)).map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={(n as { end?: boolean }).end}
                  onClick={handleNavSelect}
                  className={({ isActive }) =>
                    cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-[10px] text-[13px] font-medium transition-all",
                      isActive ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:bg-white/[0.06] hover:text-white",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                          isActive ? "bg-zinc-900 text-white" : "bg-white/[0.06] text-zinc-400 group-hover:bg-white/10 group-hover:text-white",
                        )}
                      >
                        <n.icon className="h-4 w-4" />
                      </span>
                      <span className="flex-1 leading-none">
                        <span className="block">{n.label}</span>
                        <span className={cn("block text-[11px] font-normal leading-none", isActive ? "text-zinc-500" : "text-zinc-500 group-hover:text-zinc-400")}>{n.desc}</span>
                      </span>
                      {isActive && <span className="absolute right-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-accent-500 shadow-[0_0_10px_rgba(56,177,255,0.6)]" />}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-white/[0.06] p-3">
        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-accent-600/15 via-violet-600/10 to-transparent p-3">
          <p className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent-400" /> Upgrade focus
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">You're {xpPct}% to Level {lvl.level + 1}. Keep the streak alive!</p>
          <button
            onClick={() => {
              handleNavSelect();
              navigate("/timer");
            }}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-zinc-900 transition hover:bg-zinc-100"
          >
            Start Focus Session <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <button
          onClick={doSignOut}
          className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06]">
            <LogOut className="h-4 w-4" />
          </span>
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div data-keep-dark className="min-h-screen overflow-x-hidden bg-[#070708] text-zinc-200 selection:bg-accent-500/30 selection:text-white">
      <SEO robots="noindex, nofollow" />
      {/* background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[30%] left-1/2 h-[900px] w-[1200px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(56,177,255,0.10),transparent_60%)] blur-3xl" />
        <div className="absolute -top-[20%] right-[-10%] h-[700px] w-[700px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.10),transparent_60%)] blur-3xl" />
        <div className="absolute bottom-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.06),transparent_60%)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      </div>

      <div className="relative flex min-h-screen">
        {/* Desktop sidebar — isolate compositing to prevent ping+backdrop-blur flicker across browsers */}
        <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-[300px] md:shrink-0 md:flex-col md:border-r md:border-white/[0.06] md:bg-[#0a0a0c]/90 md:backdrop-blur-2xl isolate will-change-transform" style={{ contain: "layout style paint" }}>
          <div className="flex h-full flex-col">{navContent}</div>
        </aside>

        {/* Mobile drawer — CSS transition (no AnimatePresence) — was getting stuck with framer exit */}
        <div className={`fixed inset-0 z-50 md:hidden ${mobileOpen ? "pointer-events-auto" : "pointer-events-none"}`} role="dialog" aria-modal={mobileOpen} aria-label="Navigation menu" aria-hidden={!mobileOpen}>
          <div
            className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${mobileOpen ? "opacity-100" : "opacity-0"}`}
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
          <aside
            ref={drawerRef as unknown as React.RefObject<HTMLDivElement>}
            id="mobile-nav"
            tabIndex={-1}
            className={`relative flex h-full w-[86%] max-w-[320px] flex-col overflow-hidden rounded-r-[24px] border-r border-white/10 bg-[#0a0a0c] shadow-2xl outline-none transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
          >
            <div className="absolute right-3 top-3 z-10">
              <button onClick={closeMobileMenu} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/15">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex h-full flex-col overflow-hidden">{navContent}</div>
          </aside>
        </div>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Topbar */}
          <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#070708]/70 backdrop-blur-xl supports-[backdrop-filter]:bg-[#070708]/60">
            {/* Mobile header */}
            <div className="flex h-[60px] items-center justify-between gap-3 px-4 md:hidden">
              <button
                ref={menuButtonRef}
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation menu"
                aria-expanded={mobileOpen}
                aria-controls="mobile-nav"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-violet-600">
                  <ShieldCheck className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-white">StudyShield</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-accent-300">OS</span>
              </div>
              <button
                type="button"
                onClick={() => setProfileWindowOpen(true)}
                aria-label="Open profile"
                title="Open profile"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-bold text-zinc-900 hover:bg-zinc-100 transition"
              >
                {initials}
              </button>
            </div>

            {/* Desktop header */}
            <div className="hidden items-center justify-between gap-4 px-6 py-3 md:flex lg:px-8">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-zinc-900 shadow-sm">
                  {currentNav ? <currentNav.icon className="h-4 w-4" /> : <LayoutDashboard className="h-4 w-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold leading-none text-white">{currentNav?.label ?? groupForPath(location.pathname)}</h2>
                    <span className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-400 sm:inline-flex">
                      {currentNav?.desc ?? "Workspace"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                    <span>StudyShield</span>
                    <ChevronRight className="h-3 w-3" />
                    <span className="text-zinc-300">{currentNav?.label ?? "Dashboard"}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-400 lg:flex">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  All systems operational
                  <span className="mx-1 h-3 w-px bg-white/10" />
                  {new Date().toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const cur = streakInfo.current;
                    const longest = Math.max(streakInfo.longest, profile?.longest_streak ?? 0, cur);
                    setStreakInfo({ current: cur, longest });
                    setStreakOpen(true);
                  }}
                  title={`Current ${streakInfo.current} • Longest ${Math.max(streakInfo.longest, profile?.longest_streak ?? 0)}`}
                  aria-label="View streak"
                  className="hidden items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/20 hover:bg-amber-500/20 transition sm:inline-flex"
                >
                  <Flame className="h-3.5 w-3.5" /> {(streakInfo.current > 0 ? streakInfo.current : (profile?.longest_streak ?? 0))} day streak
                </button>
                <button
                  type="button"
                  onClick={() => setProfileWindowOpen(true)}
                  aria-label="Open profile"
                  title="Open profile"
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white px-1 py-1 pl-3 text-xs font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50"
                >
                  <span className="hidden sm:inline">{displayName}</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-bold text-white">{initials}</span>
                </button>
              </div>
            </div>
          </header>

          {location.pathname === "/mentor" || location.pathname === "/echo" ? (
            <main className="flex flex-1 flex-col min-h-0 overflow-hidden">
              <Outlet />
            </main>
          ) : (
            <>
              <main className="flex-1 overflow-x-hidden">
                <div className="mx-auto w-full max-w-[1280px] p-4 sm:p-5 md:p-6 lg:p-8">
                  <Outlet />
                </div>
              </main>

              <footer className="border-t border-white/[0.04] px-6 py-4 text-center text-[11px] text-zinc-600 md:px-8">
                <span className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> StudyShield OS • Crafted for toppers • {new Date().getFullYear()}
                </span>
              </footer>
            </>
          )}
        </div>
      </div>

      {/* Command palette — actually working search */}
      <AnimatePresence mode="wait">
        {commandOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[18vh]" role="dialog" aria-modal="true" aria-label="Search">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCommandOpen(false)} />
            <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className="relative w-full max-w-lg overflow-hidden rounded-[20px] border border-white/10 bg-[#0f0f10] shadow-2xl">
              <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                <Search className="h-4 w-4 shrink-0 text-zinc-500" />
                <input ref={commandInputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search pages, or jump to…" className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none" autoComplete="off" />
                <span className="hidden items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 sm:inline-flex">ESC</span>
                <button onClick={() => setCommandOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-zinc-400 hover:bg-white/15 hover:text-white sm:hidden">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-[50vh] overflow-y-auto p-2">
                {filteredNav.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm font-medium text-white">No results</p>
                    <p className="mt-1 text-xs text-zinc-500">Try “planner”, “vault”, “analytics”…</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredNav.map((n) => (
                      <button
                        key={n.to}
                        onClick={() => {
                          setCommandOpen(false);
                          handleNavSelect();
                          navigate(n.to);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.06]"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-zinc-300">
                          <n.icon className="h-4 w-4" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-white">{n.label}</span>
                          <span className="block text-xs text-zinc-500">{n.desc}</span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600" />
                      </button>
                    ))}
                  </div>
                )}
                {!query.trim() && (
                  <p className="mt-3 border-t border-white/5 px-2 pt-3 text-xs text-zinc-500">Tip: press <span className="rounded bg-white/10 px-1 py-0.5 font-mono text-white">⌘ K</span> anytime</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Echo */}
      {location.pathname !== "/mentor" && (
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => navigate("/mentor")}
          aria-label="Open Echo"
          className="fixed right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-white text-zinc-900 shadow-[0_12px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.1)] md:right-8"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)" }}
        >
          <span className="absolute inset-0 rounded-full bg-gradient-to-br from-accent-500 to-violet-600 opacity-0 transition group-hover:opacity-100" />
          <MessagesSquare className="relative h-6 w-6" />
        </motion.button>
      )}

      <ChapterProgressReminder />
      <StreakPopup
        open={streakOpen}
        streak={streakInfo.current}
        longestStreak={streakInfo.longest}
        displayName={displayName}
        onClose={handleStreakClose}
        onPrimaryAction={handleStreakPrimary}
        onExitComplete={handleStreakExitComplete}
      />

      {/* Profile Window — opened by clicking any user avatar (top-left sidebar card, top bar avatar) */}
      <AnimatePresence>
        {profileWindowOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:items-center sm:pt-4"
            role="dialog"
            aria-modal="true"
            aria-label="Profile window"
            onClick={() => setProfileWindowOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#070708]/70 backdrop-blur-sm"
              aria-hidden="true"
            />
            <motion.div
              ref={profileWindowRef}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="relative w-full max-w-[380px] overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#0f0f10] shadow-[0_24px_64px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.06)_inset]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              <div className="pointer-events-none absolute inset-0 rounded-[24px] bg-gradient-to-b from-white/[0.04] via-transparent to-transparent" />
              {/* Header */}
              <div className="relative p-5">
                <button
                  type="button"
                  onClick={() => setProfileWindowOpen(false)}
                  aria-label="Close profile window"
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/15 transition"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-bold text-white shadow-lg">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                    <p className="truncate text-xs text-zinc-500">{email || "—"}</p>
                    <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
                      <Sparkles className="h-3 w-3 text-accent-400" /> Level {lvl.level} • {lvl.title}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] px-2 py-2.5 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">XP</p>
                    <p className="mt-1 text-sm font-bold text-white">{profile?.xp ?? 0}</p>
                  </div>
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-2 py-2.5 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-300">Streak</p>
                    <p className="mt-1 text-sm font-bold text-white flex items-center justify-center gap-1"><Flame className="h-3 w-3 text-amber-400" /> {streakInfo.current > 0 ? streakInfo.current : (profile?.longest_streak ?? 0)}</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] px-2 py-2.5 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Level</p>
                    <p className="mt-1 text-sm font-bold text-white">{lvl.level}</p>
                  </div>
                </div>
                {(profile?.target_exam || profile?.exam_year) && (
                  <div className="mt-3 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Target</p>
                    <p className="mt-1 text-xs font-medium text-white truncate flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5 text-accent-400" /> {profile?.target_exam ?? "—"} {profile?.exam_year ? `• ${profile.exam_year}` : ""}
                    </p>
                  </div>
                )}
              </div>
              <div className="border-t border-white/[0.06] p-2">
                <button
                  type="button"
                  onClick={() => {
                    setProfileWindowOpen(false);
                    navigate("/profile");
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-white hover:bg-white/[0.06] transition"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-zinc-900">
                    <User className="h-4 w-4" />
                  </span>
                  <span className="flex-1">View full profile</span>
                  <ChevronRight className="h-4 w-4 text-zinc-500" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileWindowOpen(false);
                    navigate("/settings");
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-zinc-400 hover:bg-white/[0.06] hover:text-white transition"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-zinc-400">
                    <SettingsIcon className="h-4 w-4" />
                  </span>
                  <span className="flex-1">Settings</span>
                  <ChevronRight className="h-4 w-4 text-zinc-600" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileWindowOpen(false);
                    navigate("/preferences");
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-zinc-400 hover:bg-white/[0.06] hover:text-white transition"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-zinc-400">
                    <GraduationCap className="h-4 w-4" />
                  </span>
                  <span className="flex-1">Academic preferences</span>
                  <ChevronRight className="h-4 w-4 text-zinc-600" />
                </button>
                <div className="my-2 h-px bg-white/[0.06]" />
                <button
                  type="button"
                  onClick={() => {
                    setProfileWindowOpen(false);
                    void doSignOut();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-zinc-400 hover:bg-white/[0.06] hover:text-white transition"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-zinc-400">
                    <LogOut className="h-4 w-4" />
                  </span>
                  <span className="flex-1">Sign out</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
