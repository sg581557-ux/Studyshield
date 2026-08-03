// Habit calibration for the AI Planner — observes the last 7 days of actual
// study behavior (planned vs completed tasks, focus sessions) and produces a
// personalized time target + peak-productivity slot order.
//
// Adaptive learning rules:
// - Plans are sized against the user's selected hours (weekday/weekend buckets).
// - After ~3+ days of observed data, a blend of "selected" and "actual" is used
//   so the plan never over/under-plans consistently (activation at 3 days,
//   ramp to 75% actual weight by day 10).
// - Hard task types are scheduled into the best observed / selected slots.

import type { Profile, PlanTask, FocusSession } from "../lib/types";
import { db } from "./db";
import { weekdayStudyHours } from "../lib/onboarding";

export const SLOT_ORDER_DEFAULT = ["morning", "afternoon", "evening", "night"] as const;
export const HEAVY_TASK_TYPES = ["lecture", "module", "dpp", "pyq", "mock_test_review", "mistake_analysis"];

const OBSERVATION_DAYS = 7;
const ACTIVATE_AFTER_DAYS = 3;
const MAX_BLEND = 0.75;

export interface HabitStats {
  daysObserved: number;
  plannedMinutes: number;
  completedMinutes: number;
  avgCompletedMinutes: number;
  avgFocusMinutes: number;
  completionRate: number | null;
  consistency: number;
  startDelayAvg: number | null;
  slotMinutes: Record<string, number>;
  bestSlot: string | null;
}

export interface Calibration {
  targetMinutes: number;
  blend: number;
  active: boolean;
  message: string;
}

function slotForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 16) return "afternoon";
  if (hour >= 16 && hour < 20) return "evening";
  return "night";
}

function taskMinutes(t: PlanTask): number {
  return t.actual_minutes ?? t.estimated_minutes;
}

export async function computeHabitStats(profile: Profile): Promise<HabitStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - (OBSERVATION_DAYS - 1));
  const cutoffDate = cutoff.toISOString().slice(0, 10);
  const todayDate = today.toISOString().slice(0, 10);

  let tasks: PlanTask[] = [];
  let focus: FocusSession[] = [];
  try { tasks = await db.getAllTasks(); } catch { /* no data */ }
  try { focus = await db.getFocusSessions(); } catch { /* no data */ }

  const windowTasks = tasks.filter((t) => (t.scheduled_date ?? "") >= cutoffDate && (t.scheduled_date ?? "") <= todayDate);
  const isCompleted = (t: PlanTask) => (t.task_status ?? (t.completed ? "completed" : "pending")) === "completed";

  const focusWindows = focus.filter((f) => {
    if (f.completed !== true) return false;
    const ts = f.started_at ?? f.completed_at;
    return !!ts && ts >= cutoffDate;
  });

  const planned = windowTasks.filter((t) => t.type !== "break" && t.task_status !== "skipped");
  const completed = planned.filter(isCompleted);
  const plannedMinutes = planned.reduce((a, t) => a + taskMinutes(t), 0);
  const completedMinutes = completed.reduce((a, t) => a + taskMinutes(t), 0);
  const completionRate = planned.length > 0 ? Math.round((completed.length / planned.length) * 100) / 100 : null;

  // Days with actual activity → consistency (share of observed days with ≥1 completed task).
  const daysWithTasks = new Set(windowTasks.map((t) => t.scheduled_date).filter((d): d is string => !!d));
  const daysWithCompletion = new Set(completed.map((t) => t.scheduled_date).filter((d): d is string => !!d));
  const daysObserved = Math.min(OBSERVATION_DAYS, daysWithTasks.size);
  const consistency = daysWithTasks.size > 0 ? Math.round((daysWithCompletion.size / daysWithTasks.size) * 100) / 100 : 0;

  const avgCompletedMinutes = daysObserved > 0 ? Math.round(completedMinutes / daysObserved) : 0;
  const focusMinutes = focusWindows.reduce((a, f) => a + (f.duration_minutes ?? f.minutes ?? 0), 0);
  const avgFocusMinutes = daysObserved > 0 ? Math.round(focusMinutes / daysObserved) : 0;

  // Start delay: first planned task start vs first focus session start per day.
  const delays: number[] = [];
  for (const day of daysWithTasks) {
    const dayTasks = windowTasks.filter((t) => t.scheduled_date === day && isCompleted(t));
    const dayFocus = focusWindows.filter((f) => (f.started_at ?? f.completed_at ?? "").slice(0, 10) === day);
    const firstTask = dayTasks.map((t) => t.start_time).filter((s): s is string => !!s).sort()[0];
    const firstFocus = dayFocus
      .map((f) => (f.started_at ?? "").slice(11, 16))
      .filter((s) => s.length === 5)
      .sort()[0];
    if (!firstTask || !firstFocus) continue;
    const [th, tm] = firstTask.split(":").map(Number);
    const [fh, fm] = firstFocus.split(":").map(Number);
    if (!Number.isFinite(th) || !Number.isFinite(fh)) continue;
    const delay = (fh * 60 + fm) - (th * 60 + tm);
    if (delay >= -60) delays.push(delay);
  }
  const startDelayAvg = delays.length > 0 ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : null;

  // Best productive slot by completed study minutes.
  const slotMinutes: Record<string, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  for (const t of completed) {
    const hh = Number((t.start_time ?? "").slice(0, 2));
    if (Number.isFinite(hh)) slotMinutes[slotForHour(hh)] += taskMinutes(t);
  }
  const bestSlot = SLOT_ORDER_DEFAULT.reduce<string | null>(
    (best, slot) => (slotMinutes[slot] > (best ? slotMinutes[best] : -1) ? slot : best),
    null,
  );

  return {
    daysObserved,
    plannedMinutes,
    completedMinutes,
    avgCompletedMinutes,
    avgFocusMinutes,
    completionRate,
    consistency,
    startDelayAvg,
    slotMinutes,
    bestSlot,
  };
}

// Blend the user's selected hours with their actual average so the plan sizes
// itself to reality, gradually shifting toward observed behavior.
export function calibrateStudyHours(selectedHours: number, stats: HabitStats): Calibration {
  const selectedMinutes = Math.max(0, Math.round(selectedHours * 60));
  if (stats.daysObserved < ACTIVATE_AFTER_DAYS || stats.avgCompletedMinutes <= 0) {
    return {
      targetMinutes: selectedMinutes,
      blend: 0,
      active: false,
      message: stats.daysObserved > 0 ? "Still learning your rhythm — using your selected hours." : "",
    };
  }
  const blend = Math.min(MAX_BLEND, stats.daysObserved / (ACTIVATE_AFTER_DAYS * 3.34));
  let target = selectedMinutes * (1 - blend) + stats.avgCompletedMinutes * blend;
  const floor = Math.max(60, Math.round(selectedMinutes * 0.6));
  const ceil = Math.max(selectedMinutes, Math.round(selectedMinutes * 1.25));
  target = Math.max(floor, Math.min(ceil, Math.round(target)));
  const hrs = Math.round((target / 60) * 10) / 10;
  return {
    targetMinutes: target,
    blend: Math.round(blend * 100) / 100,
    active: true,
    message: `Last ${stats.daysObserved} days you actually studied ~${hrs}h/day — plan sized to reality.`,
  };
}

// Peak-productivity slot order: observed best slots first, then the user's
// chosen slots, then the default chronological order.
export function slotOrderFor(profile: Profile, stats: HabitStats | null): string[] {
  const ranked = stats
    ? SLOT_ORDER_DEFAULT.slice()
        .sort((a, b) => (stats.slotMinutes[b] ?? 0) - (stats.slotMinutes[a] ?? 0))
    : [];
  const chosen = profile.productive_slots ?? [];
  const seen = new Set<string>();
  const order: string[] = [];
  for (const s of [...ranked, ...chosen, ...SLOT_ORDER_DEFAULT]) {
    if (!seen.has(s)) { seen.add(s); order.push(s); }
  }
  return order;
}

export function isDayOff(profile: Profile, date: Date): boolean {
  const name = date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  return (profile.days_off ?? []).includes(name);
}

// Hours the user selected for a specific date (weekday bucket vs weekend).
export function selectedHoursFor(profile: Profile, date: Date): number {
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  if (weekday === "saturday" && (profile.saturday_study_hours ?? 0) > 0) return profile.saturday_study_hours ?? 0;
  if (weekday === "sunday" && (profile.sunday_study_hours ?? 0) > 0) return profile.sunday_study_hours ?? 0;
  const bucket = profile.weekday_study_hours ? weekdayStudyHours(profile.weekday_study_hours, 0) : 0;
  if (bucket > 0) return bucket;
  return profile.daily_goal_hours || 0;
}
