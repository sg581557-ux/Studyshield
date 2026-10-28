import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Clock,
  Flame,
  Trophy,
  Target,
  TrendingUp,
  Activity,
  CalendarDays,
  Zap,
  Award,
  Timer as TimerIcon,
  BookOpen,
  Sparkles,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/db";
import { SUBJECT_COLORS, minutesToHM, levelFromXP } from "../../lib/constants";
import { Card, CardBody, ProgressBar } from "../../components/ui";
import type { FocusSession, PlanTask } from "../../lib/types";
import { CrazyChartSkeleton, CrazyStatsSkeleton, CrazyGridSkeleton } from "../../components/loaders/AestheticLoader";

type Range = 7 | 30 | 90;

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}
function fromISO(s: string) {
  return new Date(s + "T00:00:00");
}
function rangeDates(days: number): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(toISO(d));
  }
  return out;
}
function fmtShort(iso: string) {
  const d = fromISO(iso);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}
function fmtWeekday(iso: string) {
  const d = fromISO(iso);
  return d.toLocaleDateString("en-IN", { weekday: "short" });
}

export default function Analytics() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>(7);

  useEffect(() => {
    Promise.all([db.getAllTasks(), db.getFocusSessions()])
      .then(([t, s]) => {
        setTasks(t);
        setSessions(s);
      })
      .finally(() => setLoading(false));
  }, []);

  const lvl = levelFromXP(profile?.xp ?? 0);

  // derived
  const totalMin = useMemo(() => tasks.reduce((a, t) => a + t.estimated_minutes, 0), [tasks]);
  const completedMin = useMemo(() => tasks.filter((t) => t.completed).reduce((a, t) => a + t.estimated_minutes, 0), [tasks]);
  const focusMin = useMemo(() => sessions.filter((s) => s.completed).reduce((a, s) => a + (s.duration_minutes ?? s.minutes ?? 0), 0), [sessions]);
  const focusCount = useMemo(() => sessions.filter((s) => s.completed).length, [sessions]);
  const completionRate = totalMin ? Math.round((completedMin / totalMin) * 100) : 0;

  const byType: Record<string, number> = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of tasks) m[t.type] = (m[t.type] ?? 0) + t.estimated_minutes;
    return m;
  }, [tasks]);
  const bySubject: Record<string, number> = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of tasks) {
      const k = t.subject ?? "General";
      m[k] = (m[k] ?? 0) + t.estimated_minutes;
    }
    return m;
  }, [tasks]);
  const bySubjectDone: Record<string, number> = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of tasks.filter((t) => t.completed)) {
      const k = t.subject ?? "General";
      m[k] = (m[k] ?? 0) + t.estimated_minutes;
    }
    return m;
  }, [tasks]);

  const dates = useMemo(() => rangeDates(range), [range]);
  const perDay = useMemo(() => {
    const map = new Map<string, { total: number; done: number; count: number; doneCount: number }>();
    for (const d of dates) map.set(d, { total: 0, done: 0, count: 0, doneCount: 0 });
    for (const t of tasks) {
      const iso = t.scheduled_date ?? "";
      if (!map.has(iso)) continue;
      const cur = map.get(iso)!;
      cur.total += t.estimated_minutes;
      cur.count += 1;
      if (t.completed) {
        cur.done += t.estimated_minutes;
        cur.doneCount += 1;
      }
    }
    // focus per day
    const focusMap = new Map<string, number>();
    for (const s of sessions.filter((s) => s.completed)) {
      const iso = (s.started_at ?? s.date ?? "").slice(0, 10);
      if (!iso || !map.has(iso)) continue;
      const v = s.duration_minutes ?? s.minutes ?? 0;
      focusMap.set(iso, (focusMap.get(iso) ?? 0) + v);
    }
    return dates.map((d) => ({
      date: d,
      label: fmtShort(d),
      wd: fmtWeekday(d),
      total: map.get(d)!.total,
      done: map.get(d)!.done,
      count: map.get(d)!.count,
      doneCount: map.get(d)!.doneCount,
      focus: focusMap.get(d) ?? 0,
    }));
  }, [dates, tasks, sessions]);

  const maxDayTotal = Math.max(1, ...perDay.map((d) => d.total));
  const maxType = Math.max(1, ...Object.values(byType));
  const maxSubject = Math.max(1, ...Object.values(bySubject));

  const bestDay = useMemo(() => [...perDay].sort((a, b) => b.done - a.done)[0], [perDay]);
  const avgPerDay = useMemo(() => {
    const filled = perDay.filter((d) => d.total > 0);
    if (filled.length === 0) return 0;
    return Math.round(filled.reduce((a, d) => a + d.total, 0) / perDay.length);
  }, [perDay]);

  // heatmap 28 days (4 weeks)
  const heatmapDays = useMemo(() => rangeDates(28), []);
  const heatmapMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tasks) if (t.completed && t.scheduled_date) m.set(t.scheduled_date, (m.get(t.scheduled_date) ?? 0) + t.estimated_minutes);
    return m;
  }, [tasks]);
  const heatMax = Math.max(1, ...Array.from(heatmapMap.values()), 1);

  if (loading) {
    return (
      <div className="space-y-5">
        <CrazyStatsSkeleton count={4} />
        <CrazyChartSkeleton />
        <CrazyGridSkeleton count={6} />
      </div>
    );
  }

  const isEmpty = tasks.length === 0 && sessions.length === 0;

  return (
    <div className="space-y-5 pb-24 md:pb-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-[22px] font-semibold tracking-tight text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-zinc-900 shadow-sm">
              <BarChart3 className="h-5 w-5" />
            </span>
            Analytics
            <span className="hidden rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-400 sm:inline-flex">Study OS • Insights</span>
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">Your momentum, decoded. Track streaks, focus, and where your time goes.</p>
        </div>
        <div className="flex items-center gap-2">
          {([7, 30, 90] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${range === r ? "bg-white text-zinc-900 shadow-sm" : "bg-white/[0.06] text-zinc-400 border border-white/10 hover:bg-white/10 hover:text-white"}`}
            >
              {r === 90 ? "90D" : `${r}D`}
            </button>
          ))}
        </div>
      </div>

      {isEmpty ? (
        <Card>
          <CardBody className="py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-zinc-900 shadow-sm">
              <BarChart3 className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-white">No data yet</h3>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-zinc-500">Start with your AI planner or a focus session — your stats will light up here.</p>
          </CardBody>
        </Card>
      ) : (
        <>
          {/* KPI bento — 2-col on phone, tighter padding */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="group relative overflow-hidden rounded-[22px] border border-white/[0.06] bg-[#0f0f10] p-4 sm:p-5">
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-accent-500/10 blur-2xl" />
              <div className="relative">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-zinc-900">
                  <Target className="h-4 w-4" />
                </div>
                <p className="mt-3 text-[26px] sm:text-3xl font-bold tracking-tight text-white">{completionRate}%</p>
                <p className="mt-1 text-xs font-medium text-zinc-500">Completion rate</p>
                <div className="mt-3">
                  <ProgressBar value={completionRate} />
                </div>
              </div>
            </div>
            <div className="group relative overflow-hidden rounded-[22px] border border-white/[0.06] bg-[#0f0f10] p-4 sm:p-5">
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-violet-500/10 blur-2xl" />
              <div className="relative">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-accent-500 text-white">
                  <Clock className="h-4 w-4" />
                </div>
                <p className="mt-3 text-[26px] sm:text-3xl font-bold tracking-tight text-white">{minutesToHM(totalMin)}</p>
                <p className="mt-1 text-xs font-medium text-zinc-500">Total planned</p>
                <p className="mt-2 text-[11px] sm:text-xs text-zinc-500">
                  {minutesToHM(completedMin)} done • {minutesToHM(avgPerDay)}/d
                </p>
              </div>
            </div>
            <div className="group relative overflow-hidden rounded-[22px] border border-white/[0.06] bg-[#0f0f10] p-4 sm:p-5">
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-amber-500/10 blur-2xl" />
              <div className="relative">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white">
                  <TimerIcon className="h-4 w-4" />
                </div>
                <p className="mt-3 text-[26px] sm:text-3xl font-bold tracking-tight text-white">{minutesToHM(focusMin)}</p>
                <p className="mt-1 text-xs font-medium text-zinc-500">Deep focus</p>
                <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[11px] sm:text-xs font-medium text-zinc-400">
                  <Zap className="h-3 w-3 text-amber-400" /> {focusCount}×
                </p>
              </div>
            </div>
            <div className="group relative overflow-hidden rounded-[22px] border border-amber-500/15 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-[#0f0f10] p-4 sm:p-5">
              <div className="relative">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                  <Flame className="h-4 w-4" />
                </div>
                <p className="mt-4 flex items-baseline gap-2 text-3xl font-bold tracking-tight text-white">
                  {profile?.longest_streak ?? 0}
                  <span className="text-sm font-medium text-amber-300">days</span>
                </p>
                <p className="mt-1 text-xs font-medium text-zinc-400">Longest streak • Lv {lvl.level}</p>
                <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-300">
                  <Trophy className="h-3 w-3" /> {lvl.pct}% to next level
                </p>
              </div>
            </div>
          </div>

          {/* Weekly trend + Subject */}
          <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
            <Card className="overflow-hidden">
              <CardBody className="pb-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Activity className="h-4 w-4 text-accent-400" /> Last {range} days
                    </h3>
                    <p className="mt-1 text-xs text-zinc-500">Planned vs completed • focus overlay</p>
                  </div>
                  <span className="self-start rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-zinc-400 border border-white/10 shrink-0">
                    {perDay.filter((d) => d.count > 0).length}/{range} active
                  </span>
                </div>

                {/* scrollable on 30/90D, fits 7D */}
                <div className="mt-6 -mx-5 sm:-mx-6 overflow-x-auto no-scrollbar">
                  <div className="flex items-end gap-1.5 sm:gap-2 px-5 sm:px-6 pb-1" style={{ minWidth: range === 90 ? 720 : range === 30 ? 520 : undefined }}>
                  {perDay.map((d) => {
                    const hTotal = maxDayTotal ? Math.round((d.total / maxDayTotal) * 100) : 0;
                    const hDone = maxDayTotal ? Math.round((d.done / maxDayTotal) * 100) : 0;
                    const hFocus = maxDayTotal ? Math.round((d.focus / maxDayTotal) * 100) : 0;
                    return (
                      <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5 min-w-0">
                        <div className="flex w-full justify-center gap-1 h-[96px] items-end">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${hTotal}%` }}
                            transition={{ duration: 0.6, delay: 0.05 }}
                            className="w-full max-w-[28px] rounded-full bg-white/10"
                            title={`${d.label}: ${minutesToHM(d.total)} planned`}
                          />
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${hDone}%` }}
                            transition={{ duration: 0.6, delay: 0.12 }}
                            className="w-full max-w-[28px] rounded-full bg-gradient-to-t from-accent-600 to-accent-400"
                            title={`${minutesToHM(d.done)} done`}
                          />
                          {d.focus > 0 && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${hFocus}%` }}
                              transition={{ duration: 0.6, delay: 0.18 }}
                              className="w-1.5 shrink-0 rounded-full bg-amber-500"
                              title={`${minutesToHM(d.focus)} focus`}
                            />
                          )}
                        </div>
                        <span className={`text-[10px] font-medium ${d.count === 0 ? "text-zinc-600" : "text-zinc-400"}`}>{d.wd.slice(0, 2)}</span>
                        {d.done > 0 && <span className="h-1 w-1 rounded-full bg-emerald-500" />}
                      </div>
                    );
                  })}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-center gap-4 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-zinc-500">
                    <span className="h-2 w-2 rounded-full bg-white/10" /> Planned
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-zinc-500">
                    <span className="h-2 w-2 rounded-full bg-accent-500" /> Done
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-zinc-500">
                    <span className="h-2 w-1 rounded-full bg-amber-500" /> Focus
                  </span>
                </div>

                {bestDay && bestDay.done > 0 && (
                  <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/10 px-3 py-2.5 text-xs">
                    <Award className="h-4 w-4 text-emerald-400" />
                    <span className="font-medium text-emerald-300">Best day:</span>
                    <span className="text-zinc-300">
                      {fmtShort(bestDay.date)} — {minutesToHM(bestDay.done)} done • {bestDay.doneCount} tasks
                    </span>
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <BookOpen className="h-4 w-4 text-violet-400" /> Time by subject
                </h3>
                <p className="mt-1 text-xs text-zinc-500">Where your hours go</p>
                {Object.keys(bySubject).length === 0 ? (
                  <p className="mt-6 text-sm text-zinc-500">No subject data yet.</p>
                ) : (
                  <div className="mt-5 space-y-3">
                    {Object.entries(bySubject)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 6)
                      .map(([subj, min]) => {
                        const doneMin = bySubjectDone[subj] ?? 0;
                        const pct = maxSubject ? Math.round((min / maxSubject) * 100) : 0;
                        const donePct = min ? Math.round((doneMin / min) * 100) : 0;
                        const color = SUBJECT_COLORS[subj] ?? "#64748b";
                        return (
                          <div key={subj} className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="flex items-center gap-2 font-medium text-zinc-300">
                                <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                                {subj}
                              </span>
                              <span className="font-semibold text-white">
                                {minutesToHM(min)} <span className="font-normal text-zinc-500">• {donePct}% done</span>
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/5 p-0.5">
                              <div className="flex h-full gap-0.5">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.6 }}
                                  className="h-full rounded-full"
                                  style={{ background: color, opacity: 0.35 }}
                                />
                              </div>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(donePct * pct) / 100}%` }}
                                transition={{ duration: 0.6, delay: 0.15 }}
                                className="-mt-2 h-2 rounded-full"
                                style={{ background: color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    {Object.keys(bySubject).length > 6 && <p className="pt-1 text-xs text-zinc-500">+{Object.keys(bySubject).length - 6} more subjects</p>}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Type breakdown + Insights + Heatmap */}
          <div className="grid gap-5 lg:grid-cols-3">
            <Card>
              <CardBody>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <BarChart3 className="h-4 w-4 text-accent-400" /> Time by type
                </h3>
                {Object.keys(byType).length === 0 ? (
                  <p className="mt-4 text-sm text-zinc-500">No data.</p>
                ) : (
                  <div className="mt-5 space-y-2.5">
                    {Object.entries(byType)
                      .sort((a, b) => b[1] - a[1])
                      .map(([type, min]) => (
                        <div key={type} className="flex items-center gap-2 sm:gap-3">
                          <span className="w-[84px] sm:w-[112px] truncate text-xs font-medium capitalize text-zinc-400">{type.replace(/_/g, " ")}</span>
                          <div className="flex-1 h-2 overflow-hidden rounded-full bg-white/5 min-w-0">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(min / maxType) * 100}%` }} transition={{ duration: 0.5 }} className="h-full rounded-full bg-accent-500" />
                          </div>
                          <span className="w-[56px] sm:w-[64px] text-right text-xs font-medium text-zinc-500 shrink-0">{minutesToHM(min)}</span>
                        </div>
                      ))}
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Sparkles className="h-4 w-4 text-amber-400" /> Insights
                </h3>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                    <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> Momentum
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                      You average <span className="font-semibold text-white">{minutesToHM(avgPerDay)}</span> planned/day. Focus makes up{" "}
                      <span className="font-semibold text-white">{totalMin ? Math.round((focusMin / Math.max(1, totalMin)) * 100) : 0}%</span> of your time.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                    <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-violet-400" /> Consistency
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                      {perDay.filter((d) => d.count > 0).length} active days / {range} •{" "}
                      <span className="font-semibold text-white">{completionRate}%</span> completion overall.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-500/10 bg-amber-500/10 p-3">
                    <p className="text-xs font-semibold text-amber-200 flex items-center gap-1.5">
                      <Flame className="h-3.5 w-3.5" /> Keep the chain
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-300">Next level in {lvl.needed - lvl.current} XP. One focus block = +{Math.round(25 * 2)} XP.</p>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <CalendarDays className="h-4 w-4 text-emerald-400" /> 28‑day heatmap
                </h3>
                <p className="mt-1 text-xs text-zinc-500">Darker = more done</p>
                <div className="mt-4 grid grid-cols-7 gap-1.5">
                  {heatmapDays.map((iso) => {
                    const v = heatmapMap.get(iso) ?? 0;
                    const intensity = v === 0 ? 0 : Math.min(1, v / Math.max(60, heatMax));
                    const bg =
                      intensity === 0
                        ? "bg-white/5"
                        : intensity < 0.33
                          ? "bg-emerald-500/30"
                          : intensity < 0.66
                            ? "bg-emerald-500/60"
                            : "bg-emerald-500";
                    const isToday = iso === toISO(new Date());
                    return (
                      <div
                        key={iso}
                        title={`${iso}: ${minutesToHM(v)} done`}
                        className={`aspect-square rounded-md border ${isToday ? "border-white/30 ring-1 ring-white/20" : "border-white/5"} ${bg} flex items-center justify-center`}
                      >
                        {v > 0 && <span className="h-1 w-1 rounded-full bg-white/70" />}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Less</span>
                  <div className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded-sm bg-white/5 border border-white/5" />
                    <span className="h-3 w-3 rounded-sm bg-emerald-500/30" />
                    <span className="h-3 w-3 rounded-sm bg-emerald-500/60" />
                    <span className="h-3 w-3 rounded-sm bg-emerald-500" />
                  </div>
                  <span>More</span>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Bottom: focus timeline + XP */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardBody>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <TimerIcon className="h-4 w-4 text-amber-400" /> Focus timeline
                </h3>
                {focusCount === 0 ? (
                  <p className="mt-4 text-sm text-zinc-500">No focus sessions yet. Start a Pomodoro to see it here.</p>
                ) : (
                  <div className="mt-4 space-y-2.5">
                    {sessions
                      .filter((s) => s.completed)
                      .slice(0, 5)
                      .map((s) => (
                        <div key={s.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white">
                            <CheckCircle2 className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">{minutesToHM(s.duration_minutes ?? s.minutes ?? 0)} focus</p>
                            <p className="text-xs text-zinc-500">{(s.started_at ?? s.date ?? "").slice(0, 10) || "recently"}</p>
                          </div>
                          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">done</span>
                        </div>
                      ))}
                  </div>
                )}
              </CardBody>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-violet-600/20 to-accent-600/20 blur-2xl" />
              <CardBody className="relative">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Trophy className="h-4 w-4 text-amber-400" /> Your level
                </h3>
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-zinc-900 shadow-sm">
                    <span className="text-xl font-bold">{lvl.level}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{lvl.title} • {profile?.xp ?? 0} XP</p>
                    <p className="mt-1 text-xs text-zinc-500">{lvl.needed - lvl.current} XP to next level • {lvl.pct}% there</p>
                    <div className="mt-2 h-2 w-40 overflow-hidden rounded-full bg-white/10 p-0.5">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${lvl.pct}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full bg-gradient-to-r from-accent-500 to-violet-500" />
                    </div>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-white/[0.04] border border-white/5 py-3">
                    <p className="text-lg font-bold text-white">{tasks.filter((t) => t.completed).length}</p>
                    <p className="text-xs text-zinc-500">Tasks done</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.04] border border-white/5 py-3">
                    <p className="text-lg font-bold text-white">{focusCount}</p>
                    <p className="text-xs text-zinc-500">Focus blocks</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.04] border border-white/5 py-3">
                    <p className="text-lg font-bold text-white">{minutesToHM(focusMin)}</p>
                    <p className="text-xs text-zinc-500">Deep work</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* CTA */}
          <div className="flex flex-wrap gap-2">
            <a href="/planner" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-100">
              <Sparkles className="h-4 w-4" /> Plan next 7 days <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
            <a href="/timer" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10">
              <TimerIcon className="h-4 w-4" /> Start focus <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </>
      )}
    </div>
  );
}
