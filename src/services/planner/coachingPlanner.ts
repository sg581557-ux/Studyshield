import { db, aliasExamId } from "../db";
import type {
  BacklogItem, EnergyLevel, PlanTask, Priority, Profile,
  SyllabusSubject, SyllabusChapter, UserChapter,
  TaskStatus, RecoveryItem, StudyStats, PriorityWeights,
} from "../../lib/types";
import { computeTaskPriority, rankChapters } from "./priorityEngine";
import { predictedDuration } from "./learningModel";
import { getRevisionCandidates, type RevisionCandidate } from "./revisionEngine";
import { detectBurnout, applyBurnoutAdjustments } from "./burnoutDetector";
import {
  computeHabitStats, calibrateStudyHours, slotOrderFor, isDayOff,
  HEAVY_TASK_TYPES, type HabitStats, type Calibration,
} from "../habitStats";

export type CoachingType = "online" | "offline" | "hybrid" | "self_study";

export interface CoachingPlannerInput {
  profile: Profile;
  studyHours: number;
  energyLevel: EnergyLevel;
  wasSchoolDay: boolean;
  examTomorrow: boolean;
  date: string;
  notes?: string;
  completedToday?: string;
  unexpectedEvents?: string;
}

export interface CoachingPlannerResult {
  tasks: PlanTask[];
  diagnostics: {
    requestedMinutes: number;
    adjustedMinutes: number;
    scheduledMinutes: number;
    gapMinutes: number;
    taskCount: number;
    byType: Record<string, number>;
    bySubject: Record<string, number>;
    coachingType: CoachingType;
    timeAllocation: Record<string, number>;
    bufferMinutes: number;
    breakMinutes: number;
    utilizationPct: number;
    burnout: { level: string; detected: boolean; reasons: string[]; recommendations: string[] };
    motivationalInsight: string;
    estimatedFinishTime: string;
    warnings: string[];
    dataChecks: { profile: boolean; subjects: boolean; chapters: boolean; studyHours: boolean; inputValid: boolean };
  };
}

interface PlannedTask {
  title: string; subject: string | null; type: string; estimated_minutes: number;
  priority: Priority; chapter: string | null; source: string; priority_score: number;
  tracker_ref: Record<string, unknown> | null; reason: string;
}

const TOLERANCE_MIN = 10;
const MIN_SLOT_MIN = 15;
const JEE_SUBJECTS_FALLBACK = ["Physics", "Chemistry", "Mathematics"];
const BREAK_MIN = 10;
const BREAK_EVERY_MIN = 80;
const MODULE_CHUNK_QS = 20;
const WEAK_CONFIDENCE = 2;
// Extra lectures for the current chapter beyond the 2/day base, scaled by how
// much lecture backlog the user has (1 extra per ~2 pending backlog lectures).
const MAX_CURRENT_LECTURE_EXTRA = 4;

// Spaced repetition intervals (1, 3, 7, 15, 30 days per spec)
const REVISION_INTERVALS = [1, 3, 7, 15, 30];

function fmtTime(base: Date, minutesFromBase: number): string {
  const d = new Date(base.getTime() + minutesFromBase * 60000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function toMin(hhmm: string | undefined | null): number | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function pick<T>(arr: T[], i: number): T | null { return arr.length === 0 ? null : arr[i % arr.length]; }

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  const diff = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  return diff;
}

function daysSince(ts: string | null | undefined): number {
  if (!ts) return 999;
  return Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 86400000));
}

function weaknessOf(uc: UserChapter): number {
  return Math.max(0, Math.min(4, 5 - (uc.confidence ?? 3)));
}

function adjustedInterval(interval: number, weakness: number): number {
  return Math.max(1, interval - Math.round(weakness * 0.5));
}

function revisionNumberDue(uc: UserChapter): number {
  const days = daysSince(uc.updated_at);
  const weakness = weaknessOf(uc);
  let n = 0;
  for (const iv of REVISION_INTERVALS) {
    if (days >= adjustedInterval(iv, weakness)) n++;
  }
  return Math.min(REVISION_INTERVALS.length, n);
}

function revisionDue(uc: UserChapter): boolean {
  if (uc.status === "completed" || uc.status === "mastered") {
    return revisionNumberDue(uc) > 0;
  }
  if (uc.revision_pending && uc.revision_pending > 0) return true;
  if (uc.status === "revision_pending" || uc.status === "in_progress" || uc.status === "started") return true;
  return false;
}

function hasProgressFlags(uc: UserChapter): boolean {
  const p = uc.progress as Record<string, unknown> | null;
  if (!p) return false;
  return p.lectureCompleted === true || p.moduleQuestionsCompleted === true ||
    p.dppCompleted === true || p.pyqsSolved === true || p.revision1 === true ||
    p.notesCompleted === true || p.conceptMastered === true;
}

function isActiveChapter(uc: UserChapter, inBacklog: boolean): boolean {
  if (uc.status === "completed" || uc.status === "mastered") {
    return (uc.lectures_remaining ?? 0) > 0 || (uc.questions_remaining ?? 0) > 0 || (uc.revision_pending ?? 0) > 0;
  }
  return (uc.lectures_remaining ?? 0) > 0 || (uc.questions_remaining ?? 0) > 0 || (uc.revision_pending ?? 0) > 0
    || hasProgressFlags(uc) || inBacklog;
}

function chapterRemainingWork(uc: UserChapter): number {
  return (uc.lectures_remaining ?? 0) + (uc.questions_remaining ?? 0) + (uc.revision_pending ?? 0);
}

function chapterProgressPct(uc: UserChapter): number {
  const total = ((uc.progress?.total_lectures as number) ?? uc.lectures_remaining ?? 0) +
    ((uc.progress?.total_questions as number) ?? uc.questions_remaining ?? 0) +
    ((uc.progress?.total_revisions as number) ?? uc.revision_pending ?? 0);
  if (total === 0) return 1;
  const remaining = chapterRemainingWork(uc);
  return Math.max(0, Math.min(1, 1 - remaining / total));
}

interface ActiveChapter {
  uc: UserChapter;
  subject: string;
  chapter: string;
  score: number;
  remainingWork: number;
  progressPct: number;
  backlogItem: BacklogItem | null;
  isWeak: boolean;
  inClassNow: boolean;
}

function getActiveChapters(
  userChapters: UserChapter[],
  backlog: BacklogItem[],
  recovery: RecoveryItem[],
  profile: Profile,
): ActiveChapter[] {
  const backlogKeys = new Set(backlog.map((b) => `${b.subject}|${b.chapter}`));
  const active = userChapters.filter((uc) => isActiveChapter(uc, backlogKeys.has(`${uc.subject}|${uc.chapter}`)));
  const ranked = rankChapters(active, backlog, recovery, profile);
  return active.map((uc) => {
    const rank = ranked.find((r) => r.subject === uc.subject && r.chapter === uc.chapter);
    const backlogItem = backlog.find((b) => b.subject === uc.subject && b.chapter === uc.chapter && b.status === "todo") ?? null;
    return {
      uc,
      subject: uc.subject,
      chapter: uc.chapter,
      score: rank?.score ?? 0,
      remainingWork: chapterRemainingWork(uc),
      progressPct: chapterProgressPct(uc),
      backlogItem,
      isWeak: uc.status !== "completed" && uc.status !== "mastered" && (uc.confidence ?? 3) <= WEAK_CONFIDENCE,
      inClassNow: uc.is_current ?? (uc.status === "in_progress" || uc.status === "started"),
    };
  }).sort((a, b) => {
    if (a.progressPct >= 0.6 && b.progressPct < 0.6) return -1;
    if (b.progressPct >= 0.6 && a.progressPct < 0.6) return 1;
    return b.score - a.score;
  });
}

interface BacklogPool {
  lectures: BacklogItem[]; dpps: BacklogItem[]; modules: BacklogItem[];
  pendingLectures: number; pendingDpps: number; pendingModuleQs: number;
  lowPriority: BacklogItem[];
}

function categorizeBacklog(items: BacklogItem[]): BacklogPool {
  const open = items.filter((b) => b.status === "todo");
  const lectures: BacklogItem[] = [], dpps: BacklogItem[] = [], modules: BacklogItem[] = [], lowPriority: BacklogItem[] = [];
  let pendingLectures = 0, pendingDpps = 0, pendingModuleQs = 0;
  for (const b of open) {
    const kinds = b.backlog_types ?? [];
    if (kinds.includes("lecture") && (b.pending_lectures ?? 0) > 0) { lectures.push(b); pendingLectures += b.pending_lectures ?? 0; }
    if (kinds.includes("dpp") && (b.pending_dpps ?? 0) > 0) { dpps.push(b); pendingDpps += b.pending_dpps ?? 0; }
    if (kinds.includes("module") && (b.module_questions_remaining ?? 0) > 0) { modules.push(b); pendingModuleQs += b.module_questions_remaining ?? 0; }
    if (b.priority === "low") lowPriority.push(b);
  }
  return { lectures, dpps, modules, pendingLectures, pendingDpps, pendingModuleQs, lowPriority };
}

// Live-class blocks for the given date. Uses the new multi-block
// `class_schedule` (jsonb: [{day:"monday", start:"16:00", end:"19:00"}])
// when present, falling back to the legacy single window
// (coaching_days + coaching_start/coaching_end) for older profiles.
// These tasks BLOCK the calendar — the plan is scheduled around them.
function buildCoaching(profile: Profile, date: string): PlannedTask[] {
  const isEnabled = !!profile.coaching_enabled;
  if (!isEnabled) return [];

  const dateObj = new Date(date + "T00:00:00");
  const wdShort = dateObj.toLocaleDateString("en-US", { weekday: "short" });
  const wdLong = dateObj.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const name = profile.coaching_name || "Online class";
  const schedule = Array.isArray(profile.class_schedule) ? profile.class_schedule : [];
  const usesSchedule = profile.class_mode === "live" && schedule.length > 0;

  if (usesSchedule) {
    const tasks: PlannedTask[] = [];
    for (const b of schedule) {
      if (!b || b.day !== wdLong) continue;
      if (!b.start || !b.end || b.start >= b.end) continue;
      const [sh, sm] = b.start.split(":").map(Number);
      const [eh, em] = b.end.split(":").map(Number);
      if (!Number.isFinite(sh) || !Number.isFinite(eh)) continue;
      const mins = Math.max(30, (eh * 60 + em) - (sh * 60 + sm));
      tasks.push({
        title: `Coaching: ${name}`,
        subject: null, type: "coaching", estimated_minutes: mins,
        priority: "high", chapter: null, source: "coaching", priority_score: 10,
        tracker_ref: { class_start: b.start, class_end: b.end },
        reason: `Today's live class (${wdLong}). The plan is built around what is being taught right now.`,
      });
    }
    return tasks;
  }

  // Legacy: one block per day.
  if (!profile.coaching_days?.length) return [];
  if (!profile.coaching_days.includes(wdShort)) return [];
  const [sh, sm] = (profile.coaching_start ?? "16:00").split(":").map(Number);
  const [eh, em] = (profile.coaching_end ?? "19:00").split(":").map(Number);
  if (!Number.isFinite(sh) || !Number.isFinite(eh)) return [];
  return [{ title: `Coaching: ${name}`, subject: null, type: "coaching", estimated_minutes: Math.max(30, (eh * 60 + em) - (sh * 60 + sm)), priority: "high", chapter: null, source: "coaching", priority_score: 10, tracker_ref: { class_start: profile.coaching_start ?? "16:00", class_end: profile.coaching_end ?? "19:00" }, reason: "Today's coaching — the plan is built around what is being taught right now." }];
}

// School hours for the given date (onboarding v3: school_days + school_start /
// school_end). Returns the pinned block that the scheduler reserves — study
// tasks are never placed inside school hours. Null when the student has no
// school that day (or no school schedule set).
function buildSchool(profile: Profile, date: string): PlannedTask | null {
  const days = Array.isArray(profile.school_days) ? profile.school_days : [];
  if (days.length === 0) return null;
  const dateObj = new Date(date + "T00:00:00");
  const wdLong = dateObj.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  if (!days.includes(wdLong)) return null;
  const start = profile.school_start ?? "07:00";
  const end = profile.school_end ?? "14:00";
  if (!start || !end || start >= end) return null;
  const mins = Math.max(30, (toMin(end) ?? 0) - (toMin(start) ?? 0));
  const name = profile.school_name || "School";
  return {
    title: name,
    subject: null, type: "school", estimated_minutes: mins,
    priority: "high", chapter: null, source: "school", priority_score: 10,
    tracker_ref: { class_start: start, class_end: end },
    reason: `School hours (${wdLong}) — the plan is built around your free time.`,
  };
}

// Weekly mock test for the given date (onboarding v3: tests_per_week).
// Deterministic cadence: 7+ tests → every day; N tests → every round(7/N) days
// starting Monday. Null when no tests are planned.
function buildWeeklyTest(profile: Profile, date: string): PlannedTask | null {
  const tests = Math.max(0, Math.min(7, profile.tests_per_week ?? 0));
  if (tests === 0) return null;
  const dateObj = new Date(date + "T00:00:00");
  const dayIndex = (dateObj.getDay() + 6) % 7; // Monday = 0 … Sunday = 6
  const step = tests >= 7 ? 1 : Math.max(1, Math.round(7 / tests));
  if (dayIndex % step !== 0) return null;
  return {
    title: "Weekly mock test",
    subject: null, type: "mock_test", estimated_minutes: 75,
    priority: "high", chapter: null, source: "test", priority_score: 9.5,
    tracker_ref: { cadence: `${tests} per week` },
    reason: `Weekly test day — ${tests} test${tests === 1 ? "" : "s"} a week builds exam stamina and shows where you stand.`,
  };
}

// Recorded-class students: auto-schedule their lectures (duration + count per
// day from the profile). Recorded mode alone means lectures to watch — no
// coaching_enabled gate, so a recorded student always gets lectures even when
// live-coaching is disabled. Lectures rotate across subjects: the current
// chapter first, then the other active chapters (priority-ranked), so a
// student with multiple active chapters never watches the same subject twice
// in a row. The planner's slot-aware scheduling then places them in the user's
// preferred study time slot. Each lecture is shrunk (floor 30 min) so all
// `count` lectures fit the day.
function buildRecordedLectures(profile: Profile, activeChapters: ActiveChapter[], schedulableMinutes: number): PlannedTask[] {
  if (profile.class_mode !== "recorded") return [];
  const count = Math.max(2, Math.min(6, profile.lectures_per_day ?? 2));
  const raw = Math.max(15, Math.min(240, profile.lecture_duration ?? 60));
  const dur = Math.min(raw, Math.max(30, Math.floor(schedulableMinutes / count)));

  // Rotation pool: current chapters first, then the rest of the active
  // chapters (already ranked by priority).
  const candidates = [
    ...activeChapters.filter((a) => a.inClassNow),
    ...activeChapters.filter((a) => !a.inClassNow),
  ];

  const tasks: PlannedTask[] = [];
  for (let i = 0; i < count; i++) {
    let ac = candidates.length > 0 ? candidates[i % candidates.length] : null;
    if (ac) {
      // Never schedule two recorded lectures from the same subject back to
      // back — step to another subject when one is available.
      const prev = tasks[tasks.length - 1];
      if (prev?.subject && prev.subject === ac.subject) {
        const otherSubject = candidates.find((c) => c.subject !== prev.subject);
        if (otherSubject) ac = otherSubject;
      }
      tasks.push({
        title: `Recorded lecture: ${ac.subject} — ${ac.chapter}`,
        subject: ac.subject, type: "lecture", estimated_minutes: dur,
        priority: "high", chapter: ac.chapter, source: "recorded", priority_score: 8.5,
        tracker_ref: ac.uc.id ? { user_chapter_id: ac.uc.id, field: "lectures_remaining", decrement: 1, progress_flag: "lectureCompleted" } : null,
        reason: "Auto-scheduled recorded lecture — watch it during your preferred study time.",
      });
    } else {
      tasks.push({
        title: "Recorded lecture",
        subject: null, type: "lecture", estimated_minutes: dur,
        priority: "high", chapter: null, source: "recorded", priority_score: 8.5,
        tracker_ref: null,
        reason: "Auto-scheduled recorded lecture — watch it during your preferred study time.",
      });
    }
  }
  return tasks;
}

/**
 * Determine the user's coaching type from their profile.
 * Reads `coaching_type` (onboarding) and falls back to `coaching_mode`
 * (Academic Preferences), defaulting to "online" if not set.
 */
export function getCoachingType(profile: Profile): CoachingType {
  const ct = (profile.coaching_type ?? profile.coaching_mode ?? "")?.toLowerCase();
  if (ct === "offline") return "offline";
  if (ct === "hybrid") return "hybrid";
  if (ct === "self_study") return "self_study";
  return "online";
}

/**
 * Compute the time allocation (in minutes) per category based on coaching type.
 * Handles the "backlog = 0" redistribution automatically.
 *
 * `prefs` (Academic Preferences) optionally override the hardcoded splits:
 * - weights: {backlog, lecture, practice, mock} priority percentages. When set,
 *   lecture weight → new-work time, practice+mock weights → the practice/
 *   revision pool, backlog weight → backlog time (0 when no backlog).
 * - practiceRatio: practice % of the practice+revision pool (default 75).
 * When `prefs` is omitted the legacy per-case defaults are kept exactly.
 */
export function computeTimeAllocation(
  coachingType: CoachingType,
  totalMinutes: number,
  hasBacklog: boolean,
  prefs: { practiceRatio?: number | null; weights?: Partial<PriorityWeights> | null } | null = null,
): Record<string, number> {
  const w: Partial<PriorityWeights> = prefs?.weights ?? {};
  const hasWeights = w.lecture != null || w.practice != null || w.mock != null || w.backlog != null;
  const alloc: Record<string, number> = {};

  let newWorkPct: number;
  let backlogPct: number;
  let poolPct: number;
  let ratio: number;

  if (hasWeights) {
    const lectureW = coachingType === "offline" ? 0 : Math.max(0, w.lecture ?? 30);
    const poolW = Math.max(0, (w.practice ?? 30) + (w.mock ?? 10));
    const backlogW = hasBacklog ? Math.max(0, w.backlog ?? 30) : 0;
    const norm = lectureW + poolW + backlogW || 1;
    newWorkPct = (lectureW / norm) * 100;
    backlogPct = (backlogW / norm) * 100;
    poolPct = 100 - newWorkPct - backlogPct;
    ratio = typeof prefs?.practiceRatio === "number" && prefs.practiceRatio >= 0 && prefs.practiceRatio <= 100
      ? prefs.practiceRatio
      : 75;
  } else if (coachingType === "offline") {
    newWorkPct = 0;
    backlogPct = hasBacklog ? 20 : 0;
    poolPct = hasBacklog ? 80 : 100;
    ratio = hasBacklog ? 75 : 80;
  } else if (hasBacklog) {
    newWorkPct = 30;
    backlogPct = 30;
    poolPct = 40;
    ratio = 75;
  } else {
    newWorkPct = 60;
    backlogPct = 0;
    poolPct = 40;
    ratio = 75;
  }

  alloc.newWork = Math.round((totalMinutes * newWorkPct) / 100);
  alloc.backlog = Math.round((totalMinutes * backlogPct) / 100);
  alloc.practice = Math.round(((totalMinutes * poolPct) / 100) * (ratio / 100));
  alloc.revision = Math.round(((totalMinutes * poolPct) / 100) * ((100 - ratio) / 100));

  // Ensure the total doesn't exceed available minutes (rounding)
  const sum = alloc.newWork + alloc.practice + alloc.backlog + alloc.revision;
  if (sum > totalMinutes) {
    alloc.revision = Math.max(0, alloc.revision - (sum - totalMinutes));
  }

  return alloc;
}

/**
 * Guaranteed lecture block for online coaching: at least 2 lectures from the
 * current chapter (plus extras when backlog exists), then backlog lectures by
 * deadline, then other ongoing chapters, then a generic 2/day top-up and
 * fallback lectures when no chapters exist. Budget = the lecture reserve
 * reserved before the category allocation, so practice/backlog budgets can
 * never starve lectures.
 */
function buildGuaranteedLectures(
  activeChapters: ActiveChapter[],
  pool: BacklogPool,
  budget: number,
  lecMin: number,
  chapterRank: { subject: string; chapter: string; score: number }[],
  recovery: RecoveryItem[],
  examTomorrow: boolean,
  fallbackSubject: string,
): PlannedTask[] {
  const tasks: PlannedTask[] = [];
  let used = 0;
  const canFit = (min: number) => used + min <= budget + TOLERANCE_MIN;

  const pushChapterLecture = (oc: ActiveChapter, reason: string): boolean => {
    if (!canFit(lecMin)) return false;
    const tracked = (oc.uc.lectures_remaining ?? 0) > 0 && !!oc.uc.id;
    const ps = computeTaskPriority("lecture", oc.subject, oc.chapter, chapterRank, recovery, examTomorrow);
    tasks.push({
      title: `Lecture: ${oc.subject} — ${oc.chapter}`,
      subject: oc.subject, type: "lecture", estimated_minutes: lecMin,
      priority: "high", chapter: oc.chapter, source: "new_work",
      priority_score: ps + 0.5,
      tracker_ref: tracked
        ? { user_chapter_id: oc.uc.id, field: "lectures_remaining", decrement: 1, progress_flag: "lectureCompleted" }
        : null,
      reason,
    });
    used += lecMin;
    oc.uc.lectures_remaining = Math.max(0, (oc.uc.lectures_remaining ?? 0) - 1);
    return true;
  };

  // 1. Current chapter (top ongoing) — at least 2 lectures, plus extra lectures
  //    when backlog exists so the current chapter finishes before anything else.
  let chapterLectures = 0;
  const ongoing = activeChapters.filter((ac) => ac.inClassNow);
  const current = ongoing[0] ?? null;
  if (current) {
    const backlogExtra = Math.min(MAX_CURRENT_LECTURE_EXTRA, Math.ceil((pool.pendingLectures ?? 0) / 2));
    const perChapter = Math.min(2 + backlogExtra, current.uc.lectures_remaining ?? 0);
    for (let i = 0; i < perChapter; i++) {
      const reason = i < 2
        ? "Today's lecture for your current chapter — staying in sync with class."
        : "Extra lecture for your current chapter — finishing it clears room for backlog.";
      if (!pushChapterLecture(current, reason)) break;
      chapterLectures++;
    }
  }

  // 2. Backlog lectures (missed lectures) — nearest deadline first. These are
  //    scheduled before new lectures from other chapters because clearing the
  //    backlog keeps the user in sync with class.
  const backlogLectures = [...pool.lectures].sort((a, b) => (daysUntil(a.due_date) ?? 999) - (daysUntil(b.due_date) ?? 999));
  for (const b of backlogLectures) {
    if (!canFit(lecMin)) break;
    if ((b.pending_lectures ?? 0) <= 0) continue;
    tasks.push({
      title: `Backlog lecture: ${b.subject ?? ""} ${b.chapter ? `— ${b.chapter}` : ""}`.trim(),
      subject: b.subject ?? null, type: "lecture", estimated_minutes: lecMin,
      priority: "high", chapter: b.chapter ?? null, source: "backlog",
      priority_score: 8.6,
      tracker_ref: { backlog_id: b.id, kind: "lecture", auto_decrement: true, decrement: 1 },
      reason: "Missed lecture from backlog — catching up keeps you in sync with class.",
    });
    used += lecMin;
    b.pending_lectures = Math.max(0, (b.pending_lectures ?? 0) - 1);
  }

  // 3. Other ongoing chapters — up to 2 lectures each.
  for (const oc of ongoing) {
    if (oc === current) continue;
    const perChapter = Math.min(2, oc.uc.lectures_remaining ?? 0);
    for (let i = 0; i < perChapter; i++) {
      if (!pushChapterLecture(oc, "Today's lecture for your current chapter — staying in sync with class.")) break;
      chapterLectures++;
    }
  }

  // 4. Guarantee — at least 2 lectures/day. Top up from the next best active
  //    chapters (already ranked by priority) when ongoing work can't fill it.
  if (chapterLectures < 2) {
    for (const oc of activeChapters.filter((ac) => !ac.inClassNow)) {
      if (chapterLectures >= 2) break;
      const perChapter = Math.min(2 - chapterLectures, Math.max(1, oc.uc.lectures_remaining ?? 0));
      for (let i = 0; i < perChapter; i++) {
        if (!pushChapterLecture(oc, "Guaranteed lecture — daily lectures keep momentum and progress.")) break;
        chapterLectures++;
      }
    }
  }

  // 5. Generic lectures — no chapters available, still honor the 2/day minimum.
  for (let i = chapterLectures; i < 2; i++) {
    if (!canFit(lecMin)) break;
    tasks.push({
      title: `Lecture: ${fallbackSubject}`,
      subject: fallbackSubject, type: "lecture", estimated_minutes: lecMin,
      priority: "high", chapter: null, source: "new_work",
      priority_score: 8.0,
      tracker_ref: null,
      reason: "Guaranteed lecture — daily lectures keep momentum and progress.",
    });
    used += lecMin;
    chapterLectures++;
  }

  return tasks;
}

/**
 * Build the "New Work" tasks for online coaching.
 * Lectures are handled separately by buildGuaranteedLectures — this only
 * covers module questions, DPPs and PYQs for the top ongoing chapter.
 */
function buildNewWorkTasks(
  activeChapters: ActiveChapter[],
  budget: number,
  dppMin: number,
  moduleMin: number,
  pyqMin: number,
  chapterRank: { subject: string; chapter: string; score: number }[],
  recovery: RecoveryItem[],
  examTomorrow: boolean,
): PlannedTask[] {
  const tasks: PlannedTask[] = [];
  let used = 0;

  // Only use the current ongoing chapter (in_progress/started)
  const ongoing = activeChapters.filter((ac) => ac.inClassNow);
  if (ongoing.length === 0) return tasks;

  const ac = ongoing[0]; // The current top chapter
  const canFit = (min: number) => used + min <= budget + TOLERANCE_MIN;

  // 2. Today's module (if questions remaining)
  if ((ac.uc.questions_remaining ?? 0) > 0 && canFit(moduleMin)) {
    const ps = computeTaskPriority("module", ac.subject, ac.chapter, chapterRank, recovery, examTomorrow);
    tasks.push({
      title: `Module: ${ac.subject} — ${ac.chapter}`,
      subject: ac.subject, type: "module", estimated_minutes: moduleMin,
      priority: "high", chapter: ac.chapter, source: "new_work",
      priority_score: ps + 0.4,
      tracker_ref: { user_chapter_id: ac.uc.id, field: "questions_remaining", decrement: 1, progress_flag: "moduleQuestionsCompleted" },
      reason: "Today's module questions for your current chapter.",
    });
    used += moduleMin;
    ac.uc.questions_remaining = Math.max(0, (ac.uc.questions_remaining ?? 0) - 1);
  }

  // 3. Today's DPP (if pending)
  const bl = ac.backlogItem;
  if (bl && (bl.pending_dpps ?? 0) > 0 && canFit(dppMin)) {
    const ps = computeTaskPriority("dpp", ac.subject, ac.chapter, chapterRank, recovery, examTomorrow);
    tasks.push({
      title: `DPP: ${ac.subject} — ${ac.chapter}`,
      subject: ac.subject, type: "dpp", estimated_minutes: dppMin,
      priority: "high", chapter: ac.chapter, source: "new_work",
      priority_score: ps + 0.3,
      tracker_ref: { backlog_id: bl.id, kind: "dpp", auto_decrement: true, decrement: 1, user_chapter_id: ac.uc.id, field: "questions_remaining", progress_flag: "dppCompleted" },
      reason: "Today's DPP for your current chapter.",
    });
    used += dppMin;
    bl.pending_dpps = Math.max(0, (bl.pending_dpps ?? 0) - 1);
  }

  // 4. Today's homework / PYQs (if remaining budget)
  if (used < budget - MIN_SLOT_MIN && (ac.uc.questions_remaining ?? 0) > 0 && canFit(pyqMin)) {
    const ps = computeTaskPriority("pyq", ac.subject, ac.chapter, chapterRank, recovery, examTomorrow);
    tasks.push({
      title: `PYQs: ${ac.subject} — ${ac.chapter}`,
      subject: ac.subject, type: "pyq", estimated_minutes: pyqMin,
      priority: "medium", chapter: ac.chapter, source: "new_work",
      priority_score: ps + 0.2,
      tracker_ref: { user_chapter_id: ac.uc.id, field: "questions_remaining", decrement: 1, progress_flag: "pyqsSolved" },
      reason: "Today's homework / PYQs for your current chapter.",
    });
    used += pyqMin;
  }

  return tasks;
}

/**
 * Build practice tasks from the current chapter.
 * Includes: Module Questions, PYQs, DPP Practice, Coaching Homework, Mixed Practice.
 */
function buildPracticeTasks(
  activeChapters: ActiveChapter[],
  budget: number,
  moduleMin: number,
  pyqMin: number,
  dppMin: number,
  practiceMin: number,
  chapterRank: { subject: string; chapter: string; score: number }[],
  recovery: RecoveryItem[],
  examTomorrow: boolean,
): PlannedTask[] {
  const tasks: PlannedTask[] = [];
  let used = 0;
  const canFit = (min: number) => used + min <= budget + TOLERANCE_MIN;

  // Practice from the current chapter first
  const ongoing = activeChapters.filter((ac) => ac.inClassNow);
  const practicePool = ongoing.length > 0 ? ongoing : activeChapters;

  for (const ac of practicePool) {
    if (used >= budget - MIN_SLOT_MIN) break;

    // Module questions
    if ((ac.uc.questions_remaining ?? 0) > 0 && canFit(moduleMin)) {
      const ps = computeTaskPriority("module", ac.subject, ac.chapter, chapterRank, recovery, examTomorrow);
      tasks.push({
        title: `Module practice: ${ac.subject} — ${ac.chapter}`,
        subject: ac.subject, type: "module", estimated_minutes: moduleMin,
        priority: "medium", chapter: ac.chapter, source: "practice",
        priority_score: ps,
        tracker_ref: { user_chapter_id: ac.uc.id, field: "questions_remaining", decrement: 1, progress_flag: "moduleQuestionsCompleted" },
        reason: "Module questions — practice consistency for this chapter.",
      });
      used += moduleMin;
      ac.uc.questions_remaining = Math.max(0, (ac.uc.questions_remaining ?? 0) - 1);
    }

    // PYQs
    if (used < budget - MIN_SLOT_MIN && (ac.uc.questions_remaining ?? 0) > 0 && canFit(pyqMin)) {
      const ps = computeTaskPriority("pyq", ac.subject, ac.chapter, chapterRank, recovery, examTomorrow);
      tasks.push({
        title: `PYQs: ${ac.subject} — ${ac.chapter}`,
        subject: ac.subject, type: "pyq", estimated_minutes: pyqMin,
        priority: "medium", chapter: ac.chapter, source: "practice",
        priority_score: ps,
        tracker_ref: { user_chapter_id: ac.uc.id, field: "questions_remaining", decrement: 1, progress_flag: "pyqsSolved" },
        reason: "Previous-year questions — the fastest way to see the exam pattern.",
      });
      used += pyqMin;
    }

    // DPP practice
    const bl = ac.backlogItem;
    if (bl && (bl.pending_dpps ?? 0) > 0 && used < budget - MIN_SLOT_MIN && canFit(dppMin)) {
      const ps = computeTaskPriority("dpp", ac.subject, ac.chapter, chapterRank, recovery, examTomorrow);
      tasks.push({
        title: `DPP practice: ${ac.subject} — ${ac.chapter}`,
        subject: ac.subject, type: "dpp", estimated_minutes: dppMin,
        priority: "medium", chapter: ac.chapter, source: "practice",
        priority_score: ps,
        tracker_ref: { backlog_id: bl.id, kind: "dpp", auto_decrement: true, decrement: 1, user_chapter_id: ac.uc.id, field: "questions_remaining", progress_flag: "dppCompleted" },
        reason: "DPP practice — daily practice compounds.",
      });
      used += dppMin;
      bl.pending_dpps = Math.max(0, (bl.pending_dpps ?? 0) - 1);
    }

    // Mixed practice
    if (used < budget - MIN_SLOT_MIN && canFit(practiceMin)) {
      const ps = computeTaskPriority("practice", ac.subject, ac.chapter, chapterRank, recovery, examTomorrow);
      tasks.push({
        title: `Mixed practice: ${ac.subject} — ${ac.chapter}`,
        subject: ac.subject, type: "practice", estimated_minutes: practiceMin,
        priority: "medium", chapter: ac.chapter, source: "practice",
        priority_score: ps,
        tracker_ref: null,
        reason: "Mixed practice from the current chapter — varied questions build speed.",
      });
      used += practiceMin;
    }
  }

  // If still room, add practice from other active chapters
  if (used < budget - MIN_SLOT_MIN) {
    for (const ac of activeChapters) {
      if (used >= budget - MIN_SLOT_MIN) break;
      if (practicePool.includes(ac)) continue;
      if (canFit(practiceMin)) {
        const ps = computeTaskPriority("practice", ac.subject, ac.chapter, chapterRank, recovery, examTomorrow);
        tasks.push({
          title: `Practice: ${ac.subject} — ${ac.chapter}`,
          subject: ac.subject, type: "practice", estimated_minutes: practiceMin,
          priority: "low", chapter: ac.chapter, source: "practice",
          priority_score: ps,
          tracker_ref: null,
          reason: "Extra practice — volume builds speed.",
        });
        used += practiceMin;
      }
    }
  }

  return tasks;
}

/**
 * Build backlog tasks from the backlog database.
 * Never invents backlog — only uses real pending items.
 */
function buildBacklogTasks(
  pool: BacklogPool,
  budget: number,
  lecMin: number,
  dppMin: number,
  moduleMin: number,
  pyqMin: number,
  _chapterRank: { subject: string; chapter: string; score: number }[],
  _recovery: RecoveryItem[],
  _examTomorrow: boolean,
  coachingType: CoachingType,
): PlannedTask[] {
  const tasks: PlannedTask[] = [];
  let used = 0;
  const canFit = (min: number) => used + min <= budget + TOLERANCE_MIN;

  // Sort backlog by nearest deadline first
  const sortByDeadline = (items: BacklogItem[]) =>
    items.sort((a, b) => {
      const da = daysUntil(a.due_date) ?? 999;
      const db = daysUntil(b.due_date) ?? 999;
      return da - db;
    });

  // Backlog lectures (online + self-study only — offline students already
  // attend lectures; recorded students catch up by watching them)
  if (coachingType === "online" || coachingType === "self_study") {
    const lectures = sortByDeadline([...pool.lectures]);
    for (const b of lectures) {
      if (used >= budget - MIN_SLOT_MIN || !canFit(lecMin)) break;
      if ((b.pending_lectures ?? 0) <= 0) continue;
      tasks.push({
        title: `Backlog lecture: ${b.subject ?? ""} ${b.chapter ? `— ${b.chapter}` : ""}`.trim(),
        subject: b.subject ?? null, type: "lecture", estimated_minutes: lecMin,
        priority: "high", chapter: b.chapter ?? null, source: "backlog",
        priority_score: 8.5,
        tracker_ref: { backlog_id: b.id, kind: "lecture", auto_decrement: true, decrement: 1 },
        reason: "Missed lecture from backlog — catching up keeps you in sync with class.",
      });
      used += lecMin;
      b.pending_lectures = Math.max(0, (b.pending_lectures ?? 0) - 1);
    }
  }

  // Backlog DPPs
  const dpps = sortByDeadline([...pool.dpps]);
  for (const b of dpps) {
    if (used >= budget - MIN_SLOT_MIN || !canFit(dppMin)) break;
    if ((b.pending_dpps ?? 0) <= 0) continue;
    tasks.push({
      title: `Backlog DPP: ${b.subject ?? ""} ${b.chapter ? `— ${b.chapter}` : ""}`.trim(),
      subject: b.subject ?? null, type: "dpp", estimated_minutes: dppMin,
      priority: "high", chapter: b.chapter ?? null, source: "backlog",
      priority_score: 8.0,
      tracker_ref: { backlog_id: b.id, kind: "dpp", auto_decrement: true, decrement: 1 },
      reason: "Pending DPP from backlog — one sheet at a time.",
    });
    used += dppMin;
    b.pending_dpps = Math.max(0, (b.pending_dpps ?? 0) - 1);
  }

  // Backlog modules
  const modules = sortByDeadline([...pool.modules]);
  for (const b of modules) {
    if (used >= budget - MIN_SLOT_MIN || !canFit(moduleMin)) break;
    if ((b.module_questions_remaining ?? 0) <= 0) continue;
    const chunk = Math.min(MODULE_CHUNK_QS, b.module_questions_remaining ?? 0);
    tasks.push({
      title: `Backlog Module: ${b.subject ?? ""} ${b.chapter ? `— ${b.chapter}` : ""} (${chunk} Qs)`.trim(),
      subject: b.subject ?? null, type: "module", estimated_minutes: moduleMin,
      priority: "high", chapter: b.chapter ?? null, source: "backlog",
      priority_score: 7.5,
      tracker_ref: { backlog_id: b.id, kind: "module", auto_decrement: true, decrement: chunk },
      reason: `Backlog split into ${MODULE_CHUNK_QS}-question micro-tasks (${b.module_questions_remaining} left) — steady progress without overload.`,
    });
    used += moduleMin;
    b.module_questions_remaining = Math.max(0, (b.module_questions_remaining ?? 0) - chunk);
  }

  // Backlog PYQs
  const pyqItems = sortByDeadline([...pool.lowPriority]);
  for (const b of pyqItems) {
    if (used >= budget - MIN_SLOT_MIN || !canFit(pyqMin)) break;
    if ((b.pending_pyqs ?? 0) <= 0) continue;
    tasks.push({
      title: `Backlog PYQs: ${b.subject ?? ""} ${b.chapter ? `— ${b.chapter}` : ""}`.trim(),
      subject: b.subject ?? null, type: "pyq", estimated_minutes: pyqMin,
      priority: "medium", chapter: b.chapter ?? null, source: "backlog",
      priority_score: 7.0,
      tracker_ref: { backlog_id: b.id, kind: "pyq", auto_decrement: true, decrement: 1 },
      reason: "Pending PYQs from backlog — highest-signal practice.",
    });
    used += pyqMin;
    b.pending_pyqs = Math.max(0, (b.pending_pyqs ?? 0) - 1);
  }

  return tasks;
}

/**
 * Build revision tasks.
 * Never random — prioritizes weak chapters, recently completed chapters,
 * spaced repetition (1, 3, 7, 15, 30 days), and previously incorrect questions.
 */
function buildRevisionTasks(
  userChapters: UserChapter[],
  revisionCandidates: RevisionCandidate[],
  budget: number,
  revMin: number,
  chapterRank: { subject: string; chapter: string; score: number }[],
  recovery: RecoveryItem[],
  examTomorrow: boolean,
): PlannedTask[] {
  const tasks: PlannedTask[] = [];
  let used = 0;
  const canFit = (min: number) => used + min <= budget + TOLERANCE_MIN;

  // 1. Due-now revisions from active chapters (spaced repetition)
  for (const uc of userChapters) {
    if (used >= budget - MIN_SLOT_MIN || !canFit(revMin)) break;
    if (!revisionDue(uc)) continue;
    if ((uc.revision_pending ?? 0) <= 0 && uc.status !== "completed" && uc.status !== "mastered") continue;

    const ps = computeTaskPriority("revision", uc.subject, uc.chapter, chapterRank, recovery, examTomorrow);
    const isWeak = uc.status !== "completed" && uc.status !== "mastered" && (uc.confidence ?? 3) <= WEAK_CONFIDENCE;
    const isRecentlyCompleted = uc.status === "completed" || uc.status === "mastered";
    const reason = isWeak
      ? "Weak chapter — revision closes the gap fastest."
      : isRecentlyCompleted
        ? "Recently completed chapter — spaced revision cements it in memory."
        : "Spaced revision due now — the 1/3/7/15/30 rhythm keeps it in memory.";

    tasks.push({
      title: `Revision: ${uc.subject} — ${uc.chapter}`,
      subject: uc.subject, type: "revision", estimated_minutes: revMin,
      priority: isWeak ? "high" : "medium", chapter: uc.chapter, source: "revision",
      priority_score: ps + (isWeak ? 0.3 : 0),
      tracker_ref: { user_chapter_id: uc.id, field: "revision_pending", decrement: 1, progress_flag: "revision1" },
      reason,
    });
    used += revMin;
    uc.revision_pending = Math.max(0, (uc.revision_pending ?? 0) - 1);
  }

  // 2. Spaced-repetition candidates from the revision engine
  if (used < budget - MIN_SLOT_MIN) {
    for (const cand of revisionCandidates) {
      if (used >= budget - MIN_SLOT_MIN || !canFit(revMin)) break;
      const ps = computeTaskPriority("revision", cand.subject, cand.chapter, chapterRank, recovery, examTomorrow);
      tasks.push({
        title: `Revision: ${cand.subject} — ${cand.chapter}`,
        subject: cand.subject, type: "revision", estimated_minutes: revMin,
        priority: "medium", chapter: cand.chapter, source: "revision_engine",
        priority_score: ps,
        tracker_ref: null,
        reason: cand.reason,
      });
      used += revMin;
    }
  }

  return tasks;
}

export function validateCoachingPlannerInput(input: CoachingPlannerInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input) { errors.push("Planner input is missing."); return { valid: false, errors }; }
  if (!input.profile?.id) errors.push("User profile is missing or has no id.");
  if (!input.studyHours || input.studyHours <= 0) errors.push("Study hours must be greater than 0.");
  if (input.studyHours > 24) errors.push("Study hours cannot exceed 24.");
  if (!input.date) errors.push("Plan date is missing.");
  return { valid: errors.length === 0, errors };
}

export async function generateCoachingPlan(input: CoachingPlannerInput): Promise<CoachingPlannerResult> {
  const warnings: string[] = [];
  const v = validateCoachingPlannerInput(input);
  if (!v.valid) { console.error("[coaching-planner] validation failed:", v.errors); throw new Error(`Cannot generate plan: ${v.errors.join(" ")}`); }

  const { profile, studyHours, energyLevel, wasSchoolDay, examTomorrow, date, unexpectedEvents } = input;
  const requestedMinutes = Math.max(0, Math.round(studyHours * 60));
  const coachingType = getCoachingType(profile);
  console.info("[coaching-planner] start", { userId: profile.id, studyHours, requestedMinutes, date, coachingType });

  // --- Load data ---
  const examKey = aliasExamId(profile.target_exam ?? "");
  let subjects: SyllabusSubject[] = [], chapterRows: SyllabusChapter[] = [], userChapters: UserChapter[] = [];
  let backlog: BacklogItem[] = [];
  let stats: StudyStats | null = null;

  try { subjects = await db.getSubjects(examKey); } catch (e) { console.error("[coaching-planner] getSubjects", e); warnings.push("Failed to load subjects."); }
  if (subjects.length > 0) {
    try { chapterRows = (await Promise.all(subjects.map((s) => db.getChapters(s.id).catch(() => [] as SyllabusChapter[])))).flat(); }
    catch (e) { console.error("[coaching-planner] chapters", e); warnings.push("Failed to load chapters."); }
  }
  try { userChapters = await db.getUserChapters(); } catch (e) { console.error("[coaching-planner] getUserChapters", e); }
  try { backlog = await db.getBacklogItems(profile.target_exam); } catch (e) { console.error("[coaching-planner] backlog", e); }
  try { stats = await db.getStudyStats(); } catch (e) { console.error("[coaching-planner] stats", e); }

  // Habit calibration
  const habitStats: HabitStats | null = await computeHabitStats(profile).catch(() => null);
  const calibration: Calibration | null = habitStats ? calibrateStudyHours(requestedMinutes / 60, habitStats) : null;
  let adjustedMinutes = requestedMinutes;
  if (calibration && calibration.active) {
    adjustedMinutes = calibration.targetMinutes;
    warnings.push(calibration.message);
  }

  const subjectNames = subjects.length > 0 ? subjects.map((s) => s.name) : JEE_SUBJECTS_FALLBACK.slice();
  const recovery = await db.getRecoveryItems("pending").catch(() => [] as RecoveryItem[]);
  const pool = categorizeBacklog(backlog);

  // Burnout / realism adjustments
  const recentCompleted = await db.getRecentCompletedTasks(7).catch(() => [] as PlanTask[]);
  const burnout = detectBurnout(recentCompleted, [energyLevel], [studyHours]);
  if (burnout.detected) warnings.push(`Burnout detected (${burnout.level}): ${burnout.reasons.join("; ")}`);

  let adjusted = applyBurnoutAdjustments(adjustedMinutes, energyLevel, burnout);
  // Explicit school schedule (v3) already accounts for school hours — no extra
  // discount needed. Fall back to the legacy 0.85 estimate otherwise.
  const schoolBlock = buildSchool(profile, date);
  if (wasSchoolDay && profile.attends_school && !schoolBlock) adjusted = Math.round(adjusted * 0.85);
  if (isDayOff(profile, new Date(`${date}T00:00:00`))) { adjusted = Math.round(adjusted * 0.6); warnings.push("Day off — light plan with more revision and review."); }
  adjusted = Math.max(60, adjusted);

  // Utilization: plan ≈ 90% of available time
  const utilTargetMinutes = Math.max(60, adjusted - Math.round(adjusted * (unexpectedEvents?.trim() ? 0.15 : 0.1)));
  const breakMin = profile.break_min ?? BREAK_MIN;
  const breakEveryMin = profile.session_length_min ?? BREAK_EVERY_MIN;
  const breakMinutes = Math.ceil(utilTargetMinutes / (breakEveryMin + breakMin)) * breakMin;
  const schedulableMinutes = Math.max(60, utilTargetMinutes - breakMinutes);

  // Determine if backlog exists
  const hasBacklog = pool.pendingLectures > 0 || pool.pendingDpps > 0 || pool.pendingModuleQs > 0 || pool.lowPriority.length > 0;

  // Durations
  const lecMin = predictedDuration("lecture", stats);
  const pyqMin = predictedDuration("pyq", stats);
  const dppMin = predictedDuration("dpp", stats);
  const moduleMin = predictedDuration("module", stats);
  const revMin = predictedDuration("revision", stats);
  const practiceMin = predictedDuration("practice", stats);

  // Active chapters & ranking
  const activeChapters = getActiveChapters(userChapters, backlog, recovery, profile);
  const chapterRank = rankChapters(userChapters, backlog, recovery, profile);
  const revisionCandidates: RevisionCandidate[] = getRevisionCandidates(userChapters, stats, 8);

  // ===== LECTURE GUARANTEE (min 2/day from the current chapter) =====
  // Lecture slots are reserved BEFORE the category allocation, so practice and
  // backlog budgets can never starve lectures. Target = at least 2 lectures/day
  // from the current chapter + extra lectures scaled to backlog size (1 extra
  // per ~2 pending backlog lectures, capped), so users with more backlog get
  // more lecture time to finish the current chapter and clear the backlog.
  // When the day can't fit two full-length lectures, the lecture duration is
  // shrunk (floor 30 min) so the 2-lecture minimum holds on every day with at
  // least 1 hour of study time.
  const isLectureMode = (coachingType === "online" || coachingType === "hybrid" || coachingType === "self_study") && profile.class_mode !== "recorded";
  const MIN_LECTURE_MIN = 30;
  const weeklyTest = buildWeeklyTest(profile, date);
  const weeklyTestMinutes = weeklyTest?.estimated_minutes ?? 0;
  const lectureBudgetRaw = schedulableMinutes - weeklyTestMinutes;
  const lectureBudget = lectureBudgetRaw >= 2 * MIN_LECTURE_MIN ? lectureBudgetRaw : schedulableMinutes;
  const lectureMin = isLectureMode && lectureBudget >= 2 * MIN_LECTURE_MIN
    ? Math.min(lecMin, Math.max(MIN_LECTURE_MIN, Math.floor(lectureBudget / 2)))
    : lecMin;
  const maxLectureSlots = Math.floor(schedulableMinutes / lectureMin);
  const backlogLectureExtra = Math.min(MAX_CURRENT_LECTURE_EXTRA, Math.ceil((pool.pendingLectures ?? 0) / 2));
  const lectureTarget = isLectureMode && maxLectureSlots > 0
    ? Math.max(2, Math.min(2 + backlogLectureExtra, maxLectureSlots))
    : 0;
  const lectureReserve = lectureTarget * lectureMin;
  if (lectureTarget > 0) {
    const shortened = lectureMin < lecMin ? ` (shortened to ${lectureMin} min to fit the day)` : "";
    warnings.push(`Lecture guarantee active — ${lectureTarget} lecture${lectureTarget > 1 ? "s" : ""} scheduled today${shortened}.`);
  } else if (isLectureMode) {
    warnings.push(`Only ${schedulableMinutes} min of study time today — too little to fit the 2-lecture minimum.`);
  }

  // Compute time allocation per category (on the time left after lectures)
  const allocation = computeTimeAllocation(coachingType, Math.max(60, schedulableMinutes - lectureReserve), hasBacklog, {
    practiceRatio: profile.practice_revision_ratio,
    weights: (profile.priority_weights ?? null) as PriorityWeights | null,
  });
  console.info("[coaching-planner] allocation", { coachingType, hasBacklog, lectureTarget, lectureReserve, allocation });

  const tasks: PlannedTask[] = [];
  let scheduled = 0;
  const place = (t: PlannedTask) => { tasks.push(t); scheduled += t.estimated_minutes; };

  // ===== Coaching block (if applicable) =====
  for (const t of buildCoaching(profile, date)) {
    if (scheduled + t.estimated_minutes > schedulableMinutes + TOLERANCE_MIN) continue;
    place(t);
  }

  // ===== Recorded lectures (recorded-class students) =====
  for (const t of buildRecordedLectures(profile, activeChapters, schedulableMinutes)) {
    if (scheduled + t.estimated_minutes > schedulableMinutes + TOLERANCE_MIN) break;
    place(t);
  }

  // ===== GUARANTEED LECTURES (min 2/day + backlog catch-up) =====
  // Placed before the weekly mock so the mock can never push out lecture #2.
  if (lectureReserve > 0) {
    const lectureTasks = buildGuaranteedLectures(
      activeChapters, pool, lectureReserve, lectureMin,
      chapterRank, recovery, examTomorrow,
      subjectNames[0] ?? "General Studies",
    );
    for (const t of lectureTasks) {
      if (scheduled + t.estimated_minutes > schedulableMinutes + TOLERANCE_MIN) break;
      place(t);
    }
  }

  // ===== Weekly mock test (v3: tests_per_week cadence) =====
  if (weeklyTest && scheduled + weeklyTest.estimated_minutes <= schedulableMinutes + TOLERANCE_MIN) {
    place(weeklyTest);
    warnings.push("Weekly test scheduled — treat it like the real exam.");
  }

  // ===== NEW WORK (online only) =====
  if (coachingType === "online" && allocation.newWork > 0) {
    const newWorkTasks = buildNewWorkTasks(
      activeChapters, allocation.newWork, dppMin, moduleMin, pyqMin,
      chapterRank, recovery, examTomorrow,
    );
    for (const t of newWorkTasks) {
      if (scheduled + t.estimated_minutes > schedulableMinutes + TOLERANCE_MIN) break;
      place(t);
    }
  }

  // ===== PRACTICE =====
  if (allocation.practice > 0) {
    const practiceTasks = buildPracticeTasks(
      activeChapters, allocation.practice, moduleMin, pyqMin, dppMin, practiceMin,
      chapterRank, recovery, examTomorrow,
    );
    for (const t of practiceTasks) {
      if (scheduled + t.estimated_minutes > schedulableMinutes + TOLERANCE_MIN) break;
      place(t);
    }
  }

  // ===== BACKLOG =====
  if (allocation.backlog > 0) {
    const backlogTasks = buildBacklogTasks(
      pool, allocation.backlog, lecMin, dppMin, moduleMin, pyqMin,
      chapterRank, recovery, examTomorrow, coachingType,
    );
    for (const t of backlogTasks) {
      if (scheduled + t.estimated_minutes > schedulableMinutes + TOLERANCE_MIN) break;
      place(t);
    }
  }

  // ===== REVISION =====
  if (allocation.revision > 0) {
    const revisionTasks = buildRevisionTasks(
      userChapters, revisionCandidates, allocation.revision, revMin,
      chapterRank, recovery, examTomorrow,
    );
    for (const t of revisionTasks) {
      if (scheduled + t.estimated_minutes > schedulableMinutes + TOLERANCE_MIN) break;
      place(t);
    }
  }

  // ===== FILL TO TARGET (redistribute unused time) =====
  if (scheduled < schedulableMinutes - MIN_SLOT_MIN) {
    const remaining = schedulableMinutes - scheduled;
    const fillSources: { type: string; dur: number; build: () => PlannedTask | null }[] = [
      { type: "practice", dur: practiceMin, build: () => {
        const ac = pick(activeChapters, 0);
        if (!ac) return null;
        const ps = computeTaskPriority("practice", ac.subject, ac.chapter, chapterRank, recovery, examTomorrow);
        return { title: `Practice: ${ac.subject} — ${ac.chapter}`, subject: ac.subject, type: "practice", estimated_minutes: practiceMin, priority: "medium", chapter: ac.chapter, source: "fill", priority_score: ps, tracker_ref: null, reason: "Extra practice — volume builds speed." };
      }},
      { type: "revision", dur: revMin, build: () => {
        const cand = revisionCandidates[0];
        if (!cand) return null;
        const ps = computeTaskPriority("revision", cand.subject, cand.chapter, chapterRank, recovery, examTomorrow);
        return { title: `Revision: ${cand.subject} — ${cand.chapter}`, subject: cand.subject, type: "revision", estimated_minutes: revMin, priority: "medium", chapter: cand.chapter, source: "revision_engine", priority_score: ps, tracker_ref: null, reason: cand.reason };
      }},
      { type: "pyq", dur: pyqMin, build: () => {
        const ac = pick(activeChapters, 0);
        if (!ac) return null;
        const ps = computeTaskPriority("pyq", ac.subject, ac.chapter, chapterRank, recovery, examTomorrow);
        return { title: `PYQs: ${ac.subject} — ${ac.chapter}`, subject: ac.subject, type: "pyq", estimated_minutes: pyqMin, priority: "medium", chapter: ac.chapter, source: "fill", priority_score: ps, tracker_ref: null, reason: "More PYQs — the fastest way to internalize the exam pattern." };
      }},
    ];

    let progress = true;
    while (scheduled < schedulableMinutes - MIN_SLOT_MIN && progress) {
      progress = false;
      for (const src of fillSources) {
        if (scheduled >= schedulableMinutes - MIN_SLOT_MIN) break;
        const min = Math.min(src.dur, Math.max(MIN_SLOT_MIN, remaining));
        if (min < MIN_SLOT_MIN) continue;
        const t = src.build();
        if (!t) continue;
        t.estimated_minutes = min;
        place(t);
        progress = true;
      }
    }
  }

  // ===== Fallback =====
  if (tasks.length === 0) {
    const s = subjectNames[0] ?? "General Studies";
    const min = Math.max(25, Math.min(120, schedulableMinutes));
    place({ title: `Study session: ${s}`, subject: s, type: "study", estimated_minutes: min, priority: "medium", chapter: null, source: "fallback", priority_score: 3, tracker_ref: null, reason: "No active chapters with remaining work found — keeping a light, consistent session." });
    warnings.push("No active chapters with remaining work found. Generated a generic study session.");
  }

  // ===== Interleave breaks =====
  tasks.sort((a, b) => b.priority_score - a.priority_score);
  const interleaved: PlannedTask[] = [];
  let sinceBreak = 0;
  for (const t of tasks) {
    if (t.type === "break") { interleaved.push(t); sinceBreak = 0; continue; }
    if (sinceBreak >= breakEveryMin) {
      interleaved.push({ title: "Rest Break", subject: null, type: "break", estimated_minutes: breakMin, priority: "low", chapter: null, source: "system", priority_score: 0, tracker_ref: null, reason: "Short break — protects focus for the next block." });
      sinceBreak = 0;
    }
    interleaved.push(t);
    sinceBreak += t.estimated_minutes;
  }

  // ===== Slot-aware scheduling =====
  const slotDefs: Record<string, { from: number; to: number }> = {
    early_morning: { from: 4, to: 8 },
    morning: { from: 8, to: 12 },
    afternoon: { from: 12, to: 16 },
    evening: { from: 16, to: 20 },
    night: { from: 20, to: 22 },
    night_owl: { from: 22, to: 24 },
  };
  let wakeHour = profile.wake_up_time ? Number(profile.wake_up_time.slice(0, 2)) : 7;
  let sleepHour = profile.sleep_time ? Number(profile.sleep_time.slice(0, 2)) : 23;
  if (!Number.isFinite(wakeHour)) wakeHour = 7;
  if (!Number.isFinite(sleepHour)) sleepHour = 23;
  if (sleepHour < wakeHour) sleepHour = 24;
  const availableSlotOrder = slotOrderFor(profile, habitStats).filter(
    (id) => Math.max(wakeHour, slotDefs[id].from) < Math.min(sleepHour, slotDefs[id].to),
  );
  const slotOrder = availableSlotOrder.length > 0 ? availableSlotOrder : ["morning", "afternoon", "evening", "night"];
  const slotStartMin = (id: string) => Math.max(wakeHour * 60, slotDefs[id].from * 60);
  const slotEndMin = (id: string) => Math.min(sleepHour * 60, slotDefs[id].to * 60);

  const groups: PlannedTask[][] = [];
  for (const t of interleaved) {
    if (t.type === "break") {
      if (groups.length > 0) groups[groups.length - 1].push(t); else groups.push([t]);
    } else {
      groups.push([t]);
    }
  }
  const hardGroups = groups.filter((g) => HEAVY_TASK_TYPES.includes(g[0].type)).flat();
  const softTasks = groups.filter((g) => !HEAVY_TASK_TYPES.includes(g[0].type)).flat();
  const scheduledTasks = [...hardGroups, ...softTasks];

  const base = new Date(`${date}T00:00:00`);

  // Live-class tasks carry their real start/end via tracker_ref.class_start /
  // class_end. They are pinned to those exact hours, and their ranges are
  // reserved (blocked) so no study task ever overlaps a live class.
  const hasPinnedTime = (t: PlannedTask) =>
    typeof t.tracker_ref?.class_start === "string" && typeof t.tracker_ref?.class_end === "string";
  const pinnedTasks = scheduledTasks.filter(hasPinnedTime);
  if (schoolBlock && schoolBlock.tracker_ref?.class_start && schoolBlock.tracker_ref?.class_end) pinnedTasks.push(schoolBlock);
  const movableTasks = scheduledTasks.filter((t) => !hasPinnedTime(t));
  const blocked = pinnedTasks
    .map((t) => ({ start: toMin(t.tracker_ref!.class_start as string)!, end: toMin(t.tracker_ref!.class_end as string)! }))
    .filter((b) => b.start !== null && b.end !== null && b.start < b.end);

  let cursor = 0;
  let slotIdx = 0;
  const tasksOut: PlanTask[] = [];
  for (const t of movableTasks) {
    while (slotIdx < slotOrder.length - 1) {
      const sMin = slotStartMin(slotOrder[slotIdx]);
      const eMin = slotEndMin(slotOrder[slotIdx]);
      if (cursor < sMin) cursor = sMin;
      const blk = blocked.find((b) => cursor + t.estimated_minutes > b.start && cursor < b.end);
      if (blk) { cursor = blk.end; continue; } // skip past the live class
      if (cursor + t.estimated_minutes <= eMin) break;
      slotIdx++;
      cursor = slotStartMin(slotOrder[slotIdx]);
    }
    const start = fmtTime(base, cursor); cursor += t.estimated_minutes; const end = fmtTime(base, cursor);
    tasksOut.push({
      id: "", user_id: "", plan_id: null, title: t.title, subject: t.subject, type: t.type,
      estimated_minutes: t.estimated_minutes, priority: t.priority, completed: false,
      scheduled_date: date, created_at: "", start_time: start, end_time: end,
      chapter: t.chapter, source: t.source, tracker_ref: { ...(t.tracker_ref ?? {}), reason: t.reason }, completion_pct: 0,
      task_status: "pending" as TaskStatus, missed_count: 0, reschedule_reason: null,
      actual_minutes: null, priority_score: t.priority_score,
    });
  }
  for (const t of pinnedTasks) {
    const start = t.tracker_ref!.class_start as string;
    const end = t.tracker_ref!.class_end as string;
    const mins = (toMin(end)! - toMin(start)!);
    tasksOut.push({
      id: "", user_id: "", plan_id: null, title: t.title, subject: t.subject, type: t.type,
      estimated_minutes: mins > 0 ? mins : t.estimated_minutes, priority: t.priority, completed: false,
      scheduled_date: date, created_at: "", start_time: start, end_time: end,
      chapter: t.chapter, source: t.source, tracker_ref: { ...(t.tracker_ref ?? {}), reason: t.reason }, completion_pct: 0,
      task_status: "pending" as TaskStatus, missed_count: 0, reschedule_reason: null,
      actual_minutes: null, priority_score: t.priority_score,
    });
  }
  tasksOut.sort((a, b) => (toMin(a.start_time) ?? 0) - (toMin(b.start_time) ?? 0));

  const byType: Record<string, number> = {}, bySubject: Record<string, number> = {};
  for (const t of tasksOut) {
    byType[t.type] = (byType[t.type] ?? 0) + 1;
    if (t.subject) bySubject[t.subject] = (bySubject[t.subject] ?? 0) + 1;
  }

  const gap = schedulableMinutes - scheduled;
  const bufferMinutes = Math.max(0, adjusted - utilTargetMinutes);
  const utilizationPct = requestedMinutes > 0 ? Math.min(100, Math.round(((scheduled + breakMinutes) / requestedMinutes) * 100)) : 0;
  let finishCursor = cursor;
  for (const b of blocked) finishCursor = Math.max(finishCursor, b.end);
  const estimatedFinishTime = fmtTime(base, finishCursor);
  const motivationalInsight = burnout.level === "severe"
    ? "You've been pushing hard. Today is a recovery day — lighter tasks, more breaks. Consistency beats intensity."
    : burnout.level === "moderate"
      ? "Signs of fatigue detected. We've reduced your load and added more revision. Pace yourself today."
      : coachingType === "offline"
        ? "Offline coaching — you already attend lectures daily. Today focuses on practice, backlog, and revision."
        : coachingType === "hybrid"
          ? "Hybrid coaching — live classes are blocked, and recorded lectures are auto-scheduled around your practice and revision."
          : coachingType === "self_study"
          ? "Self-study mode — your plan covers lectures, practice, backlog, and revision on your own schedule."
          : coachingType === "online" && profile.class_mode === "recorded"
            ? "Recorded classes — your lectures are auto-scheduled at your preferred study time."
            : "Online coaching — balancing lectures, practice, backlog, and revision for steady progress.";

  const diagnostics = {
    requestedMinutes,
    adjustedMinutes: adjusted,
    scheduledMinutes: scheduled,
    gapMinutes: gap,
    taskCount: tasksOut.length,
    byType,
    bySubject,
    coachingType,
    timeAllocation: allocation,
    bufferMinutes,
    breakMinutes,
    utilizationPct,
    burnout: { level: burnout.level, detected: burnout.detected, reasons: burnout.reasons, recommendations: burnout.recommendations },
    motivationalInsight,
    estimatedFinishTime,
    warnings,
    dataChecks: { profile: !!profile.id, subjects: subjectNames.length > 0, chapters: chapterRows.length > 0, studyHours: requestedMinutes > 0, inputValid: v.valid },
  };

  console.info("[coaching-planner] done", { coachingType, scheduled, tasks: tasksOut.length, allocation });
  return { tasks: tasksOut, diagnostics };
}
