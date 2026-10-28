import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  Flame,
  Clock,
  ArrowRight,
  CircleCheck,
  Trophy,
  Target,
  TrendingUp,
  Zap,
  BookOpen,
  Play,
  Timer as TimerIcon,
  ChevronRight,
  Award,
  Activity,
  CalendarDays,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/db";
import { ProgressBar, ProgressRing } from "../../components/ui";
import MentorCheckinCard from "../../components/MentorCheckinCard";
import { levelFromXP, minutesToHM, todayISODate } from "../../lib/constants";
import type { PlanTask } from "../../lib/types";
import { CrazyListSkeleton, CrazyStatsSkeleton } from "../../components/loaders/AestheticLoader";

function useGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export default function DashboardHome() {
  const { profile, user, loading: authLoading } = useAuth();
  const [today, setToday] = useState<PlanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStreak, setCurrentStreak] = useState<number | null>(null);
  useEffect(() => {
    db.getTasksForDate(todayISODate())
      .then(setToday)
      .catch(() => setToday([]))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    // Current streak includes plan generation (so 1 on day one) — max 1/day
    db.getStudyStats().then((s) => setCurrentStreak(s?.streak_days ?? null)).catch(() => setCurrentStreak(null));
    const h = (e: Event) => {
      const d = (e as CustomEvent).detail as number | undefined;
      if (typeof d === "number" && d > 0) setCurrentStreak(d);
    };
    window.addEventListener("studyshield:streak-updated" as unknown as string, h as EventListener);
    return () => window.removeEventListener("studyshield:streak-updated" as unknown as string, h as EventListener);
  }, []);

  const greeting = useGreeting();
  const emailName = user?.email ? user.email.split("@")[0].replace(/[._-]/g, " ") : "";
  const name = authLoading ? "…" : profile?.display_name || profile?.full_name || emailName || "there";
  const lvl = levelFromXP(profile?.xp ?? 0);
  const done = today.filter((t) => t.completed).length;
  const totalMin = today.reduce((a, t) => a + t.estimated_minutes, 0);
  const completionPct = today.length ? Math.round((done / today.length) * 100) : 0;
  const xpToNext = lvl.needed - lvl.current;
  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const shortDate = now.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 pb-24 md:pb-0 overflow-x-hidden">
      {/* ── Hero Bento ── */}
      <motion.div variants={item} className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0f0f10]">
        {/* aurora */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-600/20 via-violet-600/15 to-transparent" />
          <div className="absolute -right-24 -top-32 h-[480px] w-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(56,177,255,0.18),transparent_65%)] blur-2xl" />
          <div className="absolute -left-24 -bottom-24 h-[420px] w-[520px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.14),transparent_65%)] blur-2xl" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_10%,black_60%,transparent_100%)]" />
        </div>

        <div className="relative grid gap-6 p-5 sm:p-6 md:grid-cols-[1.7fr_0.9fr] md:p-8 lg:p-9">
          {/* left */}
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-zinc-900">
                <Sparkles className="h-3 w-3" />
              </span>
              {shortDate} • Study OS active
              <span className="hidden h-1 w-1 rounded-full bg-emerald-400 sm:inline-block" />
              <span className="hidden text-zinc-300 sm:inline">Level {lvl.level} • {lvl.title}</span>
            </div>

            <h1 className="mt-4 text-[24px] sm:text-[28px] font-semibold leading-[1.05] tracking-tight text-white md:text-[34px] break-words">
              {greeting}, <span className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent break-words">{name}</span>
            </h1>
            <p className="mt-2 max-w-[560px] text-sm leading-relaxed text-zinc-400">
              You have <span className="font-semibold text-white">{today.length} tasks</span> lined up today — {minutesToHM(totalMin)} of focused work. Let&apos;s make it count.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/20">
                <Flame className="h-3.5 w-3.5" /> {(currentStreak ?? profile?.longest_streak ?? 0)} day streak
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 ring-1 ring-white/10">
                <Clock className="h-3.5 w-3.5 text-accent-400" /> {minutesToHM(totalMin)} planned
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/20">
                <Target className="h-3.5 w-3.5" /> {done}/{today.length} done
              </span>
            </div>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link
                to="/planner"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 shadow-lg shadow-black/20 transition hover:bg-zinc-100"
              >
                <Zap className="h-4 w-4" /> Generate today&apos;s plan
              </Link>
              <Link
                to="/mentor"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10"
              >
                <BookOpen className="h-4 w-4" /> Ask Echo
              </Link>
            </div>

            <p className="mt-4 text-[11px] tracking-wide text-zinc-500">{dateLabel} • {profile?.target_exam ? `Target: ${profile.target_exam}` : "Set your target exam in Settings to personalize"}</p>
          </div>

          {/* right — level card */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] p-4 sm:p-5 backdrop-blur-xl md:p-6">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-accent-500/20 to-violet-500/20 blur-2xl" />
            <div className="relative flex items-start justify-between gap-3 sm:gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                <ProgressRing
                  value={lvl.pct}
                  size={76}
                  strokeWidth={7}
                  label={
                    <div className="text-center leading-none">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Level</p>
                      <p className="mt-1 text-2xl font-bold text-white">{lvl.level}</p>
                    </div>
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-zinc-900">
                    <Trophy className="h-3 w-3 text-amber-500" /> {profile?.xp ?? 0} XP
                  </p>
                  <p className="mt-2 text-xs font-medium text-white truncate">
                    {xpToNext} XP to <span className="text-zinc-400">Level {lvl.level + 1}</span>
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-500">{lvl.current} / {lvl.needed} this level</p>
                </div>
              </div>
              <span className="hidden rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-300 md:inline-flex">Scholar</span>
            </div>

            <div className="relative mt-6 space-y-3">
              <div className="h-2 overflow-hidden rounded-full bg-white/10 p-1">
                <motion.div initial={{ width: 0 }} animate={{ width: `${lvl.pct}%` }} transition={{ duration: 1, ease: "easeOut", delay: 0.4 }} className="h-full rounded-full bg-gradient-to-r from-accent-500 to-violet-500" />
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-500">Progress to next level</span>
                <span className="font-semibold text-white">{lvl.pct}%</span>
              </div>
              <Link to="/analytics" className="flex items-center justify-between rounded-xl bg-white px-3.5 py-2.5 text-xs font-semibold text-zinc-900 transition hover:bg-zinc-100">
                View growth insights <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Stats Bento ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <motion.div variants={item} className="group relative overflow-hidden rounded-[22px] border border-white/[0.06] bg-[#0f0f10] p-4 sm:p-5 transition hover:border-white/10">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-accent-500/10 blur-2xl transition group-hover:bg-accent-500/15" />
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-zinc-900">
              <CircleCheck className="h-4 w-4" />
            </div>
            <p className="mt-4 text-[26px] sm:text-3xl font-bold tracking-tight text-white">
              {done}
              <span className="text-xl font-medium text-zinc-600">/{today.length || "—"}</span>
            </p>
            <p className="mt-1 text-xs font-medium text-zinc-500">Tasks completed</p>
            <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-400">
              <TrendingUp className="h-3 w-3" /> {completionPct}% done
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="group relative overflow-hidden rounded-[22px] border border-white/[0.06] bg-[#0f0f10] p-4 sm:p-5 transition hover:border-white/10">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-violet-500/10 blur-2xl transition group-hover:bg-violet-500/15" />
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-accent-500 text-white">
              <Activity className="h-4 w-4" />
            </div>
            <p className="mt-4 text-[26px] sm:text-3xl font-bold tracking-tight text-white">{completionPct}%</p>
            <p className="mt-1 text-xs font-medium text-zinc-500">Day completion</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
              <motion.div initial={{ width: 0 }} animate={{ width: `${completionPct}%` }} transition={{ duration: 0.9, delay: 0.3 }} className="h-full rounded-full bg-gradient-to-r from-violet-500 to-accent-500" />
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="group relative overflow-hidden rounded-[22px] border border-white/[0.06] bg-[#0f0f10] p-4 sm:p-5 transition hover:border-white/10">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-amber-500/10 blur-2xl transition group-hover:bg-amber-500/15" />
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white">
              <Clock className="h-4 w-4" />
            </div>
            <p className="mt-4 text-[26px] sm:text-3xl font-bold tracking-tight text-white">{minutesToHM(totalMin)}</p>
            <p className="mt-1 text-xs font-medium text-zinc-500">Planned today</p>
            <p className="mt-3 text-[11px] text-zinc-500">
              {totalMin > 0 ? `Avg ${(totalMin / Math.max(1, today.length)).toFixed(0)}m / task` : "No tasks yet"}
            </p>
          </div>
        </motion.div>

        <motion.div variants={item} className="group relative overflow-hidden rounded-[22px] border border-white/[0.06] bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-[#0f0f10] p-4 sm:p-5 transition hover:border-amber-500/20">
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/20">
              <Flame className="h-4 w-4" />
            </div>
            <p className="mt-4 text-[26px] sm:text-3xl font-bold tracking-tight text-white">{(currentStreak ?? profile?.longest_streak ?? 0)}</p>
            <p className="mt-1 text-xs font-medium text-zinc-400">{currentStreak !== null && currentStreak !== (profile?.longest_streak ?? 0) ? "Current streak" : "Longest streak"}</p>
            <p className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300">
              <Award className="h-3 w-3" /> Keep it burning
            </p>
          </div>
        </motion.div>
      </div>

      {/* ── Mentor check-in ── */}
      <motion.div variants={item}>
        <MentorCheckinCard />
      </motion.div>

      {/* ── Main bento: Today's plan + side stack ── */}
      <div className="grid gap-5 lg:grid-cols-[1.75fr_0.95fr]">
        {/* Today's plan */}
        <motion.div variants={item} className="overflow-hidden rounded-[24px] border border-white/[0.07] bg-[#0f0f10]">
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-4 sm:px-5 md:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-zinc-900">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Today&apos;s plan</h3>
                <p className="text-xs text-zinc-500">
                  {today.length ? `${done} of ${today.length} complete • ${completionPct}%` : "No tasks scheduled"}
                </p>
              </div>
            </div>
            <Link to="/planner" className="hidden items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-100 md:inline-flex">
              Open planner <ArrowRight className="h-3 w-3" />
            </Link>
            <Link to="/planner" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-900 md:hidden">
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="p-4 sm:p-5 md:p-6">
            {loading ? (
              <CrazyListSkeleton count={4} />
            ) : today.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-zinc-900">
                  <CircleCheck className="h-6 w-6" />
                </div>
                <p className="mt-4 text-sm font-semibold text-white">No tasks yet for today</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">Your AI planner can build a personalised schedule in seconds — tuned to your energy and coaching.</p>
                <Link to="/planner" className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100">
                  <Sparkles className="h-4 w-4" /> Generate a plan <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <ProgressBar value={completionPct} className="h-2 bg-white/5" />
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="font-medium text-zinc-400">{done} completed</span>
                    <span className="font-semibold text-white">{completionPct}%</span>
                    <span className="text-zinc-500">{today.length - done} remaining</span>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {today.slice(0, 6).map((t, idx) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className={`group flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition ${t.completed ? "border-white/[0.04] bg-white/[0.02] opacity-60" : "border-white/[0.06] bg-white/[0.04] hover:border-white/10 hover:bg-white/[0.06]"}`}
                    >
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${t.completed ? "bg-emerald-500" : "bg-accent-500 shadow-[0_0_8px_rgba(56,177,255,0.5)]"}`} />
                      <span className={`flex-1 truncate text-sm ${t.completed ? "text-zinc-500 line-through" : "font-medium text-zinc-100"}`}>{t.title}</span>
                      {t.subject && (
                        <span className="hidden shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-300 sm:inline-flex">
                          {t.subject}
                        </span>
                      )}
                      <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-zinc-900">{minutesToHM(t.estimated_minutes)}</span>
                    </motion.div>
                  ))}
                </div>
                {today.length > 6 && (
                  <Link to="/planner" className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white hover:bg-white/10">
                    +{today.length - 6} more tasks <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </>
            )}
          </div>
        </motion.div>

        {/* Right stack */}
        <div className="space-y-5">
          {/* Focus / quick actions */}
          <motion.div variants={item} className="overflow-hidden rounded-[24px] border border-white/[0.07] bg-[#0f0f10] p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" /> Quick actions
            </h3>
            <p className="mt-1 text-xs text-zinc-500">Jump into your next win.</p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-2.5">
              <Link to="/timer" className="group flex flex-col gap-3 rounded-2xl border border-white/10 bg-white p-4 text-zinc-900 transition hover:bg-zinc-50">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-white">
                  <TimerIcon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">Focus Timer</span>
                  <span className="block text-xs text-zinc-500">Start deep work</span>
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold">
                  Start <Play className="h-3 w-3" />
                </span>
              </Link>
              <Link to="/backlogs" className="group flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-white backdrop-blur transition hover:bg-white/[0.06]">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-zinc-900">
                  <Target className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">Add backlog</span>
                  <span className="block text-xs text-zinc-400">Clear pending</span>
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent-300">
                  Add <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
              <Link to="/vault" className="group flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-white transition hover:bg-white/[0.06]">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-accent-500 text-white">
                  <BookOpen className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">Formula Vault</span>
                  <span className="block text-xs text-zinc-400">Revise fast</span>
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-300">
                  Open <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
              <Link to="/analytics" className="group flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-white transition hover:bg-white/[0.06]">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white">
                  <TrendingUp className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">Analytics</span>
                  <span className="block text-xs text-zinc-400">See growth</span>
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
                  View <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            </div>
          </motion.div>

          {/* Streak mini */}
          <motion.div variants={item} className="relative overflow-hidden rounded-[24px] border border-amber-500/15 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-[#0f0f10] p-5">
            <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-amber-500/20 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Flame className="h-4 w-4 text-amber-400" /> Streak power
                </h3>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-zinc-900">{profile?.longest_streak ?? 0} days</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-300">
                Consistency beats intensity. You&apos;re building a habit the toppers swear by.
              </p>
              <div className="mt-4 flex gap-1.5">
                {Array.from({ length: 7 }).map((_, i) => {
                  const displayStreak = currentStreak ?? profile?.longest_streak ?? 0;
                  const active = i < Math.min(7, displayStreak % 7 || (done > 0 ? 1 : 0) || (displayStreak > 0 ? 1 : 0));
                  return (
                    <div key={i} className={`h-8 flex-1 rounded-xl border ${active ? "border-amber-500/30 bg-amber-500 text-white" : "border-white/10 bg-white/5 text-zinc-500"} flex items-center justify-center text-xs font-semibold`}>
                      {active ? "✓" : "·"}
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-center text-[11px] text-zinc-500">7-day window • Don&apos;t break the chain</p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
