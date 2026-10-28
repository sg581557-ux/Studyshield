import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BookOpen,
  Check,
  Clock3,
  Flame,
  Heart,
  Quote,
  RefreshCw,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  X,
  Zap,
  Sun,
  Moon,
  Cloud,
} from "lucide-react";
import { db } from "../services/db";
import { buildDailyCheckin, type EchoCheckinData } from "../services/mentorCheckin";
import { useAuth } from "../context/AuthContext";
import { todayISODate } from "../lib/constants";

const containerVar = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVar = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};

function ToneBadge({ tone, label }: { tone: string; label: string }) {
  const map: Record<string, string> = {
    celebrate: "bg-[#fff0c8] text-[#b45309] border-[#fde68a]",
    push: "bg-[#f3e8ff] text-[#7c3aed] border-[#e9d5ff]",
    recover: "bg-[#dbeafe] text-[#1d4ed8] border-[#bfdbfe]",
    focus: "bg-[#dcfce7] text-[#15803d] border-[#bbf7d0]",
    steady: "bg-white text-[#78716c] border-[#e7e5e4]",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${map[tone] ?? map.steady}`}>
      <Heart className="h-3 w-3 opacity-60" /> {label}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="rounded-[36px] p-[1.5px] bg-gradient-to-br from-[#ffd6e7] via-[#e0c3fc] to-[#a2d2ff]">
      <div className="rounded-[34px] bg-[#fffbf7] p-6 sm:p-7">
        <div className="space-y-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-[#ffe4ec]" />
            <div className="space-y-2">
              <div className="h-3 w-28 rounded-full bg-[#ffe4ec]" />
              <div className="h-2.5 w-20 rounded-full bg-[#f3e8ff]" />
            </div>
          </div>
          <div className="h-7 w-3/5 rounded-2xl bg-[#ffe4ec]" />
          <div className="h-3 w-4/5 rounded-full bg-[#e0e7ff]/60" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-24 rounded-3xl bg-white border border-[#ffe4ec]" />
            <div className="h-24 rounded-3xl bg-white border border-[#e9d5ff]" />
            <div className="h-24 rounded-3xl bg-white border border-[#bfdbfe]" />
          </div>
          <div className="h-32 rounded-3xl bg-white border border-[#fde68a]/50" />
        </div>
      </div>
    </div>
  );
}

export default function MentorCheckinCard() {
  const { profile } = useAuth();
  const [data, setData] = useState<EchoCheckinData | null>(null);
  const [busy, setBusy] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const load = useCallback(
    async (regenerate: boolean) => {
      if (regenerate) setBusy(true);
      try {
        const today = todayISODate();
        let checkin = await db.getDailyCheckin(today);
        const built = await buildDailyCheckin(profile?.target_exam ?? null, profile ?? null);
        if (!built) {
          if (!checkin) setData(null);
          else setData(null);
          return;
        }
        if (!checkin || regenerate) {
          checkin = await db.upsertDailyCheckin({
            date: today,
            message: built.message,
            completed_tasks: built.completedTasks,
            missed_tasks: built.missedTasks,
            focus_score: built.focusScore,
          });
        }
        setData(built.data);
      } finally {
        setBusy(false);
        setInitialLoading(false);
      }
    },
    [profile],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const today = todayISODate();
        let checkin = await db.getDailyCheckin(today);
        const built = await buildDailyCheckin(profile?.target_exam ?? null, profile ?? null);
        if (cancelled) return;
        if (!built) {
          if (!checkin) setData(null);
          return;
        } else {
          if (!checkin) {
            checkin = await db.upsertDailyCheckin({
              date: today,
              message: built.message,
              completed_tasks: built.completedTasks,
              missed_tasks: built.missedTasks,
              focus_score: built.focusScore,
            });
          }
          setData(built.data);
        }
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  if (initialLoading) return <Skeleton />;
  if (!data) return null;

  const { greeting, name, dateLabel, fullDateLabel, personaLine, examLabel, yesterday, streak, focusScore, week, priorities, backlog, mock, warning, advice } = data;
  const displayName = name ?? "there";
  const isMorning = greeting.toLowerCase().includes("morning");
  const isEvening = greeting.toLowerCase().includes("evening");

  return (
    <motion.div variants={containerVar} initial="hidden" animate="show" className="relative">
      {/* gradient border wrapper — the aesthetic frame */}
      <div className="rounded-[36px] p-[1.5px] bg-gradient-to-br from-[#ffd6e7] via-[#e0c3fc] via-[#c4b5fd] to-[#a2d2ff] shadow-[0_20px_60px_rgba(244,114,182,0.15),0_8px_24px_rgba(139,92,246,0.10)]">
        <div className="relative overflow-hidden rounded-[34px] bg-[#fffbf7]">
          {/* soft paper texture */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E")`,
            }}
          />

          {/* pastel blobs — aesthetic glow */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <motion.div
              animate={{ x: [0, 8, 0], y: [0, -6, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-12 -top-16 h-[380px] w-[420px] rounded-full bg-[#ffd6e7]/35 blur-[50px]"
            />
            <motion.div
              animate={{ x: [0, -10, 0], y: [0, 8, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -left-16 -bottom-12 h-[360px] w-[380px] rounded-full bg-[#e0c3fc]/30 blur-[50px]"
            />
            <motion.div
              animate={{ x: [0, 6, 0], y: [0, -8, 0] }}
              transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute left-1/2 top-1/3 h-[300px] w-[520px] -translate-x-1/2 rounded-full bg-[#a2d2ff]/18 blur-[60px]"
            />
            {/* subtle grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black_70%,transparent_110%)] opacity-40" />
          </div>

          {/* top gradient hairline */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#ffd6e7] via-[#c4b5fd] to-[#a2d2ff] opacity-70" />

          {/* washi tape — cute aesthetic detail */}
          <div className="pointer-events-none absolute left-1/2 top-0 z-10 hidden -translate-x-1/2 sm:block">
            <div className="h-[22px] w-[92px] -translate-y-[1px] rounded-b-[10px] bg-[#ffd6e7]/70 shadow-[0_2px_8px_rgba(0,0,0,0.06)] backdrop-blur-md" style={{ backgroundImage: `repeating-linear-gradient(45deg, rgba(255,255,255,0.35) 0 8px, transparent 8px 16px)` }} />
          </div>

          {/* floating sparkles */}
          <motion.div animate={{ y: [0, -4, 0], rotate: [0, 6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none absolute right-10 top-14 hidden text-[#f9a8d4] sm:block">
            <Star className="h-4 w-4 fill-[#f9a8d4]/30" />
          </motion.div>
          <motion.div animate={{ y: [0, 5, 0], rotate: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }} className="pointer-events-none absolute right-[38%] top-10 hidden text-[#c4b5fd]/70 sm:block">
            <Sparkles className="h-3.5 w-3.5" />
          </motion.div>
          <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 1.2 }} className="pointer-events-none absolute left-[28%] top-20 hidden text-[#93c5fd]/60 sm:block">
            <Star className="h-3 w-3 fill-[#93c5fd]/20" />
          </motion.div>

          {/* header — soft & cute */}
          <motion.div variants={itemVar} className="relative flex items-start justify-between gap-3 px-5 sm:px-7 pt-6 sm:pt-7">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="relative shrink-0">
                <div className="flex h-[48px] w-[48px] items-center justify-center rounded-[16px] bg-gradient-to-br from-[#ff9a9e] via-[#fecfef] to-[#a18cd1] shadow-[0_8px_20px_rgba(244,114,182,0.25)] ring-1 ring-white/60">
                  <span className="text-[18px] leading-none">✨</span>
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-[#fde68a]/50">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-serif text-[15px] font-semibold tracking-tight text-[#1c1917]">echo</p>
                  <span className="hidden h-1 w-1 rounded-full bg-[#fecdd3] sm:inline-block" />
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#a78bfa] shadow-sm ring-1 ring-[#ede9fe]">
                    <Heart className="h-3 w-3 fill-[#f9a8d4]/40 text-[#f472b6]" /> Daily letter
                  </span>
                </div>
                <p className="mt-0.5 hidden text-[12px] font-medium leading-none text-[#a8a29e] sm:block">your soft study companion · personalised every morning</p>
                <p className="mt-0.5 text-[11px] font-medium leading-none text-[#a8a29e] sm:hidden">personalised for you</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-[#57534e] shadow-sm ring-1 ring-[#f5f5f4] sm:inline-flex">
                {isMorning ? <Sun className="h-3.5 w-3.5 text-[#f59e0b]" /> : isEvening ? <Moon className="h-3.5 w-3.5 text-[#a78bfa]" /> : <Cloud className="h-3.5 w-3.5 text-[#38bdf8]" />}
                {dateLabel}
              </span>
              <button
                onClick={() => load(true)}
                disabled={busy}
                title="Regenerate — ask Echo again"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#a8a29e] shadow-sm ring-1 ring-[#e7e5e4] transition hover:bg-[#fff7ed] hover:text-[#f472b6] hover:ring-[#ffd6e7] disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
              </button>
            </div>
          </motion.div>

          {/* greeting — aesthetic letter head */}
          <motion.div variants={itemVar} className="relative px-5 sm:px-7 pt-5 sm:pt-6">
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full bg-white/80 px-3.5 py-1.5 text-xs font-medium text-[#78716c] shadow-sm ring-1 ring-[#f5f5f4] backdrop-blur">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#fef3c7] text-[#d97706] ring-1 ring-[#fde68a]/60">
                {isMorning ? <Sun className="h-3.5 w-3.5" /> : isEvening ? <Moon className="h-3.5 w-3.5" /> : <Cloud className="h-3.5 w-3.5" />}
              </span>
              <span className="font-serif font-semibold text-[#44403c]">{fullDateLabel}</span>
              {examLabel ? <span className="hidden sm:inline text-[#a8a29e]">· {examLabel}</span> : null}
              <span className="h-1 w-1 rounded-full bg-[#e7e5e4]" />
              <span className="text-[#a78bfa] font-semibold">tuned just for you ♡</span>
            </div>

            <h3 className="mt-4 font-serif text-[26px] sm:text-[30px] font-[500] leading-[1.15] tracking-[-0.02em] text-[#1c1917]">
              <span className="font-light text-[#57534e]">{greeting.toLowerCase()},</span>{" "}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-[#f43f5e] via-[#a78bfa] to-[#38bdf8] bg-clip-text text-transparent font-semibold">{displayName}</span>
                <svg className="absolute -bottom-1 left-0 w-full h-[8px] text-[#ffd6e7]/60" viewBox="0 0 200 8" preserveAspectRatio="none" aria-hidden>
                  <path d="M2 6 Q 50 1, 100 4 T 198 3" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
                </svg>
              </span>
              <span className="ml-2 font-light text-[#78716c]">—</span>
              <span className="ml-2 text-[18px] sm:text-[20px] font-normal text-[#a8a29e]">echo here</span>
              <span className="ml-1.5 inline-block animate-[float_3s_ease-in-out_infinite]">✨</span>
            </h3>
            <p className="mt-3 max-w-[58ch] text-[13px] leading-relaxed text-[#78716c]">
              {personaLine}
            </p>
          </motion.div>

          {/* body */}
          <div className="relative space-y-3.5 p-4 sm:p-6 pt-5">
            {/* Yesterday — soft paper cards */}
            <motion.div variants={itemVar} className="overflow-hidden rounded-[24px] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.04)] ring-1 ring-[#f5f5f4]">
              <div className="flex items-center justify-between gap-3 bg-[#fffbeb]/60 px-4 sm:px-5 py-3.5">
                <h4 className="flex items-center gap-2 font-serif text-[13px] font-semibold tracking-wide text-[#44403c]">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#fef3c7] text-[#d97706] ring-1 ring-[#fde68a]/60">
                    <Clock3 className="h-3.5 w-3.5" />
                  </span>
                  yesterday
                </h4>
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold tracking-wide text-[#a8a29e] shadow-sm ring-1 ring-[#f5f5f4]">
                  {yesterday.empty ? "fresh slate · new story today" : `${yesterday.completed.length} done · ${yesterday.missed.length} missed`}
                </span>
              </div>

              {yesterday.empty ? (
                <div className="px-5 sm:px-6 py-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fef3c7]/60 text-[#f59e0b] ring-1 ring-[#fde68a]/40">
                    <Star className="h-5 w-5 fill-[#fde68a]/50" />
                  </div>
                  <p className="mt-4 font-serif text-[15px] font-semibold text-[#1c1917]">No tasks yesterday — fresh canvas today 🎨</p>
                  <p className="mx-auto mt-1.5 max-w-[32ch] text-[12px] leading-relaxed text-[#a8a29e]">Echo will paint every win from now — just keep your plan blooming daily.</p>
                  <div className="mt-4 flex justify-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#ffd6e7]" />
                    <span className="h-1.5 w-6 rounded-full bg-[#e9d5ff]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#bfdbfe]" />
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 p-3 sm:p-4 sm:grid-cols-2 bg-[#fffbf7]/50">
                  <div className="rounded-2xl bg-[#f0fdf4] p-3.5 ring-1 ring-[#bbf7d0]/60">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#15803d]">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#16a34a] shadow-sm">
                        <Check className="h-3 w-3" />
                      </span>
                      completed · {yesterday.completed.length}
                    </p>
                    <div className="mt-3 space-y-2">
                      {yesterday.completed.slice(0, 4).map((t, i) => (
                        <div key={i} className="flex items-start gap-2.5 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-[#f5f5f4]">
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#86efac] shadow-[0_0_8px_rgba(34,197,94,0.3)]" />
                          <span className="min-w-0 flex-1 truncate text-[13px] font-medium leading-snug text-[#1c1917]">{t.title}</span>
                          {t.subject ? <span className="hidden shrink-0 rounded-full bg-[#f0fdf4] px-2 py-0.5 text-[10px] font-bold text-[#15803d] ring-1 ring-[#bbf7d0] sm:inline-flex">{t.subject}</span> : null}
                        </div>
                      ))}
                      {yesterday.completed.length === 0 ? <p className="py-2 text-center text-xs font-medium text-[#a8a29e]">Nothing marked done — today is your soft comeback 🌱</p> : null}
                      {yesterday.completed.length > 4 ? <p className="text-center text-[11px] font-semibold text-[#a8a29e]">+{yesterday.completed.length - 4} more little wins</p> : null}
                    </div>
                  </div>

                  <div className={`rounded-2xl p-3.5 ring-1 ${yesterday.missed.length > 0 ? "bg-[#fff7ed] ring-[#fed7aa]/60" : "bg-[#fafaf9] ring-[#f5f5f4]"}`}>
                    <p className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] ${yesterday.missed.length > 0 ? "text-[#c2410c]" : "text-[#a8a29e]"}`}>
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full shadow-sm ${yesterday.missed.length > 0 ? "bg-white text-[#f97316] ring-1 ring-[#fed7aa]" : "bg-white text-[#a8a29e] ring-1 ring-[#e7e5e4]"}`}>
                        <X className="h-3 w-3" />
                      </span>
                      missed · {yesterday.missed.length}
                    </p>
                    <div className="mt-3 space-y-2">
                      {yesterday.missed.slice(0, 4).map((t, i) => (
                        <div key={i} className="flex items-start gap-2.5 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-[#f5f5f4]">
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#fdba74]" />
                          <span className="min-w-0 flex-1 truncate text-[13px] font-medium leading-snug text-[#57534e]">{t.title}</span>
                          {t.subject ? <span className="hidden shrink-0 rounded-full bg-[#fff7ed] px-2 py-0.5 text-[10px] font-bold text-[#c2410c] ring-1 ring-[#fed7aa] sm:inline-flex">{t.subject}</span> : null}
                        </div>
                      ))}
                      {yesterday.missed.length === 0 ? <p className="py-2 text-center text-xs font-medium text-[#a8a29e]">so clean — no misses. keep it cozy today ☁️</p> : null}
                      {yesterday.missed.length > 4 ? <p className="text-center text-[11px] font-semibold text-[#a8a29e]">+{yesterday.missed.length - 4} more</p> : null}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Stats — pastel bento, super soft */}
            <motion.div variants={itemVar} className="grid grid-cols-3 gap-2.5 sm:gap-3">
              <div className="group relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#fff7ed] to-[#ffedd5] p-[1.2px] shadow-sm">
                <div className="rounded-[20px] bg-gradient-to-br from-[#fff7ed] to-white p-3 sm:p-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#f97316] shadow-sm ring-1 ring-[#fed7aa]/50">
                    <Flame className="h-4 w-4" />
                  </div>
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#fb923c]">streak</p>
                  <p className="mt-1 font-serif text-[26px] font-bold leading-none tracking-tight text-[#431407]">{streak}</p>
                  <p className="mt-1 text-[11px] font-semibold text-[#fdba74]">{streak === 0 ? "start today ♡" : streak === 1 ? "day · grow it" : "days strong 🔥"}</p>
                </div>
              </div>
              <div className="rounded-[22px] bg-white p-[1.2px] shadow-sm ring-1 ring-[#f5f5f4]">
                <div className="rounded-[20px] bg-white p-3 sm:p-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5f3ff] text-[#8b5cf6] ring-1 ring-[#ede9fe]">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#a78bfa]">focus</p>
                  <p className="mt-1 font-serif text-[26px] font-bold leading-none tracking-tight text-[#1e1b4b]">{focusScore !== null ? `${focusScore}%` : "—"}</p>
                  <p className="mt-1 text-[11px] font-medium text-[#a8a29e]">7-day focus</p>
                </div>
              </div>
              <div className="rounded-[22px] bg-white p-[1.2px] shadow-sm ring-1 ring-[#f5f5f4]">
                <div className="rounded-[20px] bg-white p-3 sm:p-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ecfdf5] text-[#10b981] ring-1 ring-[#d1fae5]">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#34d399]">week</p>
                  <p className="mt-1 font-serif text-[26px] font-bold leading-none tracking-tight text-[#064e3b]">{week.rate !== null ? `${week.rate}%` : "—"}</p>
                  <p className="mt-1 text-[11px] font-medium text-[#a8a29e]">{week.done}/{week.planned} done</p>
                </div>
              </div>
            </motion.div>

            {/* Priorities — cute timeline */}
            <motion.div variants={itemVar} className="overflow-hidden rounded-[24px] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.04)] ring-1 ring-[#f5f5f4]">
              <div className="flex items-center justify-between gap-3 bg-[#faf5ff]/60 px-4 sm:px-5 py-3.5">
                <h4 className="flex items-center gap-2.5 font-serif text-[13px] font-semibold tracking-wide text-[#44403c]">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#a78bfa] shadow-sm ring-1 ring-[#ede9fe]">
                    <Target className="h-3.5 w-3.5" />
                  </span>
                  today&apos;s little priorities
                </h4>
                <span className="rounded-full bg-[#1c1917] px-3 py-1 text-[11px] font-bold tracking-wide text-white shadow-sm">top {priorities.length}</span>
              </div>
              <div className="relative space-y-0 p-3 sm:p-4">
                {/* dotted timeline line */}
                <div className="pointer-events-none absolute left-[29px] sm:left-[33px] top-6 bottom-6 w-px border-l-2 border-dotted border-[#e7e5e4] hidden sm:block" />
                <div className="space-y-2.5">
                  {priorities.map((p, i) => {
                    const pastel =
                      p.reason === "backlog"
                        ? "bg-[#fff7ed] ring-[#fed7aa]/60 border-[#ffedd5]"
                        : p.reason === "weak"
                          ? "bg-[#fef2f2] ring-[#fecaca]/60 border-[#fee2e2]"
                          : p.reason === "generate"
                            ? "bg-[#faf5ff] ring-[#e9d5ff]/60 border-[#f3e8ff]"
                            : "bg-[#f0f9ff] ring-[#bae6fd]/60 border-[#e0f2fe]";
                    const numBg =
                      p.reason === "backlog"
                        ? "bg-[#f97316] text-white"
                        : p.reason === "weak"
                          ? "bg-[#f43f5e] text-white"
                          : p.reason === "generate"
                            ? "bg-[#a78bfa] text-white"
                            : "bg-[#0ea5e9] text-white";
                    const dot = p.reason === "backlog" ? "bg-[#fb923c]" : p.reason === "weak" ? "bg-[#f43f5e]" : p.reason === "generate" ? "bg-[#a78bfa]" : "bg-[#38bdf8]";
                    return (
                      <div key={i} className={`group relative flex items-start gap-3 rounded-2xl border bg-white px-3.5 py-3.5 shadow-sm ring-1 transition hover:shadow-md hover:-translate-y-[1px] ${pastel}`}>
                        <span className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold shadow-sm ${numBg}`}>{i + 1}</span>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <p className="text-[13.5px] font-semibold leading-snug text-[#1c1917]">{p.title}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {p.subject ? <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#57534e] shadow-sm ring-1 ring-[#f5f5f4]">{p.subject}</span> : null}
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${
                                p.reason === "backlog"
                                  ? "bg-white text-[#ea580c] ring-[#fed7aa]"
                                  : p.reason === "weak"
                                    ? "bg-white text-[#e11d48] ring-[#fecaca]"
                                    : p.reason === "generate"
                                      ? "bg-white text-[#7c3aed] ring-[#e9d5ff]"
                                      : "bg-white text-[#0284c7] ring-[#bae6fd]"
                              }`}
                            >
                              {p.reason === "backlog" ? "backlog" : p.reason === "weak" ? "weak spot" : p.reason === "generate" ? "let's plan" : "planned"}
                            </span>
                          </div>
                        </div>
                        <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_10px_currentColor] ${dot} text-white`} />
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-wrap gap-2.5 bg-[#fffbf7]/70 px-3 sm:px-4 py-4">
                <Link to="/planner" className="inline-flex items-center gap-2 rounded-full bg-[#1c1917] px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_8px_20px_rgba(0,0,0,0.12)] transition hover:bg-black hover:scale-[1.02]">
                  <Zap className="h-4 w-4 text-[#fde68a]" /> Open AI Planner
                </Link>
                <Link to="/mentor" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13px] font-bold text-[#44403c] shadow-sm ring-1 ring-[#e7e5e4] transition hover:bg-[#fff7ed] hover:ring-[#ffd6e7]">
                  <BookOpen className="h-4 w-4 text-[#a78bfa]" /> Ask Echo
                </Link>
              </div>
            </motion.div>

            {/* Mock + Backlog — pastel mini cards */}
            {(mock || backlog) && (
              <motion.div variants={itemVar} className="grid gap-3 sm:grid-cols-2">
                {mock ? (
                  <div className="rounded-[22px] bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.04)] ring-1 ring-[#f5f5f4]">
                    <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#a78bfa]">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#faf5ff] ring-1 ring-[#ede9fe]">
                        <Trophy className="h-3.5 w-3.5" />
                      </span>
                      latest mock
                    </p>
                    <p className="mt-3 truncate font-serif text-[15px] font-semibold leading-tight text-[#1c1917]">{mock.name}</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-serif text-[28px] font-bold leading-none tracking-tight text-[#1c1917]">{mock.pct}%</span>
                      <span className="rounded-full bg-[#f5f3ff] px-2 py-1 text-[11px] font-bold text-[#7c3aed] ring-1 ring-[#ede9fe]">{mock.obtained}/{mock.total}</span>
                    </div>
                    {mock.weakest ? (
                      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#fef2f2] px-3 py-1 text-[11px] font-bold text-[#e11d48] ring-1 ring-[#fecaca]">
                        <Heart className="h-3 w-3 fill-[#fecaca]" /> weakest: {mock.weakest.subject} · {mock.weakest.avgPct}%
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {backlog ? (
                  <div className="rounded-[22px] bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.04)] ring-1 ring-[#f5f5f4]">
                    <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#0ea5e9]">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f0f9ff] ring-1 ring-[#e0f2fe]">
                        <Clock3 className="h-3.5 w-3.5" />
                      </span>
                      backlog
                    </p>
                    <p className="mt-3 truncate font-serif text-[15px] font-semibold leading-tight text-[#1c1917]">{backlog.firstLabel ?? "Pending items"}</p>
                    <p className="mt-2 text-[13px] font-medium text-[#57534e]">
                      <span className="rounded-full bg-[#1c1917] px-2.5 py-1 text-xs font-bold text-white">{backlog.pendingItems} items</span>
                      <span className="mx-2 text-[#e7e5e4]">·</span>
                      <span className="font-bold text-[#0c4a6e]">{backlog.pendingLectures} lectures</span> pending
                    </p>
                    <Link to="/backlogs" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#f0f9ff] px-3 py-1.5 text-xs font-bold text-[#0284c7] ring-1 ring-[#e0f2fe] transition hover:bg-[#e0f2fe]">
                      clear it now <Target className="h-3 w-3" />
                    </Link>
                  </div>
                ) : null}
              </motion.div>
            )}

            {/* Warning — soft peach alert */}
            {warning ? (
              <motion.div variants={itemVar} className="flex gap-3 rounded-[20px] bg-[#fff7ed] px-4 py-4 ring-1 ring-[#fed7aa]/60">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-white shadow-sm">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="font-serif text-xs font-bold uppercase tracking-[0.12em] text-[#9a3412]">gentle heads up</p>
                  <p className="mt-1 text-[13px] font-medium leading-relaxed text-[#7c2d12]">{warning}</p>
                </div>
              </motion.div>
            ) : null}

            {/* Echo advice — letter card, the star */}
            <motion.div variants={itemVar} className="relative overflow-hidden rounded-[24px] bg-white p-[1.2px] shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
              <div className="rounded-[22px] bg-gradient-to-br from-[#fffbf7] via-white to-[#faf5ff] p-5 sm:p-6">
                {/* tape */}
                <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2">
                  <div className="h-3 w-16 rounded-b-full bg-[#fde68a]/60 shadow-sm" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1c1917] text-white shadow-sm">
                      <Quote className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-serif text-[13px] font-bold tracking-tight text-[#1c1917]">a note from echo ♡</p>
                      <p className="text-[11px] font-medium text-[#a8a29e]">just for you, {displayName.toLowerCase()}</p>
                    </div>
                  </div>
                  <ToneBadge tone={advice.tone} label={advice.label} />
                </div>

                <div className="relative mt-5">
                  <span className="absolute -left-1 -top-2 font-serif text-[42px] leading-none text-[#fde68a]/60">“</span>
                  <p className="relative pl-6 font-serif text-[15.5px] font-[500] leading-[1.65] text-[#1c1917]">{advice.text}</p>
                  <span className="absolute -bottom-4 right-0 font-serif text-[42px] leading-none text-[#e9d5ff]/60">”</span>
                </div>

                <div className="mt-6 flex items-center justify-between gap-3 border-t border-dotted border-[#e7e5e4] pt-4">
                  <p className="font-serif text-[11px] font-medium italic text-[#a8a29e]">— echo, tuned to your {examLabel ? `${examLabel} prep` : "prep"} · {dateLabel}</p>
                  <span className="hidden items-center gap-1 rounded-full bg-[#fef3c7] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#92400e] ring-1 ring-[#fde68a] sm:inline-flex">
                    <Star className="h-3 w-3 fill-[#f59e0b]/30" /> personal
                  </span>
                </div>
              </div>
            </motion.div>

            <p className="px-2 text-center font-serif text-[11px] italic leading-relaxed text-[#a8a29e]">
              a little letter every midnight · made with ♡ by echo from your real wins & wishes ·{" "}
              <Link to="/planner" className="font-sans font-bold not-italic text-[#a78bfa] underline decoration-[#e9d5ff] underline-offset-4 hover:text-[#7c3aed]">
                view full plan →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
