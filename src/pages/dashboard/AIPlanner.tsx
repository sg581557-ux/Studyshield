import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, RefreshCw, Clock, Zap, CheckCircle2, AlertCircle, Loader2,
  Trash2, Calendar, AlertTriangle, Brain, Flame, Shield, Coffee,
  SkipForward, RotateCcw, Lightbulb, BookOpen, Sigma, FileQuestion,
  ClipboardList, PlayCircle, ChevronDown, TrendingUp,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { db } from "../../services/db";
import {
  generatePlan, onTaskStatusChange, processMissedTasks,
  validatePlannerInput, PlannerError,
  type PlannerDiagnostics, type CoachingSummary,
} from "../../services/planner/index";
import { selectedHoursFor } from "../../services/habitStats";
import { Card, CardBody, SectionTitle, Button, EmptyState, ProgressBar } from "../../components/ui";
import { ENERGY_LEVELS, minutesToHM, todayISODate, TASK_TYPE_LABELS } from "../../lib/constants";
import type { PlanTask, EnergyLevel, TaskStatus, Priority } from "../../lib/types";

function describeError(err: unknown): string {
  if (!err) return "Unknown error (no error object).";
  if (typeof err === "string") return err;
  const e = err as Record<string, unknown>;
  const parts: string[] = [];
  const message = e.message as string | undefined;
  const code = e.code as string | undefined;
  if (message) parts.push(message);
  if (code) parts.push(`code=${code}`);
  if (parts.length === 0 && e.name) parts.push(String(e.name));
  return parts.join(" · ") || "Unknown error.";
}

const TYPE_ICONS: Record<string, typeof BookOpen> = {
  lecture: BookOpen, dpp: ClipboardList, module: Sigma, pyq: FileQuestion,
  revision: RotateCcw, spaced_revision: RotateCcw, formula_revision: Lightbulb,
  coaching: PlayCircle, practice: FileQuestion, study: Clock, school: Clock,
  break: Coffee, mistake_analysis: FileQuestion, notes: BookOpen, mock_test_review: FileQuestion,
};

const PRIORITY_COLORS: Record<Priority, string> = {
  critical: "bg-danger-500/20 text-danger-300 border-danger-500/40",
  high: "bg-danger-600/15 text-danger-400 border-danger-600/30",
  medium: "bg-warning-600/15 text-warning-400 border-warning-600/30",
  low: "bg-slate-600/15 text-slate-400 border-slate-600/30",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  critical: "Critical", high: "High", medium: "Medium", low: "Low",
};

export default function AIPlanner() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [hours, setHours] = useState<number>(profile?.daily_goal_hours ?? 6);
  const [energy, setEnergy] = useState<EnergyLevel>("normal");
  const [schoolDay, setSchoolDay] = useState(false);
  const [examTomorrow, setExamTomorrow] = useState(false);
  const [date, setDate] = useState<string>(todayISODate());
  const [notes, setNotes] = useState("");
  const [completedToday, setCompletedToday] = useState("");
  const [unexpectedEvents, setUnexpectedEvents] = useState("");
  const [diagnostics, setDiagnostics] = useState<PlannerDiagnostics | null>(null);
  const [coaching, setCoaching] = useState<CoachingSummary | null>(null);
  const [showCoachDetails, setShowCoachDetails] = useState(true);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [recoveryPending, setRecoveryPending] = useState(0);
  const [showCompleted, setShowCompleted] = useState(true);

  useEffect(() => { load(); }, [date]);

  async function load() {
    setLoading(true);
    try {
      const [t, saved] = await Promise.all([db.getTasksForDate(date), db.getDailyPlanInputs(date)]);
      setTasks(t);
      if (saved) {
        setHours(saved.study_hours); setEnergy(saved.energy_level as EnergyLevel); setSchoolDay(saved.was_school_day); setExamTomorrow(saved.exam_tomorrow);
      } else if (profile) {
        const defaults = selectedHoursFor(profile, new Date(`${date}T00:00:00`));
        if (defaults > 0) setHours(defaults);
      }
      const recovery = await db.getRecoveryItems("pending").catch(() => []);
      setRecoveryPending(recovery.length);
    } catch (err) {
      console.error("[AIPlanner] load threw", err);
      setTasks([]);
    } finally { setLoading(false); }
  }

  const activeTasks = useMemo(() => tasks.filter((t) => {
    const s = t.task_status ?? (t.completed ? "completed" : "pending");
    return s !== "completed" && s !== "cancelled";
  }), [tasks]);

  const completedTasks = useMemo(() => tasks.filter((t) => {
    const s = t.task_status ?? (t.completed ? "completed" : "pending");
    return s === "completed";
  }), [tasks]);

  const completedCount = completedTasks.length;
  const totalMinutes = useMemo(() => tasks.reduce((a, t) => a + t.estimated_minutes, 0), [tasks]);
  const completedMinutes = useMemo(() => completedTasks.reduce((a, t) => a + t.estimated_minutes, 0), [completedTasks]);
  const remainingMinutes = useMemo(() => activeTasks.reduce((a, t) => a + t.estimated_minutes, 0), [activeTasks]);
  const completionPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  const requestedMinutes = Math.round(hours * 60);
  const revisionDueToday = useMemo(() => coaching?.revisionSchedule.filter((ev) => ev.dueInDays === 0) ?? [], [coaching]);

  async function generate() {
    setGenerateError(null);
    if (!profile) { const m = "Your profile isn't loaded yet. Please wait a moment and try again."; setGenerateError(m); toast.error(m); return; }
    if (!profile.id) { const m = "Your profile is missing an id. Please sign in again."; setGenerateError(m); toast.error(m); return; }
    if (!hours || hours <= 0) { const m = `Study hours must be greater than 0 (got ${hours}).`; setGenerateError(m); toast.error(m); return; }
    if (hours > 24) { const m = `Study hours cannot exceed 24 (got ${hours}).`; setGenerateError(m); toast.error(m); return; }
    if (!date) { const m = "Please pick a valid date."; setGenerateError(m); toast.error(m); return; }

    const plannerInput = { profile, studyHours: hours, energyLevel: energy, wasSchoolDay: schoolDay, examTomorrow, date, notes, completedToday, unexpectedEvents };
    const v = validatePlannerInput(plannerInput);
    if (!v.valid) { const m = v.errors.join(" "); setGenerateError(m); toast.error(m); return; }

    setGenerating(true);
    try {
      const yesterday = new Date(date + "T00:00:00"); yesterday.setDate(yesterday.getDate() - 1);
      await processMissedTasks(yesterday.toISOString().slice(0, 10)).catch(() => {});

      const result = await generatePlan(plannerInput);
      console.info("[AIPlanner] planner output:", { taskCount: result.tasks.length, diagnostics: result.diagnostics });

      if (!result.tasks || result.tasks.length === 0) {
        const m = "The planner produced 0 tasks. See console for diagnostics.";
        setGenerateError(m); toast.error(m); return;
      }

      try { await db.deleteTasksForDate(date); } catch (err) {
        const m = `Failed to clear old tasks: ${describeError(err)}`;
        setGenerateError(m); toast.error(m); return;
      }
      try { await db.insertTasks(result.tasks); } catch (err) {
        const m = `Failed to save plan tasks: ${describeError(err)}`;
        setGenerateError(m); toast.error(m); return;
      }
      try {
        await db.saveDailyPlanInputs({ plan_date: date, was_school_day: schoolDay, study_hours: hours, energy_level: energy, exam_tomorrow: examTomorrow });
      } catch (err) { console.error("[AIPlanner] saveDailyPlanInputs threw", err); }

      setTasks(result.tasks);
      setDiagnostics(result.diagnostics);
      setCoaching(result.coaching);
      const recovery = await db.getRecoveryItems("pending").catch(() => []);
      setRecoveryPending(recovery.length);

      if (result.diagnostics.burnout.detected) {
        toast.info(`Burnout detected (${result.diagnostics.burnout.level}) — plan adjusted`);
      }
      toast.success(`Plan generated: ${minutesToHM(result.diagnostics.scheduledMinutes)} across ${result.tasks.length} tasks (${result.diagnostics.utilizationPct}% of available time)`);
    } catch (err) {
      console.error("[AIPlanner] generate threw:", err);
      const reason = err instanceof PlannerError ? err.message : describeError(err);
      const m = `Failed to generate plan: ${reason}`;
      setGenerateError(m); toast.error(m);
    } finally { setGenerating(false); }
  }

  const toggleComplete = useCallback(async (task: PlanTask) => {
    const current = task.task_status ?? (task.completed ? "completed" : "pending");
    if (current === "completed") return;

    const updatedTask: PlanTask = { ...task, task_status: "completed" as TaskStatus, completed: true, completion_pct: 100 };
    setTasks((prev) => prev.map((t) => t.id === task.id ? updatedTask : t));

    try {
      await onTaskStatusChange(updatedTask, "completed");
      toast.success(`Completed: ${task.title}`);

      const recovery = await db.getRecoveryItems("pending").catch(() => []);
      setRecoveryPending(recovery.length);
    } catch (err) {
      console.error("[AIPlanner] toggleComplete threw", err);
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, task_status: current, completed: false, completion_pct: 0 } : t));
      toast.error(`Update failed: ${describeError(err)}`);
    }
  }, [toast]);

  async function skipTask(task: PlanTask) {
    setTasks((p) => p.map((t) => t.id === task.id ? { ...t, task_status: "skipped" as TaskStatus } : t));
    try { await onTaskStatusChange(task, "skipped"); toast.info("Task skipped — moved to recovery bucket"); }
    catch (err) { console.error("[AIPlanner] skipTask threw", err); toast.error(`Failed: ${describeError(err)}`); }
  }

  async function deleteTask(id: string) {
    setTasks((p) => p.filter((t) => t.id !== id));
    try { await db.deleteTask(id); } catch (err) { console.error("[AIPlanner] deleteTask threw", err); await load(); }
  }

  async function clearDay() {
    try { await db.deleteTasksForDate(date); setTasks([]); setDiagnostics(null); setCoaching(null); setGenerateError(null); toast.success("Day cleared"); }
    catch (err) { console.error("[AIPlanner] clearDay threw", err); toast.error(`Failed: ${describeError(err)}`); }
  }

  const burnout = diagnostics?.burnout;
  const burnoutColor = burnout?.level === "severe" ? "text-danger-400" : burnout?.level === "moderate" ? "text-warning-400" : burnout?.level === "mild" ? "text-warning-400" : "text-success-400";
  const BurnoutIcon = burnout?.level === "none" ? Shield : Flame;

  function renderTaskRow(t: PlanTask) {
    const status = t.task_status ?? (t.completed ? "completed" : "pending");
    const isCompleted = status === "completed";
    const isSkipped = status === "skipped" || status === "cancelled";
    const TypeIcon = TYPE_ICONS[t.type] ?? Clock;
    const priorityColor = PRIORITY_COLORS[t.priority] ?? PRIORITY_COLORS.low;

    return (
      <motion.div key={t.id || t.title} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: isCompleted ? 0.5 : 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3">
        <button onClick={() => toggleComplete(t)} disabled={isCompleted || isSkipped} className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${isCompleted ? "bg-success-600 border-success-600" : "border-white/20 hover:border-success-500 hover:bg-success-600/10"}`}>
          {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
        </button>

        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
          <TypeIcon className={`w-4 h-4 ${isCompleted ? "text-slate-600" : "text-accent-400"}`} />
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm truncate ${isCompleted ? "text-slate-600 line-through" : "text-slate-200"}`}>{t.title}</p>
          <div className="flex items-center flex-wrap gap-1.5 mt-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-slate-400 flex items-center gap-1"><TypeIcon className="w-2.5 h-2.5" /> {TASK_TYPE_LABELS[t.type] ?? t.type}</span>
            {t.subject && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-accent-600/10 text-accent-400 border border-accent-600/20">{t.subject}</span>}
            {t.chapter && <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{t.chapter}</span>}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${priorityColor}`}>{PRIORITY_LABELS[t.priority]}</span>
            {t.source === "recovery" && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warning-600/15 text-warning-400">recovery</span>}
            {t.source === "active_chapter" && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success-600/15 text-success-400">active</span>}
            {t.source === "new_chapter" && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-600/15 text-accent-400">new</span>}
            {t.source === "revision_engine" && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-600/15 text-accent-400">revision</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-slate-600 hidden sm:block">{t.start_time ?? ""}–{t.end_time ?? ""}</span>
          <span className="text-xs text-slate-400 font-medium">{minutesToHM(t.estimated_minutes)}</span>
          {t.priority_score > 0 && <span className="text-[10px] text-slate-700 hidden md:block">P:{t.priority_score.toFixed(1)}</span>}
          {!isCompleted && !isSkipped && <button onClick={() => skipTask(t)} className="text-slate-600 hover:text-warning-400" title="Skip → recovery"><SkipForward className="w-3.5 h-3.5" /></button>}
          <button onClick={() => deleteTask(t.id)} className="text-slate-600 hover:text-danger-400"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-white flex items-center gap-2"><Sparkles className="w-5 h-5 text-accent-400" /> AI Planner</h1>
        <p className="text-sm text-slate-500 mt-0.5">Intelligent scheduling that prioritizes your active chapters and adapts to your progress.</p>
      </div>

      {/* Daily Input Form */}
      <Card><CardBody className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="block"><span className="input-label flex items-center gap-1"><Clock className="w-3 h-3" /> Study hours</span>
            <input type="number" min="1" max="16" step="0.5" className="input-base" value={hours} onChange={(e) => setHours(Number(e.target.value))} />
            <span className="text-[11px] text-slate-600 mt-1">= {requestedMinutes} min target</span>
          </label>
          <label className="block"><span className="input-label flex items-center gap-1"><Zap className="w-3 h-3" /> Energy level</span>
            <select className="select-base" value={energy} onChange={(e) => setEnergy(e.target.value as EnergyLevel)}>{ENERGY_LEVELS.map((l) => <option key={l.value} value={l.value} className="bg-slate-900 text-white">{l.label}</option>)}</select>
          </label>
          <label className="block"><span className="input-label flex items-center gap-1"><Calendar className="w-3 h-3" /> Date</span>
            <input type="date" className="input-base" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block"><span className="input-label">Completed today (optional)</span>
            <input className="input-base" value={completedToday} onChange={(e) => setCompletedToday(e.target.value)} placeholder="What have you already done?" />
          </label>
          <label className="block"><span className="input-label">Unexpected events (optional)</span>
            <input className="input-base" value={unexpectedEvents} onChange={(e) => setUnexpectedEvents(e.target.value)} placeholder="Anything that disrupted your day?" />
          </label>
        </div>

        <label className="block"><span className="input-label">Notes (optional)</span>
          <input className="input-base" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any context for the planner?" />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400"><input type="checkbox" checked={schoolDay} onChange={(e) => setSchoolDay(e.target.checked)} className="accent-accent-600" /> School day</label>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400"><input type="checkbox" checked={examTomorrow} onChange={(e) => setExamTomorrow(e.target.checked)} className="accent-accent-600" /> Exam tomorrow</label>
          {recoveryPending > 0 && <span className="text-xs text-warning-400 flex items-center gap-1"><RotateCcw className="w-3 h-3" /> {recoveryPending} in recovery</span>}
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={clearDay}><Trash2 className="w-4 h-4" /> Clear day</Button>
          <Button onClick={generate} loading={generating} disabled={!profile}><RefreshCw className="w-4 h-4" /> Generate plan</Button>
        </div>

        {generateError && (
          <div className="rounded-xl bg-danger-600/10 border border-danger-600/30 p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-danger-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-danger-300 break-words">{generateError}</p>
              <p className="text-xs text-slate-500 mt-1">Full details are in the browser console.</p>
            </div>
            <button onClick={() => setGenerateError(null)} className="text-slate-500 hover:text-white text-xs shrink-0">Dismiss</button>
          </div>
        )}
      </CardBody></Card>

      {/* Diagnostics & Insights */}
      {diagnostics && (
        <>
          <Card><CardBody className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-600/20 flex items-center justify-center shrink-0"><Lightbulb className="w-5 h-5 text-accent-400" /></div>
            <div><p className="text-sm font-medium text-white">{diagnostics.motivationalInsight}</p></div>
          </CardBody></Card>

          {burnout && burnout.detected && (
            <Card><CardBody className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-warning-600/20 flex items-center justify-center shrink-0"><Flame className="w-5 h-5 text-warning-400" /></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Burnout protection active — {burnout.level}</p>
                <p className="text-xs text-slate-400 mt-0.5">{burnout.reasons.join("; ")}</p>
                {burnout.recommendations.length > 0 && (
                  <ul className="mt-2 space-y-1">{burnout.recommendations.map((r: string, i: number) => <li key={i} className="text-xs text-slate-500 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-warning-400" /> {r}</li>)}</ul>
                )}
              </div>
            </CardBody></Card>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardBody className="text-center"><p className="text-2xl font-bold text-white">{minutesToHM(remainingMinutes)}</p><p className="text-xs text-slate-500 mt-1">Remaining today</p></CardBody></Card>
            <Card><CardBody className="text-center"><p className="text-2xl font-bold text-white">{diagnostics.bufferMinutes}m</p><p className="text-xs text-slate-500 mt-1">Buffer time</p></CardBody></Card>
            <Card><CardBody className="text-center"><div className="flex items-center justify-center gap-1"><BurnoutIcon className={`w-5 h-5 ${burnoutColor}`} /><p className="text-2xl font-bold text-white capitalize">{diagnostics.burnout.level}</p></div><p className="text-xs text-slate-500 mt-1">Burnout level</p></CardBody></Card>
            <Card><CardBody className="text-center"><p className="text-2xl font-bold text-white">{diagnostics.estimatedFinishTime}</p><p className="text-xs text-slate-500 mt-1">Est. finish</p></CardBody></Card>
          </div>

          {diagnostics.habitCalibration && (
            <Card><CardBody className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-success-600/20 flex items-center justify-center shrink-0"><TrendingUp className="w-5 h-5 text-success-400" /></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Adaptive planner {diagnostics.habitCalibration.active ? "active" : "learning"}</p>
                <p className="text-xs text-slate-400 mt-0.5">{diagnostics.habitCalibration.message || "Observing your study rhythm — plans will adapt after a few days."}</p>
                {diagnostics.habitCalibration.daysObserved > 0 && (
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    {diagnostics.habitCalibration.daysObserved}d tracked · {diagnostics.habitCalibration.completionRate === null ? "n/a" : `${Math.round(diagnostics.habitCalibration.completionRate * 100)}%`} completion · {Math.round(diagnostics.habitCalibration.avgCompletedMinutes / 60 * 10) / 10}h/day actual
                    {diagnostics.habitCalibration.bestSlot ? ` · best slot: ${diagnostics.habitCalibration.bestSlot}` : ""}
                  </p>
                )}
              </div>
            </CardBody></Card>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardBody className="flex items-center gap-2"><Brain className="w-4 h-4 text-accent-400" /><div><p className="text-sm font-semibold text-white">{diagnostics.revisionTasksIncluded}</p><p className="text-xs text-slate-500">Revision tasks</p></div></CardBody></Card>
            <Card><CardBody className="flex items-center gap-2"><RotateCcw className="w-4 h-4 text-warning-400" /><div><p className="text-sm font-semibold text-white">{diagnostics.recoveryTasksIncluded}</p><p className="text-xs text-slate-500">Recovery tasks</p></div></CardBody></Card>
            <Card><CardBody className="flex items-center gap-2"><Coffee className="w-4 h-4 text-slate-400" /><div><p className="text-sm font-semibold text-white">{diagnostics.breakMinutes}m</p><p className="text-xs text-slate-500">Break time</p></div></CardBody></Card>
            <Card><CardBody className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-success-400" /><div><p className="text-sm font-semibold text-white">{completionPct}%</p><p className="text-xs text-slate-500">Day progress</p></div></CardBody></Card>
          </div>
        </>
      )}

      {/* Coach's Corner */}
      {coaching && (
        <Card><CardBody className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-600/20 flex items-center justify-center shrink-0"><Brain className="w-5 h-5 text-accent-400" /></div>
            <div>
              <p className="text-sm font-medium text-white">Coach's Corner</p>
              <p className="text-xs text-slate-500 mt-0.5">The reasoning behind today's plan</p>
            </div>
          </div>

          <div className="rounded-xl bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Today's goal</p>
            <p className="text-sm font-medium text-white mt-1">{coaching.dailyGoal}</p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-xs px-2 py-1 rounded-lg bg-accent-600/10 text-accent-400 border border-accent-600/20">Confidence: {coaching.confidenceScore}/100 · {coaching.confidenceLabel}</span>
              <span className="text-xs px-2 py-1 rounded-lg bg-success-600/10 text-success-400 border border-success-600/20">Utilization: {diagnostics?.utilizationPct ?? 0}%</span>
              <span className="text-xs px-2 py-1 rounded-lg bg-white/5 text-slate-400">{coaching.energyRead}</span>
              <span className="text-xs px-2 py-1 rounded-lg bg-white/5 text-slate-400">{coaching.completionTarget}</span>
              {coaching.prevDay?.completionRate !== null && coaching.prevDay !== null && (
                <span className="text-xs px-2 py-1 rounded-lg bg-white/5 text-slate-400">Yesterday: {Math.round(coaching.prevDay.completionRate * 100)}% done · {coaching.prevDay.skippedCount} skipped · {minutesToHM(coaching.prevDay.studiedMinutes)} studied</span>
              )}
            </div>
            {revisionDueToday.length > 0 && (
              <p className="text-xs text-accent-400 mt-3">Revision due today: {revisionDueToday.map((ev) => `${ev.subject} · ${ev.chapter} (Rev #${ev.revisionNumber})`).join(" · ")}</p>
            )}
          </div>

          <p className="text-sm text-slate-300 flex items-start gap-2"><Lightbulb className="w-4 h-4 text-accent-400 mt-0.5 shrink-0" />{coaching.motivation}</p>

          <button onClick={() => setShowCoachDetails((s) => !s)} className="flex items-center gap-2 text-xs text-slate-400 hover:text-white">
            <ChevronDown className={`w-4 h-4 transition-transform ${showCoachDetails ? "" : "-rotate-90"}`} />
            {showCoachDetails ? "Hide" : "Show"} coach details
          </button>

          {showCoachDetails && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 pt-1">
              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-xs font-medium text-slate-300 flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5 text-accent-400" /> Why each task</p>
                {coaching.taskReasons.length === 0 ? <p className="text-xs text-slate-600 mt-2">No tasks yet.</p> : (
                  <ul className="mt-2 space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {coaching.taskReasons.map((r) => <li key={r.title} className="text-xs text-slate-400"><span className="text-slate-200 font-medium">{r.title}</span> — {r.reason}</li>)}
                  </ul>
                )}
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-xs font-medium text-slate-300 flex items-center gap-1.5"><SkipForward className="w-3.5 h-3.5 text-warning-400" /> Carried forward</p>
                {coaching.carryForward.length === 0 ? <p className="text-xs text-slate-600 mt-2">Nothing pending — backlog is balanced.</p> : (
                  <ul className="mt-2 space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {coaching.carryForward.map((c) => <li key={c.title} className="text-xs text-slate-400"><span className="text-slate-200 font-medium">{c.title}</span> — {c.reason}</li>)}
                  </ul>
                )}
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-xs font-medium text-slate-300 flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5 text-accent-400" /> Revision rhythm (14 days)</p>
                {coaching.revisionSchedule.length === 0 ? <p className="text-xs text-slate-600 mt-2">No revisions scheduled yet.</p> : (
                  <ul className="mt-2 space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {coaching.revisionSchedule.map((ev) => <li key={`${ev.subject}|${ev.chapter}|${ev.revisionNumber}`} className="text-xs text-slate-400"><span className="text-slate-200 font-medium">{ev.subject} · {ev.chapter}</span> — {ev.label} in {ev.dueInDays}d</li>)}
                  </ul>
                )}
              </div>
            </div>
          )}
        </CardBody></Card>
      )}

      {/* Active Tasks */}
      <Card><CardBody>
        <div className="flex items-center justify-between">
          <SectionTitle>Tasks for {date}</SectionTitle>
          {tasks.length > 0 && <span className="text-xs text-slate-500">{completedCount}/{tasks.length} done · {minutesToHM(remainingMinutes)} left</span>}
        </div>
        {loading ? <div className="py-8 flex items-center justify-center"><Loader2 className="w-5 h-5 text-accent-500 animate-spin" /></div> :
         activeTasks.length === 0 && completedTasks.length === 0 ? <EmptyState icon={<Sparkles className="w-8 h-8" />} title="No tasks yet" description="Set your hours and generate a plan." /> : (
          <div className="space-y-1.5 mt-2">
            <AnimatePresence>
              {activeTasks.map(renderTaskRow)}
            </AnimatePresence>
          </div>
        )}
      </CardBody></Card>

      {/* Completed Today Section */}
      {completedTasks.length > 0 && (
        <Card><CardBody>
          <button onClick={() => setShowCompleted((s) => !s)} className="flex items-center justify-between w-full group">
            <SectionTitle><span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-success-400" /> Completed Today ({completedTasks.length})</span></SectionTitle>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showCompleted ? "" : "-rotate-90"}`} />
          </button>
          {showCompleted && (
            <div className="space-y-1.5 mt-2">
              <AnimatePresence>
                {completedTasks.map(renderTaskRow)}
              </AnimatePresence>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-white/5">
            <ProgressBar value={completionPct} />
            <p className="text-xs text-slate-500 mt-2">{completedCount}/{tasks.length} tasks · {minutesToHM(completedMinutes)} studied · {completionPct}% complete</p>
          </div>
        </CardBody></Card>
      )}
    </div>
  );
}
