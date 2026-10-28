// Sanitizers for onboarding payload — prevents 22P02 "Invalid value type sent to database"
// by coercing every field to the exact Postgres type before the upsert is attempted.
// Also provides a fallback payload for legacy schemas (target_exam text[] vs text,
// exam_year int vs text) so a single retry fixes existing production DBs.

import type { OnboardingInput, OnboardingBacklog, ClassScheduleEntry } from "./types";
import { examIdForOnboarding, coachingLabel, ONBOARDING_STEP_COUNT } from "./onboarding";

const JEE_ALIASES = new Set([
  "jee-main", "jee-advanced", "jee main", "jee advanced", "jee-main+jee-advanced",
]);
function aliasExamId(value: string): string {
  const lower = value.toLowerCase().trim();
  if (JEE_ALIASES.has(lower)) return "jee";
  return value;
}

// --- small helpers ----------------------------------------------------------

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function toIntOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

function toFloatOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

function toTextOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

function toTextArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string" && x.trim().length > 0).map((x) => String(x).trim());
  if (typeof v === "string" && v.trim().length > 0) return [v.trim()];
  return [];
}

function sanitizeSchedule(input: unknown): ClassScheduleEntry[] {
  if (!Array.isArray(input)) return [];
  const out: ClassScheduleEntry[] = [];
  for (const e of input as unknown[]) {
    if (!e || typeof e !== "object") continue;
    const day = (e as Record<string, unknown>).day;
    const start = (e as Record<string, unknown>).start;
    const end = (e as Record<string, unknown>).end;
    if (typeof day !== "string" || typeof start !== "string" || typeof end !== "string") continue;
    const d = day.toLowerCase().trim();
    if (!d) continue;
    if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) continue;
    out.push({ day: d, start, end });
  }
  return out;
}

function sanitizeAge(v: string): number | null {
  const t = v?.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  const i = Math.round(n);
  if (i < 3 || i > 100) return null; // be permissive — out-of-range still saved as null rather than 22P02
  return i;
}

function sanitizeDailyGoalHours(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return 6;
  // profiles.daily_goal_hours is numeric — any finite number ok
  return Math.max(1, Math.min(24, n));
}

// --- public sanitizers ------------------------------------------------------

/**
 * Builds a payload that matches the *intended* schema (target_exam text, exam_year text).
 * Handles all current production mismatches (array vs text, string vs int, NaN, empty).
 */
export function sanitizeProfilePayload(
  userId: string,
  email: string,
  input: OnboardingInput,
): Record<string, unknown> {
  const schedule = sanitizeSchedule(input.class_schedule);
  const WEEKDAY_SHORT: Record<string, string> = {
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
    sunday: "Sun",
  };
  const firstBlock = schedule[0];
  const coachingType = toTextOrNull(input.coaching_type) ?? "online";
  const coaching = toTextOrNull(input.coaching) ?? "none";
  const coachingEnabled = coachingType !== "self_study" && coaching !== "none" && coaching !== "";

  // subjects / academic_goals / etc are always arrays — strip empties
  const subjects = toTextArray(input.subjects);
  const academicGoals = toTextArray(input.academic_goals);
  const schoolDays = toTextArray(input.school_days);
  const studyDays = toTextArray(input.study_days);
  const daysOff = toTextArray(input.days_off);
  const productiveSlots = toTextArray(input.productive_slots);

  // exam_year: app stores as string "2028" but legacy DB is int — we send STRING
  // (migration will make it text). Guard against garbage.
  let examYear: string | null = null;
  if (typeof input.exam_year === "string" && /^\d{4}$/.test(input.exam_year.trim())) examYear = input.exam_year.trim();
  else if (isFiniteNumber(input.exam_year as unknown)) examYear = String(Math.round(Number(input.exam_year)));
  else examYear = toTextOrNull(input.exam_year);

  const targetExamLabel = toTextOrNull(input.target_exam) ?? "";
  const targetExam = aliasExamId(examIdForOnboarding(targetExamLabel || "")) || "other";

  const fullName = toTextOrNull(input.full_name) ?? "";
  // display_name mirrors full_name
  return {
    id: userId,
    email: toTextOrNull(email) ?? email,
    full_name: fullName,
    display_name: fullName,
    age: sanitizeAge(input.age),
    school_class: toTextOrNull(input.school_class),
    school_name: toTextOrNull(input.school_name),
    target_exam: targetExam, // text — migration handles legacy text[] case
    exam_year: examYear, // text
    current_level: toTextOrNull(input.current_level),
    coaching,
    coaching_type: coachingType,
    coaching_name: toTextOrNull(input.coaching_name) ?? coachingLabel(coaching, input.coaching_other ?? "") ?? null,
    wake_up_time: null,
    sleep_time: null,
    subjects,
    primary_goal: toTextOrNull(input.primary_goal),
    custom_goal: toTextOrNull(input.custom_goal),
    preferred_language: toTextOrNull(input.preferred_language),
    mentor_tone: toTextOrNull(input.mentor_tone),
    daily_goal_hours: sanitizeDailyGoalHours(input.daily_goal_hours),
    class_mode: coachingEnabled ? toTextOrNull(input.class_mode) : null,
    class_schedule: coachingEnabled && (input.class_mode === "live" || input.class_mode === "online") ? schedule : [],
    lecture_duration: coachingEnabled && input.class_mode === "recorded" ? toIntOrNull(input.lecture_duration) ?? 120 : null,
    lectures_per_day: coachingEnabled && input.class_mode === "recorded" ? toIntOrNull(input.lectures_per_day) ?? 2 : null,
    preferred_study_time: toTextOrNull(input.preferred_study_time) ?? "evening",
    stream: toTextOrNull(input.stream),
    academic_goals: academicGoals,
    board: toTextOrNull(input.board),
    productive_time: toTextOrNull(input.productive_time),
    desired_sleep_hours: toFloatOrNull(input.desired_sleep_hours),
    tests_per_week: toIntOrNull(input.tests_per_week) ?? 0,
    school_days: schoolDays,
    school_start: "07:00",
    school_end: "14:00",
    study_days: studyDays,
    coaching_mode: toTextOrNull(coachingType),
    coaching_enabled: coachingEnabled,
    coaching_is_live: coachingEnabled && (input.class_mode === "live" || input.class_mode === "online"),
    coaching_days: schedule.map((e) => WEEKDAY_SHORT[e.day] ?? e.day),
    coaching_start: toTextOrNull(firstBlock?.start) ?? "16:00",
    coaching_end: toTextOrNull(firstBlock?.end) ?? "19:00",
    lecture_duration_min: toIntOrNull(input.lecture_duration) ?? 120,
    revision_time: input.preferred_study_time && input.preferred_study_time !== "flexible" ? toTextOrNull(input.preferred_study_time) ?? "evening" : "evening",
    study_mode: "balanced",
    attends_school: schoolDays.length > 0,
    school_board: toTextOrNull(input.board) ?? "Other",
    weekday_study_hours: toTextOrNull(input.weekday_study_hours),
    saturday_study_hours: (input.saturday_study_hours ?? 0) > 0 ? toIntOrNull(input.saturday_study_hours) : null,
    sunday_study_hours: (input.sunday_study_hours ?? 0) > 0 ? toIntOrNull(input.sunday_study_hours) : null,
    session_length_min: toIntOrNull(input.session_length_min) ?? 45,
    break_min: toIntOrNull(input.break_min) ?? 10,
    days_off: daysOff,
    productive_slots: productiveSlots,
    onboarding_data: input as unknown as Record<string, unknown>,
    onboarding_completed: true,
    onboarding_step: ONBOARDING_STEP_COUNT,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Fallback payload for legacy DB where target_exam is text[] and exam_year is integer.
 * Called only when the first upsert fails with 22P02 and the error message hints at
 * array/integer. Keeps the same sanitized values but with the opposite JS types.
 */
export function fallbackLegacyPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const next = { ...payload };
  // target_exam string -> text[] array
  if (typeof next.target_exam === "string" && next.target_exam) {
    next.target_exam = [next.target_exam as string];
  } else if (typeof next.target_exam === "string") {
    next.target_exam = [];
  }
  // exam_year text "2027" -> integer 2027
  if (typeof next.exam_year === "string" && /^\d{4}$/.test(next.exam_year)) {
    next.exam_year = Number(next.exam_year);
  } else if (next.exam_year === null || next.exam_year === "") {
    // keep null
  }
  // Ensure numeric fields are actually numbers (strip NaN)
  for (const k of ["age", "desired_sleep_hours", "tests_per_week", "saturday_study_hours", "sunday_study_hours", "session_length_min", "break_min", "daily_goal_hours", "lecture_duration", "lectures_per_day", "lecture_duration_min"]) {
    const v = next[k];
    if (typeof v === "string") {
      const n = Number(v);
      next[k] = Number.isFinite(n) ? (k === "daily_goal_hours" || k === "desired_sleep_hours" ? n : Math.round(n)) : null;
    }
    if (typeof v === "number" && !Number.isFinite(v)) next[k] = null;
  }
  return next;
}

// Backlog row sanitizer — ensures pending_* are integers, overall_progress is finite numeric
export function sanitizeBacklogRowInput(b: OnboardingBacklog): {
  pending_lectures: number;
  pending_dpps: number;
  pending_pyqs: number;
  revision_pending: number;
  revision_level: number;
  confidence: number;
  module_pct: number;
  lecture_status: string;
} {
  const clamp = (n: unknown, min: number, max: number, fallback: number) => {
    const v = typeof n === "number" ? n : Number(n);
    if (!Number.isFinite(v)) return fallback;
    return Math.max(min, Math.min(max, Math.round(v)));
  };
  return {
    pending_lectures: clamp(b.pending_lectures, 0, 1000, 0),
    pending_dpps: clamp(b.pending_dpps, 0, 1000, 0),
    pending_pyqs: clamp(b.pending_pyqs, 0, 1000, 0),
    revision_pending: clamp(b.revision_pending, 0, 100, 0),
    revision_level: clamp(b.revision_level, 0, 3, 0),
    confidence: clamp(b.confidence, 1, 5, 3),
    module_pct: clamp(b.module_pct, 0, 100, 0),
    lecture_status: typeof b.lecture_status === "string" && b.lecture_status.trim() ? b.lecture_status.trim() : "not_started",
  };
}

export function isInvalidTypeError(err: unknown): boolean {
  const e = err as { code?: string; message?: string; details?: string };
  if (e?.code === "22P02") return true;
  const msg = `${e?.message ?? ""} ${e?.details ?? ""}`.toLowerCase();
  return msg.includes("invalid input syntax") || msg.includes("malformed array literal");
}
