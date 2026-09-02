// AI Mentor → AI Planner execution layer.
//
// The mentor-chat edge function decides WHEN a plan change is justified and
// returns a validated, minimal change proposal (`PlannerChange`). This module
// EXECUTES it through the existing planner + database layer — the app's single
// source of truth for scheduling — with guard rails, a snapshot for Undo, and
// human-readable summaries for the "Planner updated" notification.

import { db } from "./db";
import { generateCoachingPlan, getCoachingType } from "./planner/coachingPlanner";
import { validatePlannerInput, processMissedTasks } from "./planner";
import { selectedHoursFor } from "./habitStats";
import { supabase } from "../lib/supabase";
import type { PlannerChange, PlannerChangeOp } from "./mentor";
import type { DailyPlanInputs, EnergyLevel, PlanTask, Profile } from "../lib/types";

export interface PlannerSnapshot {
  /** Original rows of tasks that were updated (priority / date / time). */
  tasks: PlanTask[];
  /** Full rows of tasks that were deleted (re-inserted on undo). */
  deleted: PlanTask[];
  /** Tasks added by the change (matched + deleted on undo). */
  added: { date: string; title: string; type?: string | null }[];
  /** Daily plan inputs per date before the change (null = row didn't exist). */
  inputs: Record<string, DailyPlanInputs | null>;
}

export interface PlannerApplyResult {
  /** At least one op was applied. */
  applied: boolean;
  /** Human-readable lines for the 🧠 Planner updated notification. */
  summary: string[];
  /** Per-op rejection reasons. */
  errors: string[];
  snapshot: PlannerSnapshot | null;
}

const OP_ENUM = new Set([
  "regenerate_plan",
  "reschedule_task",
  "add_task",
  "remove_task",
  "update_task_priority",
  "update_availability",
]);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MIN_OP_ORDER = 15;
const MAX_OP_ORDER = 300;
const DAY_TOLERANCE = 1.15;

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function validTitle(v: unknown): v is string {
  return typeof v === "string" && v.trim().length >= 2 && v.trim().length <= 120;
}

/** Loose title match: the proposal's task_title must be contained in the
 *  task's title (case-insensitive). Never matches completed/cancelled tasks. */
function matchTask(tasks: PlanTask[], title: string): PlanTask[] {
  const q = title.trim().toLowerCase();
  if (!q) return [];
  return tasks.filter(
    (t) =>
      (t.task_status ?? (t.completed ? "completed" : "pending")) !== "completed" &&
      t.task_status !== "cancelled" &&
      t.title.toLowerCase().includes(q)
  );
}

async function snapshotDate(date: string): Promise<{ tasks: PlanTask[]; inputs: DailyPlanInputs | null }> {
  const [tasks, inputs] = await Promise.all([
    db.getTasksForDate(date).catch(() => [] as PlanTask[]),
    db.getDailyPlanInputs(date).catch(() => null),
  ]);
  return { tasks, inputs };
}

async function capacityMinutes(date: string, profile: Profile | null, existing?: DailyPlanInputs | null): Promise<number> {
  const hours = existing?.study_hours ?? (profile ? selectedHoursFor(profile, new Date(`${date}T00:00:00`)) : 0) ?? 0;
  return Math.round(hours * 60 * DAY_TOLERANCE);
}

async function markChangeStatus(id: string, status: "applied" | "rejected" | "undone"): Promise<void> {
  if (!supabase) return;
  try {
    await supabase
      .from("mentor_plan_changes")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
  } catch (e) {
    console.error("[plannerMentor] markChangeStatus failed", e);
  }
}

async function regenerateDay(
  op: PlannerChangeOp,
  profile: Profile | null,
  snapshot: PlannerSnapshot,
): Promise<{ ok: boolean; summary?: string; error?: string }> {
  if (!profile?.id) return { ok: false, error: "Your profile isn't loaded — can't regenerate the plan." };
  const date = op.date ?? new Date().toISOString().slice(0, 10);
  if (!DATE_RE.test(date)) return { ok: false, error: "Invalid date in regenerate request." };

  const existing = await db.getDailyPlanInputs(date).catch(() => null);
  const fallbackHours = profile.daily_goal_hours && profile.daily_goal_hours > 0 ? profile.daily_goal_hours : 4;
  const fallback = selectedHoursFor(profile, new Date(`${date}T00:00:00`)) || fallbackHours;
  const studyHours = op.study_hours ?? existing?.study_hours ?? fallback;
  if (typeof studyHours !== "number" || !Number.isFinite(studyHours) || studyHours <= 0 || studyHours > 16) {
    return { ok: false, error: `Invalid study hours (${studyHours}).` };
  }
  const energyLevel: EnergyLevel = (op.energy_level as EnergyLevel | undefined) ?? (existing?.energy_level as EnergyLevel | undefined) ?? "normal";
  const wasSchoolDay = op.was_school_day ?? existing?.was_school_day ?? false;
  const examTomorrow = op.exam_tomorrow ?? existing?.exam_tomorrow ?? false;

  const plannerInput = { profile, studyHours, energyLevel, wasSchoolDay, examTomorrow, date };
  const v = validatePlannerInput(plannerInput);
  if (!v.valid) return { ok: false, error: v.errors.join(" ") };

  try {
    const yesterday = new Date(`${date}T00:00:00`);
    yesterday.setDate(yesterday.getDate() - 1);
    await processMissedTasks(yesterday.toISOString().slice(0, 10)).catch(() => {});

    const { tasks: oldTasks, inputs: oldInputs } = await snapshotDate(date);
    snapshot.deleted.push(...oldTasks);
    snapshot.inputs[date] = oldInputs;

    const coachingType = getCoachingType(profile);
    const result = await generateCoachingPlan(plannerInput);
    if (!result.tasks || result.tasks.length === 0) {
      return { ok: false, error: "The planner produced an empty plan." };
    }

    await db.deleteTasksForDate(date);
    await db.insertTasks(result.tasks);
    await db.saveDailyPlanInputs({
      plan_date: date,
      was_school_day: wasSchoolDay,
      study_hours: Math.round(studyHours),
      energy_level: energyLevel,
      exam_tomorrow: examTomorrow,
    }).catch(() => {});

    return {
      ok: true,
      summary: `Regenerated ${fmtDate(date)}'s plan (${Math.round(studyHours)}h, ${energyLevel} energy, ${coachingType} coaching)`,
    };
  } catch (e) {
    console.error("[plannerMentor] regenerate threw", e);
    return { ok: false, error: "Plan regeneration failed. Your old plan was kept." };
  }
}

async function rescheduleTask(op: PlannerChangeOp, _profile: Profile | null, snapshot: PlannerSnapshot): Promise<{ ok: boolean; summary?: string; error?: string }> {
  if (!validTitle(op.task_title) || !op.from_date || !op.to_date || !DATE_RE.test(op.from_date) || !DATE_RE.test(op.to_date)) {
    return { ok: false, error: "Invalid reschedule request." };
  }
  const tasks = await db.getTasksForDate(op.from_date).catch(() => [] as PlanTask[]);
  const matches = matchTask(tasks, op.task_title);
  if (matches.length === 0) return { ok: false, error: `No pending task matching "${op.task_title}" on ${fmtDate(op.from_date)}.` };
  if (matches.length > 3) return { ok: false, error: `Too many tasks match "${op.task_title}" — please be more specific.` };

  for (const t of matches) {
    snapshot.tasks.push(t);
    await db.updateTask(t.id, {
      scheduled_date: op.to_date,
      ...(op.start_time ? { start_time: op.start_time, end_time: null } : {}),
      reschedule_reason: "ai_mentor",
    });
  }
  return { ok: true, summary: `Moved "${matches[0].title}" from ${fmtDate(op.from_date)} to ${fmtDate(op.to_date)}` };
}

async function addTask(op: PlannerChangeOp, profile: Profile | null, snapshot: PlannerSnapshot): Promise<{ ok: boolean; summary?: string; error?: string }> {  if (!validTitle(op.title) || !op.date || !DATE_RE.test(op.date)) return { ok: false, error: "Invalid add-task request." };
  const minutes = op.estimated_minutes;
  if (typeof minutes !== "number" || minutes < MIN_OP_ORDER || minutes > MAX_OP_ORDER) {
    return { ok: false, error: `Task duration must be ${MIN_OP_ORDER}-${MAX_OP_ORDER} minutes.` };
  }

  const [tasks, existing] = await Promise.all([
    db.getTasksForDate(op.date).catch(() => [] as PlanTask[]),
    db.getDailyPlanInputs(op.date).catch(() => null),
  ]);
  const dupe = tasks.some((t) => t.title.toLowerCase() === op.title!.trim().toLowerCase() && t.type === (op.task_type ?? "study"));
  if (dupe) return { ok: false, error: `A task "${op.title}" already exists on ${fmtDate(op.date)}.` };

  const cap = await capacityMinutes(op.date, profile, existing);
  const currentMin = tasks.reduce((s, t) => s + (t.estimated_minutes ?? 0), 0);
  if (currentMin + minutes > cap) {
    return { ok: false, error: `Day ${fmtDate(op.date)} is already full (${Math.round(currentMin / 60)}h planned vs ${Math.round(cap / 60)}h capacity).` };
  }

  try {
    await db.insertTasks([
      {
        title: op.title!.trim(),
        subject: op.subject ?? null,
        type: op.task_type ?? "study",
        chapter: op.chapter ?? null,
        estimated_minutes: minutes,
        priority: (op.priority as PlanTask["priority"]) ?? "medium",
        completed: false,
        scheduled_date: op.date,
        start_time: op.start_time ?? null,
        end_time: null,
        source: "ai_mentor",
        tracker_ref: null,
        completion_pct: 0,
        task_status: "pending",
        missed_count: 0,
        reschedule_reason: null,
        actual_minutes: null,
        priority_score: 0,
      } as unknown as PlanTask,
    ] as PlanTask[]);
    snapshot.added.push({ date: op.date, title: op.title!.trim(), type: op.task_type ?? "study" });
    return { ok: true, summary: `Added "${op.title.trim()}" (${minutes} min) on ${fmtDate(op.date)}` };
  } catch (e) {
    console.error("[plannerMentor] addTask threw", e);
    return { ok: false, error: "Could not save the new task." };
  }
}

async function removeTask(op: PlannerChangeOp, _profile: Profile | null, snapshot: PlannerSnapshot): Promise<{ ok: boolean; summary?: string; error?: string }> {
  if (!validTitle(op.task_title) || !op.date || !DATE_RE.test(op.date)) return { ok: false, error: "Invalid remove-task request." };
  const tasks = await db.getTasksForDate(op.date).catch(() => [] as PlanTask[]);
  const matches = matchTask(tasks, op.task_title).filter((t) => t.source !== "coaching");
  if (matches.length === 0) return { ok: false, error: `No removable pending task matching "${op.task_title}" on ${fmtDate(op.date)}.` };
  if (matches.length > 3) return { ok: false, error: `Too many tasks match "${op.task_title}" — please be more specific.` };

  for (const t of matches) {
    snapshot.deleted.push(t);
    await db.deleteTask(t.id);
  }
  return { ok: true, summary: `Removed "${matches[0].title}" from ${fmtDate(op.date)}` };
}

async function updateTaskPriority(op: PlannerChangeOp, _profile: Profile | null, snapshot: PlannerSnapshot): Promise<{ ok: boolean; summary?: string; error?: string }> {
  if (!validTitle(op.task_title) || !op.priority || !["low", "medium", "high", "critical"].includes(op.priority)) {
    return { ok: false, error: "Invalid priority change request." };
  }
  const tasks = await db.getTasksForDate(op.date ?? new Date().toISOString().slice(0, 10)).catch(() => [] as PlanTask[]);
  let matches = matchTask(tasks, op.task_title);
  if (matches.length === 0 && op.from_date) {
    matches = matchTask(await db.getTasksForDate(op.from_date).catch(() => [] as PlanTask[]), op.task_title);
  }
  if (matches.length === 0) return { ok: false, error: `No pending task matching "${op.task_title}".` };
  if (matches.length > 3) return { ok: false, error: `Too many tasks match "${op.task_title}" — please be more specific.` };

  for (const t of matches) {
    snapshot.tasks.push(t);
    await db.updateTask(t.id, { priority: op.priority as PlanTask["priority"] });
  }
  const label = op.priority === "critical" ? "critical" : op.priority;
  return { ok: true, summary: `Raised priority of "${matches[0].title}" to ${label}` };
}

async function updateAvailability(op: PlannerChangeOp, _profile: Profile | null, snapshot: PlannerSnapshot): Promise<{ ok: boolean; summary?: string; error?: string }> {
  const date = op.date ?? new Date().toISOString().slice(0, 10);
  if (!DATE_RE.test(date)) return { ok: false, error: "Invalid date in availability update." };
  const hours = op.study_hours;
  if (typeof hours !== "number" || !Number.isFinite(hours) || hours <= 0 || hours > 16) {
    return { ok: false, error: `Invalid study hours (${hours}).` };
  }
  const existing = await db.getDailyPlanInputs(date).catch(() => null);
  snapshot.inputs[date] = existing;
  await db.saveDailyPlanInputs({
    plan_date: date,
    was_school_day: op.was_school_day ?? existing?.was_school_day ?? false,
    study_hours: Math.round(hours),
    energy_level: (op.energy_level as EnergyLevel | undefined) ?? (existing?.energy_level as EnergyLevel | undefined) ?? "normal",
    exam_tomorrow: op.exam_tomorrow ?? existing?.exam_tomorrow ?? false,
  });
  return { ok: true, summary: `Updated ${fmtDate(date)} availability to ${Math.round(hours)}h` };
}

const EXECUTORS: Record<string, (op: PlannerChangeOp, profile: Profile | null, snapshot: PlannerSnapshot) => Promise<{ ok: boolean; summary?: string; error?: string }>> = {
  regenerate_plan: regenerateDay,
  reschedule_task: rescheduleTask,
  add_task: addTask,
  remove_task: removeTask,
  update_task_priority: updateTaskPriority,
  update_availability: updateAvailability,
};

/**
 * Executes a validated mentor-proposed plan change through the real planner
 * and DB. Returns human-readable summary lines + an undo snapshot.
 * Non-destructive on failure: each op is independently guarded.
 */
export async function applyMentorPlannerChange(change: PlannerChange, profile: Profile | null): Promise<PlannerApplyResult> {
  const snapshot: PlannerSnapshot = { tasks: [], deleted: [], added: [], inputs: {} };
  const summary: string[] = [];
  const errors: string[] = [];

  for (const op of change.changes ?? []) {
    if (!op || typeof op !== "object" || !OP_ENUM.has(op.op)) {
      errors.push("Skipped an invalid change operation.");
      continue;
    }
    try {
      const executor = EXECUTORS[op.op];
      const res = await executor(op, profile, snapshot);
      if (res.ok && res.summary) {
        summary.push(res.summary);
      } else if (!res.ok && res.error) {
        errors.push(res.error);
        console.warn(`[plannerMentor] op ${op.op} rejected: ${res.error}`);
      }
    } catch (e) {
      console.error(`[plannerMentor] op ${op.op} threw`, e);
      errors.push(`Could not apply "${op.op}" — please try again.`);
    }
  }

  const applied = summary.length > 0;
  await markChangeStatus(change.id, applied ? "applied" : "rejected");
  return { applied, summary, errors, snapshot: applied ? snapshot : null };
}

/** Reverts a previously applied change using its snapshot. */
export async function undoMentorPlannerChange(change: PlannerChange, snapshot: PlannerSnapshot | null): Promise<boolean> {
  if (!snapshot) return false;
  if (!supabase) return false;
  try {
    for (const row of snapshot.deleted) {
      await supabase.from("plan_tasks").insert(row);
    }
    for (const t of snapshot.tasks) {
      await db.updateTask(t.id, {
        scheduled_date: t.scheduled_date,
        start_time: t.start_time,
        end_time: t.end_time,
        priority: t.priority,
        reschedule_reason: t.reschedule_reason,
      });
    }
    for (const a of snapshot.added) {
      const tasks = await db.getTasksForDate(a.date).catch(() => [] as PlanTask[]);
      const matches = tasks.filter(
        (t) => t.title.toLowerCase() === a.title.toLowerCase() && (a.type ? t.type === a.type : true)
      );
      for (const t of matches) await db.deleteTask(t.id);
    }
    for (const [date, inputs] of Object.entries(snapshot.inputs)) {
      if (inputs) {
        await db.saveDailyPlanInputs({
          plan_date: date,
          was_school_day: inputs.was_school_day,
          study_hours: inputs.study_hours,
          energy_level: (inputs.energy_level as EnergyLevel) ?? "normal",
          exam_tomorrow: inputs.exam_tomorrow,
        });
      } else {
        await supabase.from("daily_plan_inputs").delete().eq("plan_date", date);
      }
    }
    await markChangeStatus(change.id, "undone");
    return true;
  } catch (e) {
    console.error("[plannerMentor] undo failed", e);
    return false;
  }
}
