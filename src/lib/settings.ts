// Shared option lists, defaults and validation for the Academic Preferences
// page (src/pages/dashboard/AcademicPreferences.tsx).

import type { PriorityWeights } from "./types";

export interface Option { value: string; label: string; }

export const WEEKDAYS: Option[] = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

export const WEEKDAY_LABELS: Record<string, string> = Object.fromEntries(
  WEEKDAYS.map((d) => [d.value, d.label]),
);

export const YEARS: Option[] = (() => {
  const start = new Date().getFullYear();
  return Array.from({ length: 12 }, (_, i) => {
    const y = String(start + i);
    return { value: y, label: y };
  });
})();

export const PLANNER_STYLES: Option[] = [
  { value: "balanced", label: "Balanced", },
  { value: "aggressive", label: "Aggressive" },
  { value: "relaxed", label: "Relaxed" },
  { value: "exam_sprint", label: "Exam Sprint" },
];

export const TIME_FORMATS: Option[] = [
  { value: "12h", label: "12-hour (AM/PM)" },
  { value: "24h", label: "24-hour" },
];

export const DATE_FORMATS: Option[] = [
  { value: "dmy", label: "Day / Month / Year" },
  { value: "mdy", label: "Month / Day / Year" },
  { value: "ymd", label: "Year / Month / Day" },
];

export const MOCK_DURATIONS: Option[] = [
  { value: "60", label: "60 min" },
  { value: "90", label: "90 min" },
  { value: "120", label: "2 hours" },
  { value: "150", label: "2.5 hours" },
  { value: "180", label: "3 hours" },
];

export const DEFAULT_PRIORITY_WEIGHTS: PriorityWeights = {
  backlog: 30,
  lecture: 30,
  practice: 30,
  mock: 10,
};

export const DEFAULT_NOTIFICATION_PREFS = {
  study_reminder: true,
  revision_reminder: true,
  mock_test_reminder: false,
  daily_goal_reminder: true,
  sleep_reminder: false,
};

export const DEFAULT_MOCK_ANALYSIS_PREFS = {
  auto_review: true,
  show_weak_chapters: true,
};

export const NOTIFICATION_FIELDS: { key: string; label: string; desc: string }[] = [
  { key: "study_reminder", label: "Study reminder", desc: "Remind me about today's planned study blocks" },
  { key: "revision_reminder", label: "Revision reminder", desc: "Remind me when a chapter is due for revision" },
  { key: "mock_test_reminder", label: "Mock test reminder", desc: "Remind me before scheduled mock tests" },
  { key: "daily_goal_reminder", label: "Daily goal reminder", desc: "Remind me about my daily study goal" },
  { key: "sleep_reminder", label: "Sleep reminder", desc: "Remind me to wind down at my sleep time" },
];

export interface ValidationResult { valid: boolean; errors: string[]; }

function clampNum(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(v || 0)));
}

export function validateProfileSettings(p: {
  full_name?: string;
  daily_goal_hours?: number;
  max_daily_study_hours?: number | null;
  min_daily_study_hours?: number | null;
  tests_per_week?: number;
  test_duration_min?: number;
  desired_sleep_hours?: number;
  priority_weights?: PriorityWeights;
  practice_revision_ratio?: number;
  session_length_min?: number;
  break_min?: number;
}): ValidationResult {
  const errors: string[] = [];
  if (!p.full_name || !p.full_name.trim()) errors.push("Full name is required.");
  if ((p.daily_goal_hours ?? 0) < 1 || (p.daily_goal_hours ?? 0) > 16) errors.push("Daily study hours must be between 1 and 16.");
  if (p.min_daily_study_hours != null && (p.min_daily_study_hours < 0 || p.min_daily_study_hours > 16)) errors.push("Minimum study hours must be 0–16.");
  if (p.max_daily_study_hours != null && (p.max_daily_study_hours < 1 || p.max_daily_study_hours > 16)) errors.push("Maximum study hours must be 1–16.");
  if (p.min_daily_study_hours != null && p.max_daily_study_hours != null && p.min_daily_study_hours > p.max_daily_study_hours) {
    errors.push("Minimum study hours can't exceed maximum study hours.");
  }
  if (p.practice_revision_ratio != null && (p.practice_revision_ratio < 0 || p.practice_revision_ratio > 100)) {
    errors.push("Practice vs revision ratio must be 0–100.");
  }
  if (p.priority_weights) {
    const w = p.priority_weights;
    const sum = (w.backlog ?? 0) + (w.lecture ?? 0) + (w.practice ?? 0) + (w.mock ?? 0);
    if (sum !== 100) errors.push(`Priority weights must add up to 100 (currently ${sum}).`);
  }
  if (p.tests_per_week != null && (p.tests_per_week < 0 || p.tests_per_week > 7)) errors.push("Tests per week must be 0–7.");
  if (p.test_duration_min != null && (p.test_duration_min < 30 || p.test_duration_min > 300)) errors.push("Test duration must be 30–300 minutes.");
  if (p.desired_sleep_hours != null && (p.desired_sleep_hours < 4 || p.desired_sleep_hours > 12)) errors.push("Sleep hours must be 4–12.");
  if (p.session_length_min != null && (p.session_length_min < 15 || p.session_length_min > 120)) errors.push("Study session must be 15–120 minutes.");
  if (p.break_min != null && (p.break_min < 1 || p.break_min > 60)) errors.push("Break duration must be 1–60 minutes.");
  return { valid: errors.length === 0, errors };
}

/** Normalizes a time string "HH:MM" (24h) — returns "" when empty. */
export function normalizeTime(value: string): string {
  const v = value?.trim() ?? "";
  if (!v) return "";
  const m = v.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return "";
  const h = clampNum(Number(m[1]), 0, 23);
  const min = clampNum(Number(m[2]), 0, 59);
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function clampNumInRange(v: number, min: number, max: number): number {
  return clampNum(v, min, max);
}
