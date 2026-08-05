import { db, aliasExamId } from "../db";
import { TASK_TYPE_LABELS } from "../../lib/constants";
import type {
  BacklogItem, EnergyLevel, PlanTask, Priority, Profile, BacklogKind,
  SyllabusSubject, SyllabusChapter, UserChapter,
  TaskStatus, RecoveryItem, StudyStats,
} from "../../lib/types";
import { computeTaskPriority, rankChapters } from "./priorityEngine";
import { predictedDuration, updateStudyStats } from "./learningModel";
import { moveMissedTasksToRecovery, getRecoveryTasksForDay } from "./recoveryEngine";
import { getRevisionCandidates, getUpcomingRevisionSchedule, type RevisionCandidate, type RevisionEvent } from "./revisionEngine";
import { detectBurnout, applyBurnoutAdjustments, type BurnoutSignal } from "./burnoutDetector";
import {
  computeHabitStats, calibrateStudyHours, slotOrderFor, isDayOff,
  HEAVY_TASK_TYPES, type HabitStats, type Calibration,
} from "../habitStats";

export interface PlannerInput {
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

export interface TaskReason {
  title: string;
  reason: string;
}

export interface CarryForwardItem {
  title: string;
  reason: string;
}

export interface SelfCheckItem {
  label: string;
  passed: boolean;
}

export interface CoachingSummary {
  dailyGoal: string;
  plannedMinutes: number;
  estimatedFinishTime: string;
  bufferMinutes: number;
  energyRead: string;
  completionTarget: string;
  taskReasons: TaskReason[];
  carryForward: CarryForwardItem[];
  revisionSchedule: RevisionEvent[];
  confidenceScore: number;
  confidenceLabel: string;
  motivation: string;
  selfCheck: SelfCheckItem[];
  prevDay: {
    completionRate: number | null;
    skippedCount: number;
    studiedMinutes: number;
    plannedCount: number;
  } | null;
}

export interface PlannerDiagnostics {
  requestedMinutes: number;
  adjustedMinutes: number;
  scheduledMinutes: number;
  gapMinutes: number;
  taskCount: number;
  byType: Record<string, number>;
  bySubject: Record<string, number>;
  bufferMinutes: number;
  breakMinutes: number;
  recoveryTasksIncluded: number;
  revisionTasksIncluded: number;
  burnout: BurnoutSignal;
  motivationalInsight: string;
  estimatedFinishTime: string;
  warnings: string[];
  adaptiveLoadFactor: number;
  completionRatePrev: number | null;
  skippedCountPrev: number;
  testWeek: boolean;
  daysToTest: number | null;
  confidenceScore: number;
  energyRead: string;
  availableMinutes: number;
  targetMinutes: number;
  utilizationPct: number;
  dataChecks: { profile: boolean; subjects: boolean; chapters: boolean; studyHours: boolean; inputValid: boolean };
  habitCalibration: {
    active: boolean;
    selectedMinutes: number;
    targetMinutes: number;
    blend: number;
    daysObserved: number;
    avgCompletedMinutes: number;
    completionRate: number | null;
    consistency: number;
    startDelayAvg: number | null;
    bestSlot: string | null;
    message: string;
  } | null;
}

export interface PlannerResult {
  tasks: PlanTask[];
  diagnostics: PlannerDiagnostics;
  coaching: CoachingSummary;
}

export interface WeeklyGoal {
  targetChapters: { subject: string; chapter: string }[];
  revisionGoals: number;
  questionTargets: number;
  backlogReduction: number;
  studyHoursTarget: number;
}

export interface MonthlyGoal {
  majorChapters: { subject: string; chapter: string }[];
  revisionTargets: number;
  pyqTargets: number;
  recoveryTargets: number;
  studyHoursTarget: number;
}

class PlannerErrorClass extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.code = code; this.name = "PlannerError"; }
}
export { PlannerErrorClass as PlannerError };

const TOLERANCE_MIN = 10;
const JEE_SUBJECTS_FALLBACK = ["Physics", "Chemistry", "Mathematics"];
const BREAK_MIN = 10;
const BREAK_EVERY_MIN = 80;
const BUFFER_PCT = 0.1;
const REVISION_BLOCK_PCT = 0.15;
const REVISION_BLOCK_PCT_TEST_WEEK = 0.25;
const ACTIVE_CHAPTER_PROGRESS_THRESHOLD = 0.6;
const WEAK_CONFIDENCE = 2;
const MODULE_CHUNK_QS = 20;
const MIN_SLOT_MIN = 15;
const WEAK_TOPIC_CAP = 2;
const TODAY_LECTURES_CAP = 2;

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
      inClassNow: uc.status === "in_progress" || uc.status === "started",
    };
  }).sort((a, b) => {
    if (a.progressPct >= ACTIVE_CHAPTER_PROGRESS_THRESHOLD && b.progressPct < ACTIVE_CHAPTER_PROGRESS_THRESHOLD) return -1;
    if (b.progressPct >= ACTIVE_CHAPTER_PROGRESS_THRESHOLD && a.progressPct < ACTIVE_CHAPTER_PROGRESS_THRESHOLD) return 1;
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

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  const diff = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  return diff;
}

function weakChapters(ucs: UserChapter[]) {
  return ucs.filter((u) => u.status !== "completed" && u.status !== "mastered" && (u.confidence ?? 3) <= WEAK_CONFIDENCE)
    .map((u) => ({ subject: u.subject, chapter: u.chapter })).sort((a, b) => a.subject.localeCompare(b.subject));
}

function buildCoaching(profile: Profile, date: string): PlannedTask[] {
  if (!profile.coaching_enabled) return [];
  const dateObj = new Date(date + "T00:00:00");
  const wdShort = dateObj.toLocaleDateString("en-US", { weekday: "short" });
  const wdLong = dateObj.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const name = profile.coaching_name || "Online class";
  const schedule = Array.isArray(profile.class_schedule) ? profile.class_schedule : [];
  if (profile.class_mode === "live" && schedule.length > 0) {
    const tasks: PlannedTask[] = [];
    for (const b of schedule) {
      if (!b || b.day !== wdLong || !b.start || !b.end || b.start >= b.end) continue;
      const [sh, sm] = b.start.split(":").map(Number);
      const [eh, em] = b.end.split(":").map(Number);
      if (!Number.isFinite(sh) || !Number.isFinite(eh)) continue;
      tasks.push({ title: `Coaching: ${name}`, subject: null, type: "coaching", estimated_minutes: Math.max(30, (eh * 60 + em) - (sh * 60 + sm)), priority: "high", chapter: null, source: "coaching", priority_score: 10, tracker_ref: { class_start: b.start, class_end: b.end }, reason: "Today's live class — the plan is built around what is being taught right now." });
    }
    return tasks;
  }
  if (!profile.coaching_days?.length) return [];
  if (!profile.coaching_days.includes(wdShort)) return [];
  const [sh, sm] = (profile.coaching_start ?? "16:00").split(":").map(Number);
  const [eh, em] = (profile.coaching_end ?? "19:00").split(":").map(Number);
  return [{ title: `Coaching: ${name}`, subject: null, type: "coaching", estimated_minutes: Math.max(30, (eh * 60 + em) - (sh * 60 + sm)), priority: "high", chapter: null, source: "coaching", priority_score: 10, tracker_ref: { class_start: profile.coaching_start ?? "16:00", class_end: profile.coaching_end ?? "19:00" }, reason: "Today's coaching — the plan is built around what is being taught right now." }];
}

// School hours for the given date (onboarding v3: school_days + timings).
// Pinned like live classes — study tasks are never placed inside these hours.
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
  return {
    title: profile.school_name || "School",
    subject: null, type: "school", estimated_minutes: mins,
    priority: "high", chapter: null, source: "school", priority_score: 10,
    tracker_ref: { class_start: start, class_end: end },
    reason: `School hours (${wdLong}) — the plan is built around your free time.`,
  };
}

interface PlannedTask {
  title: string; subject: string | null; type: string; estimated_minutes: number;
  priority: Priority; chapter: string | null; source: string; priority_score: number;
  tracker_ref: Record<string, unknown> | null; reason: string;
}

function buildMotivation(
  burnout: BurnoutSignal,
  completionRatePrev: number | null,
  streakDays: number,
  examTomorrow: boolean,
  testWeek: boolean,
  energy: EnergyLevel,
): string {
  if (burnout.level === "severe") return "You've been pushing hard. Today we protect you: lighter load, real breaks. Consistency beats intensity — one steady day builds the streak back.";
  if (examTomorrow) return "Test tomorrow. Today is about recall, not new ground — revise, solve PYQs, review mistakes. Walk in calm.";
  if (burnout.level === "moderate") return "Signs of fatigue — today's plan is trimmed. Quality over quantity; the goal is to stay in the game.";
  if (completionRatePrev !== null && completionRatePrev < 0.5) return "Last day was rough. That's data, not failure — we've rebalanced today so you actually finish. Small wins rebuild momentum.";
  if (streakDays >= 5) return `${streakDays}-day streak alive. Momentum is your biggest asset — keep it moving with a plan that fits.`;
  if (testWeek) return "Test week. Backlog pauses, revision and PYQs lead. Consistency now = confidence on exam day.";
  if (energy === "low") return "Low-energy day — we cut the quantity, not the habit. Even a light day keeps the streak.";
  if (energy === "high") return "High energy — we invested it in practice, not more lectures. Practice is where rank is built.";
  return "A balanced day: pace with class, chip the backlog, revise what's due. The best plan is the one you finish.";
}

function buildDailyGoal(
  lecturesPlanned: number,
  moduleQsPlanned: number,
  dppsPlanned: number,
  pyqPlanned: boolean,
  revisionPlanned: number,
  plannedMinutes: number,
  finishTime: string,
): string {
  const parts: string[] = [];
  if (lecturesPlanned > 0) parts.push(`${lecturesPlanned} lecture${lecturesPlanned > 1 ? "s" : ""}`);
  if (moduleQsPlanned > 0) parts.push(`${moduleQsPlanned} backlog Qs`);
  if (dppsPlanned > 0) parts.push(`${dppsPlanned} DPP${dppsPlanned > 1 ? "s" : ""}`);
  if (pyqPlanned) parts.push("PYQs");
  if (revisionPlanned > 0) parts.push(`${revisionPlanned} revision${revisionPlanned > 1 ? "s" : ""}`);
  if (parts.length === 0) parts.push("a focused study block");
  return `${parts.join(" · ")} — ${Math.round(plannedMinutes / 60 * 10) / 10}h planned, done by ${finishTime}.`;
}

function computeConfidence(
  completionRatePrev: number | null,
  stats: StudyStats | null,
  burnout: BurnoutSignal,
  backlogUnderControl: boolean,
  energy: EnergyLevel,
  testWeek: boolean,
): { score: number; label: string } {
  let score = 70;
  if (completionRatePrev !== null) score += Math.round((completionRatePrev - 0.6) * 30);
  score += Math.min(6, (stats?.streak_days ?? 0) * 0.5);
  if (backlogUnderControl) score += 5; else score -= 4;
  if (burnout.level === "severe") score -= 15;
  else if (burnout.level === "moderate") score -= 8;
  else if (burnout.level === "mild") score -= 3;
  if (energy === "high") score += 4;
  if (energy === "low") score -= 4;
  if (testWeek) score += 3;
  score = Math.max(10, Math.min(98, score));
  const label = score >= 85 ? "Confident" : score >= 70 ? "Steady" : score >= 50 ? "Stretched" : "Fragile";
  return { score, label };
}

function energyRead(energy: EnergyLevel, burnout: BurnoutSignal): string {
  if (burnout.level === "severe") return "Recovery day — quantity cut to protect you. Consistency, not intensity.";
  if (energy === "low") return "Low-energy day — quantity reduced, core kept. We never break the habit.";
  if (energy === "high") return "High-energy day — extra practice added, no extra lectures.";
  return "Balanced day — steady load with buffer protected.";
}

export function validatePlannerInput(input: PlannerInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input) { errors.push("Planner input is missing."); return { valid: false, errors }; }
  if (!input.profile?.id) errors.push("User profile is missing or has no id.");
  if (!input.studyHours || input.studyHours <= 0) errors.push("Study hours must be greater than 0.");
  if (input.studyHours > 24) errors.push("Study hours cannot exceed 24.");
  if (!input.date) errors.push("Plan date is missing.");
  return { valid: errors.length === 0, errors };
}

export async function generatePlan(input: PlannerInput): Promise<PlannerResult> {
  const warnings: string[] = [];
  const v = validatePlannerInput(input);
  if (!v.valid) { console.error("[mentor-planner] validation failed:", v.errors); throw new PlannerErrorClass("INVALID_INPUT", `Cannot generate plan: ${v.errors.join(" ")}`); }

  const { profile, studyHours, energyLevel, wasSchoolDay, examTomorrow, date, unexpectedEvents } = input;
  const requestedMinutesBase = Math.max(0, Math.round(studyHours * 60));
  let requestedMinutes = requestedMinutesBase;
  console.info("[mentor-planner] start", { userId: profile.id, studyHours, requestedMinutesBase, date, energy: energyLevel, examTomorrow });

  // --- Load data ---
  const examKey = aliasExamId(profile.target_exam ?? "");
  let subjects: SyllabusSubject[] = [], chapterRows: SyllabusChapter[] = [], userChapters: UserChapter[] = [];
  let backlog: BacklogItem[] = [];
  let stats: StudyStats | null = null;

  try { subjects = await db.getSubjects(examKey); } catch (e) { console.error("[mentor-planner] getSubjects", e); warnings.push("Failed to load subjects."); }
  if (subjects.length > 0) {
    try { chapterRows = (await Promise.all(subjects.map((s) => db.getChapters(s.id).catch(() => [] as SyllabusChapter[])))).flat(); }
    catch (e) { console.error("[mentor-planner] chapters", e); warnings.push("Failed to load chapters."); }
  }
  try { userChapters = await db.getUserChapters(); } catch (e) { console.error("[mentor-planner] getUserChapters", e); }
  try { backlog = await db.getBacklogItems(profile.target_exam); } catch (e) { console.error("[mentor-planner] backlog", e); }
  try { stats = await db.getStudyStats(); } catch (e) { console.error("[mentor-planner] stats", e); }

  // Habit calibration: size the plan against the user's actual study behavior
  // (last 7 days) once enough data exists, instead of the raw selected hours.
  const habitStats: HabitStats | null = await computeHabitStats(profile).catch(() => null);
  const calibration: Calibration | null = habitStats ? calibrateStudyHours(requestedMinutesBase / 60, habitStats) : null;
  if (calibration && calibration.active) {
    requestedMinutes = calibration.targetMinutes;
    warnings.push(calibration.message);
  }

  const subjectNames = subjects.length > 0 ? subjects.map((s) => s.name) : JEE_SUBJECTS_FALLBACK.slice();
  const recovery = await db.getRecoveryItems("pending").catch(() => [] as RecoveryItem[]);
  const pool = categorizeBacklog(backlog);
  const weak = weakChapters(userChapters);

  // ================= REASONING =================
  // 1. Goal: exam + target. 2. Time: requested vs realistic.
  // 3. Weak chapters. 4. Dangerous backlog (overdue / high priority).
  // 5. What's being taught now (in-progress chapters). 6-8. Urgency.
  // 9. Realism (yesterday's completion). 10. Highest long-term ROI.

  const prevDate = new Date(date + "T00:00:00");
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDateStr = prevDate.toISOString().slice(0, 10);
  const prevTasks = await db.getTasksForDate(prevDateStr).catch(() => [] as PlanTask[]);

  const completedPrev = prevTasks.filter((t) => (t.task_status ?? (t.completed ? "completed" : "pending")) === "completed").length;
  const plannedPrevCount = prevTasks.length;
  const completionRatePrev = plannedPrevCount > 0 ? Math.round((completedPrev / plannedPrevCount) * 100) / 100 : null;
  const skippedCountPrev = prevTasks.filter((t) => t.task_status === "skipped" || t.task_status === "postponed").length;
  const studiedPrev = prevTasks.filter((t) => t.completed).reduce((a, t) => a + (t.actual_minutes ?? t.estimated_minutes), 0);

  const recentCompleted = await db.getRecentCompletedTasks(7).catch(() => [] as PlanTask[]);
  const burnout = detectBurnout(recentCompleted, [energyLevel], [studyHours]);
  if (burnout.detected) warnings.push(`Burnout detected (${burnout.level}): ${burnout.reasons.join("; ")}`);

  // Test week: exam tomorrow or nearest due date within 7 days.
  let daysToTest: number | null = examTomorrow ? 1 : null;
  if (daysToTest === null) {
    const due = backlog.map((b) => daysUntil(b.due_date)).filter((d): d is number => d !== null && d >= 0).sort((a, b) => a - b)[0] ?? null;
    if (due !== null) daysToTest = due;
  }
  const testWeek = daysToTest !== null && daysToTest <= 7;
  if (testWeek) warnings.push(`Upcoming test in ${daysToTest} day${daysToTest === 1 ? "" : "s"} — backlog reduced, revision & PYQs boosted.`);

  // Realism: never overplan. Yesterday <50% completion → cut 15%.
  // Explicit school schedule (v3) already accounts for school hours — no extra
  // discount needed. Fall back to the legacy 0.85 estimate otherwise.
  const schoolBlock = buildSchool(profile, date);
  let adjusted = applyBurnoutAdjustments(requestedMinutes, energyLevel, burnout);
  if (wasSchoolDay && profile.attends_school && !schoolBlock) adjusted = Math.round(adjusted * 0.85);
  if (wasSchoolDay && profile.attends_school && !schoolBlock) warnings.push("School day — plan sized to realistic free hours.");
  if (completionRatePrev !== null && completionRatePrev < 0.5) adjusted = Math.round(adjusted * 0.85);
  if (isDayOff(profile, new Date(`${date}T00:00:00`))) { adjusted = Math.round(adjusted * 0.6); warnings.push("Day off — light plan with more revision and review."); }
  adjusted = Math.max(60, adjusted);
  const adaptiveLoadFactor = requestedMinutes > 0 ? Math.round((adjusted / requestedMinutes) * 100) / 100 : 1;
  if (wasSchoolDay && profile.attends_school) warnings.push("School day — plan sized to realistic free hours.");

  // Utilization rule: plan ≈ 90% of available time (85% when unexpected events
  // happened), reserve the rest as buffer. Rest breaks are part of planned time.
  const breakMin = profile.break_min ?? BREAK_MIN;
  const breakEveryMin = profile.session_length_min ?? BREAK_EVERY_MIN;
  const utilTargetMinutes = Math.max(60, adjusted - Math.round(adjusted * (unexpectedEvents?.trim() ? 0.15 : BUFFER_PCT)));
  const bufferMinutes = Math.max(0, adjusted - utilTargetMinutes);
  const revisionBlockMinutes = Math.round(adjusted * (testWeek ? REVISION_BLOCK_PCT_TEST_WEEK : REVISION_BLOCK_PCT));
  const breakMinutes = Math.ceil(utilTargetMinutes / (breakEveryMin + breakMin)) * breakMin;
  const schedulableMinutes = Math.max(60, utilTargetMinutes - breakMinutes);

  const practiceBoost = energyLevel === "high" ? 1.3 : 1;

  // ================= PRIORITY LADDER =================
  const activeChapters = getActiveChapters(userChapters, backlog, recovery, profile);
  const chapterRank = rankChapters(userChapters, backlog, recovery, profile);
  const revisionCandidates: RevisionCandidate[] = getRevisionCandidates(userChapters, stats, 8);
  const backlogUnderControl = pool.pendingLectures <= 0 && pool.pendingDpps <= 0 && pool.pendingModuleQs <= 0;

  const lecMin = predictedDuration("lecture", stats);
  const pyqMin = predictedDuration("pyq", stats);
  const dppMin = predictedDuration("dpp", stats);
  const moduleMin = predictedDuration("module", stats);
  const revMin = predictedDuration("revision", stats);

  const tasks: PlannedTask[] = [];
  let scheduled = 0;
  let recoveryCount = 0, revisionCount = 0, lecturesPlanned = 0, moduleQsPlanned = 0, dppsPlanned = 0;
  let pyqPlanned = false;
  const touchedBacklog = new Set<string>();
  const backlogPerChapter = new Map<string, Record<BacklogKind, number>>();

  const canFit = (min: number) => scheduled + min <= schedulableMinutes + TOLERANCE_MIN;
  const touchBacklog = (b: BacklogItem, kind: BacklogKind) => {
    touchedBacklog.add(b.id);
    const key = `${b.subject}|${b.chapter}`;
    const cur = backlogPerChapter.get(key) ?? { lecture: 0, module: 0, dpp: 0, pyq: 0, notes: 0, revision: 0, assignment: 0, mock_test: 0, custom: 0 };
    cur[kind]++;
    backlogPerChapter.set(key, cur);
  };
  const perChapterUsed = (b: BacklogItem, kind: BacklogKind) => {
    const cur = backlogPerChapter.get(`${b.subject}|${b.chapter}`);
    return cur ? cur[kind] ?? 0 : 0;
  };

  const place = (t: PlannedTask) => {
    tasks.push(t);
    scheduled += t.estimated_minutes;
  };

  // ===== P1 — Today's coaching, today's lecture, upcoming test =====
  for (const t of buildCoaching(profile, date)) {
    if (!canFit(t.estimated_minutes)) continue;
    place(t);
  }

  for (const ac of activeChapters) {
    if (lecturesPlanned >= TODAY_LECTURES_CAP || !canFit(lecMin)) break;
    if (!ac.inClassNow || (ac.uc.lectures_remaining ?? 0) <= 0) continue;
    const ps = computeTaskPriority("lecture", ac.subject, ac.chapter, chapterRank, recovery, input.examTomorrow);
    place({ title: `Lecture: ${ac.subject} — ${ac.chapter}`, subject: ac.subject, type: "lecture", estimated_minutes: lecMin, priority: "high", chapter: ac.chapter, source: "active_chapter", priority_score: ps + 0.5, tracker_ref: { user_chapter_id: ac.uc.id, field: "lectures_remaining", decrement: 1, progress_flag: "lectureCompleted" }, reason: "Chapter being taught right now — staying in sync with class is the highest-ROI hour." });
    ac.uc.lectures_remaining = Math.max(0, (ac.uc.lectures_remaining ?? 0) - 1);
    lecturesPlanned++;
  }

  if (examTomorrow) {
    const top = activeChapters[0];
    if (top && canFit(pyqMin)) {
      const ps = computeTaskPriority("pyq", top.subject, top.chapter, chapterRank, recovery, true);
      place({ title: `PYQ sprint: ${top.subject} — ${top.chapter}`, subject: top.subject, type: "pyq", estimated_minutes: pyqMin, priority: "high", chapter: top.chapter, source: "test_prep", priority_score: ps + 0.8, tracker_ref: { user_chapter_id: top.uc.id, field: "questions_remaining", decrement: 1, progress_flag: "pyqsSolved" }, reason: "Test tomorrow — simulated pressure beats new content today." });
      pyqPlanned = true;
    }
    if (canFit(30)) {
      place({ title: "Mistake analysis", subject: null, type: "mistake_analysis", estimated_minutes: 30, priority: "high", chapter: null, source: "test_prep", priority_score: 8.8, tracker_ref: null, reason: "Errors are the fastest teacher — analyze them before the test." });
    }
  }

  // ===== P1.5 — Recovery tasks (missed items, redistributed gradually) =====
  if (recovery.length > 0 && !examTomorrow) {
    const recTasks = await getRecoveryTasksForDay(Math.max(60, schedulableMinutes - scheduled));
    for (const rt of recTasks) {
      if (!canFit(Math.min(MIN_SLOT_MIN, rt.estimated_minutes))) break;
      const min = Math.min(rt.estimated_minutes, Math.max(MIN_SLOT_MIN, schedulableMinutes - scheduled));
      place({
        title: rt.title,
        subject: rt.subject ?? null,
        type: rt.task_type,
        estimated_minutes: Math.round(min),
        priority: rt.priority as Priority,
        chapter: rt.chapter ?? null,
        source: "recovery",
        priority_score: 8.9,
        tracker_ref: { recovery_id: rt.recovery_id },
        reason: rt.reason ?? "Missed earlier — redistributed in a manageable slice so it actually gets done.",
      });
      recoveryCount++;
    }
  }

  // ===== P2 — Weak topics (concept first, then questions) =====
  let weakPlaced = 0;
  for (const ac of activeChapters) {
    if (weakPlaced >= WEAK_TOPIC_CAP || !canFit(MIN_SLOT_MIN)) break;
    if (!ac.isWeak) continue;
    if ((ac.uc.lectures_remaining ?? 0) > 0 && lecturesPlanned < TODAY_LECTURES_CAP + 1 && canFit(lecMin)) {
      const ps = computeTaskPriority("lecture", ac.subject, ac.chapter, chapterRank, recovery, input.examTomorrow);
      place({ title: `Lecture: ${ac.subject} — ${ac.chapter} (weak)`, subject: ac.subject, type: "lecture", estimated_minutes: lecMin, priority: "high", chapter: ac.chapter, source: "weak_topic", priority_score: ps + 0.4, tracker_ref: { user_chapter_id: ac.uc.id, field: "lectures_remaining", decrement: 1, progress_flag: "lectureCompleted" }, reason: "Weakest chapter — concept first. No questions until the idea is solid." });
      ac.uc.lectures_remaining = Math.max(0, (ac.uc.lectures_remaining ?? 0) - 1);
      lecturesPlanned++;
    } else {
      const rem = schedulableMinutes - scheduled;
      const min = Math.min(moduleMin * 0.8, Math.max(MIN_SLOT_MIN, rem));
      if (min >= MIN_SLOT_MIN) {
        const ps = computeTaskPriority("practice", ac.subject, ac.chapter, chapterRank, recovery, input.examTomorrow);
        place({ title: `Weak topic: ${ac.subject} — ${ac.chapter}`, subject: ac.subject, type: "practice", estimated_minutes: Math.round(min), priority: "high", chapter: ac.chapter, source: "weak_topic", priority_score: ps + 0.3, tracker_ref: null, reason: "Weakest chapter — targeted questions close the gap fastest once the concept is clear." });
      }
    }
    weakPlaced++;
  }

  // ===== P3 — Backlog modules (micro-tasked, never dumped) =====
  for (const ac of activeChapters) {
    if (!canFit(MIN_SLOT_MIN)) break;
    const bl = ac.backlogItem;
    if (!bl || (bl.module_questions_remaining ?? 0) <= 0) continue;
    if (perChapterUsed(bl, "module") >= 1) continue;
    if (testWeek && touchedBacklog.size > 0) continue;
    const remainingQs = bl.module_questions_remaining ?? 0;
    const chunk = Math.min(MODULE_CHUNK_QS, remainingQs);
    const rem = schedulableMinutes - scheduled;
    const min = Math.min(moduleMin, Math.max(MIN_SLOT_MIN, rem));
    if (min < MIN_SLOT_MIN) break;
    const ps = computeTaskPriority("module", ac.subject, ac.chapter, chapterRank, recovery, input.examTomorrow);
    place({ title: `Backlog Module: ${ac.subject} — ${ac.chapter} (${chunk} Qs)`, subject: ac.subject, type: "module", estimated_minutes: Math.round(min), priority: "high", chapter: ac.chapter, source: "backlog", priority_score: ps + 0.2, tracker_ref: { backlog_id: bl.id, kind: "module", auto_decrement: true, decrement: chunk, user_chapter_id: ac.uc.id, field: "questions_remaining", progress_flag: "moduleQuestionsCompleted" }, reason: `Backlog split into ${MODULE_CHUNK_QS}-question micro-tasks (${remainingQs} left) — steady progress without overload.` });
    bl.module_questions_remaining = Math.max(0, remainingQs - chunk);
    touchBacklog(bl, "module");
    moduleQsPlanned += chunk;
  }

  // ===== P4 — Backlog DPPs (one sheet per chapter per day) =====
  for (const ac of activeChapters) {
    if (!canFit(MIN_SLOT_MIN)) break;
    const bl = ac.backlogItem;
    if (!bl || (bl.pending_dpps ?? 0) <= 0) continue;
    if (perChapterUsed(bl, "dpp") >= 1) continue;
    if (testWeek && touchedBacklog.size > 0) continue;
    const rem = schedulableMinutes - scheduled;
    const min = Math.min(dppMin, Math.max(MIN_SLOT_MIN, rem));
    if (min < MIN_SLOT_MIN) break;
    const ps = computeTaskPriority("dpp", ac.subject, ac.chapter, chapterRank, recovery, input.examTomorrow);
    place({ title: `Backlog DPP: ${ac.subject} — ${ac.chapter}`, subject: ac.subject, type: "dpp", estimated_minutes: Math.round(min), priority: "high", chapter: ac.chapter, source: "backlog", priority_score: ps + 0.1, tracker_ref: { backlog_id: bl.id, kind: "dpp", auto_decrement: true, decrement: 1, user_chapter_id: ac.uc.id, field: "questions_remaining", progress_flag: "dppCompleted" }, reason: "One DPP sheet — practice consistency for this chapter without dumping the backlog." });
    bl.pending_dpps = Math.max(0, (bl.pending_dpps ?? 0) - 1);
    touchBacklog(bl, "dpp");
    dppsPlanned++;
  }

  // ===== P5 — PYQs (highest-signal practice) =====
  if (!pyqPlanned) {
    const pyqTarget = examTomorrow || testWeek ? 2 : 1;
    let placed = 0;
    for (const ac of activeChapters) {
      if (placed >= pyqTarget || !canFit(MIN_SLOT_MIN)) break;
      if ((ac.uc.questions_remaining ?? 0) <= 0) continue;
      const rem = schedulableMinutes - scheduled;
      const min = Math.min(pyqMin, Math.max(MIN_SLOT_MIN, rem));
      if (min < MIN_SLOT_MIN) break;
      const ps = computeTaskPriority("pyq", ac.subject, ac.chapter, chapterRank, recovery, input.examTomorrow);
      place({ title: `PYQs: ${ac.subject} — ${ac.chapter}`, subject: ac.subject, type: "pyq", estimated_minutes: Math.round(min), priority: "medium", chapter: ac.chapter, source: "active_chapter", priority_score: ps, tracker_ref: { user_chapter_id: ac.uc.id, field: "questions_remaining", decrement: 1, progress_flag: "pyqsSolved" }, reason: testWeek ? "Test week — previous-year questions are the highest-signal practice." : "Previous-year questions — the fastest way to see the exam pattern." });
      placed++; pyqPlanned = true;
    }
  }

  // ===== P6 — Revision (spaced repetition, automatic) =====
  // Due-now revisions from chapters first.
  for (const ac of activeChapters) {
    if (!canFit(MIN_SLOT_MIN)) break;
    if ((ac.uc.revision_pending ?? 0) <= 0) continue;
    const rem = schedulableMinutes - scheduled;
    const min = Math.min(revMin, Math.max(MIN_SLOT_MIN, rem));
    if (min < MIN_SLOT_MIN) break;
    const ps = computeTaskPriority("revision", ac.subject, ac.chapter, chapterRank, recovery, input.examTomorrow);
    place({ title: `Revision: ${ac.subject} — ${ac.chapter}`, subject: ac.subject, type: "revision", estimated_minutes: Math.round(min), priority: "medium", chapter: ac.chapter, source: "active_chapter", priority_score: ps, tracker_ref: { user_chapter_id: ac.uc.id, field: "revision_pending", decrement: 1, progress_flag: "revision1" }, reason: "Spaced revision due now — the 1/3/7/15/30/60 rhythm keeps it in memory." });
    ac.uc.revision_pending = Math.max(0, (ac.uc.revision_pending ?? 0) - 1);
    revisionCount++;
  }
  // Spaced-repetition block from the revision engine.
  if (canFit(MIN_SLOT_MIN) && revisionCandidates.length > 0) {
    let revBudget = Math.min(revisionBlockMinutes, schedulableMinutes - scheduled);
    const candidates = [...revisionCandidates];
    while (revBudget >= MIN_SLOT_MIN && candidates.length > 0) {
      const cand = candidates.shift()!;
      const min = Math.min(revMin, revBudget);
      if (min < MIN_SLOT_MIN) break;
      const ps = computeTaskPriority("revision", cand.subject, cand.chapter, chapterRank, recovery, input.examTomorrow);
      place({ title: `Revision: ${cand.subject} — ${cand.chapter}`, subject: cand.subject, type: "revision", estimated_minutes: Math.round(min), priority: "medium", chapter: cand.chapter, source: "revision_engine", priority_score: ps - 0.1, tracker_ref: null, reason: cand.reason });
      revBudget -= min; revisionCount++;
    }
  }

  // ===== P7 — Low-priority backlog + practice filler =====
  if (!testWeek) {
    for (const bl of pool.lowPriority) {
      if (!canFit(MIN_SLOT_MIN)) break;
      if (touchedBacklog.has(bl.id)) continue;
      const rem = schedulableMinutes - scheduled;
      const min = Math.min(30, Math.max(MIN_SLOT_MIN, rem));
      if (min < MIN_SLOT_MIN) break;
      const ps = computeTaskPriority("practice", bl.subject ?? null, bl.chapter ?? null, chapterRank, recovery, input.examTomorrow);
      place({ title: `Backlog: ${bl.title}`, subject: bl.subject ?? null, type: "practice", estimated_minutes: Math.round(min), priority: "low", chapter: bl.chapter ?? null, source: "backlog_low", priority_score: Math.max(2, ps - 1.5), tracker_ref: { backlog_id: bl.id, kind: "module" as BacklogKind, auto_decrement: false }, reason: "Low-priority backlog — only placed because today has room." });
      touchedBacklog.add(bl.id);
    }
  }

  // ================= FILL TO TARGET =================
  // Utilization rule: never leave meaningful study time unused. Add productive
  // tasks in priority order until ~90% of available time is planned — or until
  // no meaningful work remains anywhere.
  const weakKeySet = new Set(weak.map((w) => `${w.subject}|${w.chapter}`));
  const fillUsed = new Set<string>();
  const chapterPool: UserChapter[] = activeChapters.length > 0 ? activeChapters.map((a) => a.uc) : userChapters;
  const backlogOf = (u: UserChapter) => backlog.find((b) => b.subject === u.subject && b.chapter === u.chapter && b.status === "todo") ?? null;
  let rotation = 0;
  const pickGeneric = (kind: string, pred: (u: UserChapter) => boolean, repeat: boolean) => {
    for (let i = 0; i < chapterPool.length; i++) {
      const u = chapterPool[(rotation + i) % chapterPool.length];
      if (repeat || !fillUsed.has(`${kind}|${u.subject}|${u.chapter}`)) {
        if (pred(u)) { rotation++; return { subject: u.subject, chapter: u.chapter, uc: u, bl: backlogOf(u) }; }
      }
    }
    return null;
  };

  const fillSources: {
    kind: string; type: string; dur: number; allowed: boolean; repeat: boolean; reason: string;
    pick: () => { subject: string; chapter: string; uc: UserChapter; bl: BacklogItem | null } | null;
    title: (p: { subject: string; chapter: string; bl: BacklogItem | null }) => string;
    tracker: (p: { subject: string; chapter: string; uc: UserChapter; bl: BacklogItem | null }) => Record<string, unknown> | null;
  }[  ] = [
    { kind: "lecture", type: "lecture", dur: lecMin, allowed: true, repeat: false, reason: "New chapter — one lecture today keeps syllabus pace without overload.", pick: () => pickGeneric("lecture", (u) => lecturesPlanned < TODAY_LECTURES_CAP + 1 && (u.lectures_remaining ?? 0) > 0, false), title: (p) => `Lecture: ${p.subject} — ${p.chapter}`, tracker: (p) => ({ user_chapter_id: p.uc.id, field: "lectures_remaining", decrement: 1, progress_flag: "lectureCompleted" }) },
    { kind: "revision", type: "revision", dur: revMin, allowed: true, repeat: false, reason: "Extra spaced revision — cementing what's already learned.", pick: () => pickGeneric("revision", (u) => (u.revision_pending ?? 0) > 0, false), title: (p) => `Revision: ${p.subject} — ${p.chapter}`, tracker: (p) => ({ user_chapter_id: p.uc.id, field: "revision_pending", decrement: 1, progress_flag: "revision1" }) },
    { kind: "weak", type: "practice", dur: Math.round(moduleMin * 0.8), allowed: true, repeat: false, reason: "Weak chapter — targeted practice closes the gap fastest.", pick: () => { const u = userChapters.find((c) => !fillUsed.has(`weak|${c.subject}|${c.chapter}`) && weakKeySet.has(`${c.subject}|${c.chapter}`)); return u ? { subject: u.subject, chapter: u.chapter, uc: u, bl: backlogOf(u) } : null; }, title: (p) => `Weak chapter practice: ${p.subject} — ${p.chapter}`, tracker: () => null },
    { kind: "module", type: "module", dur: moduleMin, allowed: !testWeek, repeat: false, reason: "Backlog module — another 20-question chunk keeps the backlog shrinking.", pick: () => pickGeneric("module", (u) => (backlogOf(u)?.module_questions_remaining ?? 0) > 0, false), title: (p) => `Backlog Module: ${p.subject} — ${p.chapter} (${Math.min(MODULE_CHUNK_QS, p.bl?.module_questions_remaining ?? 0)} Qs)`, tracker: (p) => ({ backlog_id: p.bl!.id, kind: "module", auto_decrement: true, decrement: Math.min(MODULE_CHUNK_QS, p.bl?.module_questions_remaining ?? 0), user_chapter_id: p.uc.id, field: "questions_remaining", progress_flag: "moduleQuestionsCompleted" }) },
    { kind: "dpp", type: "dpp", dur: dppMin, allowed: !testWeek, repeat: false, reason: "Another DPP sheet — daily practice compounds.", pick: () => pickGeneric("dpp", (u) => (backlogOf(u)?.pending_dpps ?? 0) > 0, false), title: (p) => `Backlog DPP: ${p.subject} — ${p.chapter}`, tracker: (p) => ({ backlog_id: p.bl!.id, kind: "dpp", auto_decrement: true, decrement: 1, user_chapter_id: p.uc.id, field: "questions_remaining", progress_flag: "dppCompleted" }) },
    { kind: "pyq", type: "pyq", dur: pyqMin, allowed: true, repeat: false, reason: "More PYQs — the fastest way to internalize the exam pattern.", pick: () => pickGeneric("pyq", (u) => (u.questions_remaining ?? 0) > 0, false), title: (p) => `PYQs: ${p.subject} — ${p.chapter}`, tracker: (p) => ({ user_chapter_id: p.uc.id, field: "questions_remaining", decrement: 1, progress_flag: "pyqsSolved" }) },
    { kind: "formula", type: "formula_revision", dur: 20, allowed: true, repeat: true, reason: "Formula sheet — quick recall is exam currency.", pick: () => pickGeneric("formula", () => true, true), title: (p) => `Formula revision: ${p.subject} — ${p.chapter}`, tracker: () => null },
    { kind: "mistake", type: "mistake_analysis", dur: 25, allowed: true, repeat: true, reason: "Mistake notebook — reviewing errors prevents repeats.", pick: () => pickGeneric("mistake", () => true, true), title: (p) => `Mistake notebook: ${p.subject} — ${p.chapter}`, tracker: () => null },
    { kind: "practice", type: "practice", dur: Math.round(predictedDuration("practice", stats) * practiceBoost), allowed: true, repeat: true, reason: energyLevel === "high" ? "High-energy day — more practice, not more lectures. Practice is where rank is built." : "Extra question practice — volume builds speed.", pick: () => pickGeneric("practice", () => true, true), title: (p) => energyLevel === "high" ? `Advanced questions: ${p.subject} — ${p.chapter}` : `Practice: ${p.subject} — ${p.chapter}`, tracker: () => null },
    { kind: "mock", type: "mock_test_review", dur: 30, allowed: testWeek, repeat: true, reason: "Mock analysis — learn from the last test.", pick: () => pickGeneric("mock", () => true, true), title: (p) => `Mock analysis: ${p.subject} — ${p.chapter}`, tracker: () => null },
    { kind: "notes", type: "notes", dur: 25, allowed: true, repeat: true, reason: "Reading class notes — consolidates today's concepts.", pick: () => pickGeneric("notes", () => true, true), title: (p) => `Revise notes: ${p.subject} — ${p.chapter}`, tracker: () => null },
  ];

  let fillProgress = true;
  while (scheduled < schedulableMinutes - MIN_SLOT_MIN && fillProgress) {
    fillProgress = false;
    for (const src of fillSources) {
      if (scheduled >= schedulableMinutes - MIN_SLOT_MIN) break;
      if (!src.allowed) continue;
      const p = src.pick();
      if (!p) continue;
      const min = Math.min(src.dur, Math.max(MIN_SLOT_MIN, schedulableMinutes - scheduled));
      if (min < MIN_SLOT_MIN || !canFit(min)) continue;
      const ps = computeTaskPriority(src.type, p.subject, p.chapter, chapterRank, recovery, input.examTomorrow);
      place({ title: src.title(p), subject: p.subject, type: src.type, estimated_minutes: Math.round(min), priority: "medium", chapter: p.chapter, source: "fill", priority_score: Math.max(2, ps - 0.4), tracker_ref: src.tracker(p), reason: src.reason });
      if (!src.repeat) fillUsed.add(`${src.kind}|${p.subject}|${p.chapter}`);
      if (src.kind === "module" && p.bl) {
        const remQ = p.bl.module_questions_remaining ?? 0;
        const chunk = Math.min(MODULE_CHUNK_QS, remQ);
        p.bl.module_questions_remaining = Math.max(0, remQ - chunk);
        moduleQsPlanned += chunk;
      } else if (src.kind === "dpp" && p.bl) {
        p.bl.pending_dpps = Math.max(0, (p.bl.pending_dpps ?? 0) - 1);
        dppsPlanned++;
      }
      if (src.kind === "revision") revisionCount++;
      if (src.kind === "pyq") pyqPlanned = true;
      if (src.kind === "lecture") lecturesPlanned++;
      fillProgress = true;
    }
  }

  // Buffer is reserved internally (bufferMinutes) and reported as a stat —
  // never emitted as a user task. Only study tasks reach the timeline.

  // --- Fallback ---
  if (tasks.length <= 1) {
    const s = subjectNames[0] ?? "General Studies";
    const min = Math.max(25, Math.min(120, schedulableMinutes));
    place({ title: `Study session: ${s}`, subject: s, type: "study", estimated_minutes: min, priority: "medium", chapter: null, source: "fallback", priority_score: 3, tracker_ref: null, reason: "No active chapters with remaining work found — keeping a light, consistent session." });
    warnings.push("No active chapters with remaining work found. Generated a generic study session.");
  }

  // ================= UTILIZATION CHECK =================
  // planned time = study tasks + rest breaks. Target ≈ 90% of available hours
  // (85–95% band). Ending early is only allowed when no meaningful work exists.
  const meaningfulWork =
    pool.pendingLectures > 0 || pool.pendingDpps > 0 || pool.pendingModuleQs > 0 ||
    pool.lowPriority.length > 0 || revisionCandidates.length > 0 || recovery.length > 0 ||
    weak.length > 0 ||
    activeChapters.some((a) => (a.uc.lectures_remaining ?? 0) > 0 || (a.uc.questions_remaining ?? 0) > 0 || (a.uc.revision_pending ?? 0) > 0);
  const plannedTotalMinutes = scheduled + breakMinutes;
  const utilizationPct = requestedMinutes > 0 ? Math.min(100, Math.round((plannedTotalMinutes / requestedMinutes) * 100)) : 0;
  if (!meaningfulWork && utilizationPct < 80) {
    warnings.push("All pending work is exhausted — ending the day early is correct. Enjoy the extra time.");
  } else if (plannedTotalMinutes < Math.round(adjusted * 0.8)) {
    warnings.push(`Plan uses ${utilizationPct}% of available time — below the 80% floor despite pending work.`);
  }

  // ================= SELF-CHECK =================
  const selfCheck: SelfCheckItem[] = [
    { label: "Fits today's hours", passed: scheduled <= adjusted + TOLERANCE_MIN },
    { label: "Backlog balanced (no dumping)", passed: backlogPerChapter.size === 0 || Array.from(backlogPerChapter.values()).every((c) => c.lecture <= 1 && c.dpp <= 1 && c.module <= 1) },
    { label: "Revision included", passed: revisionCount > 0 || revisionCandidates.length === 0 },
    { label: "Practice included", passed: moduleQsPlanned + dppsPlanned + (pyqPlanned ? 1 : 0) > 0 || schedulableMinutes < 120 },
    { label: "Today's lecture included", passed: lecturesPlanned > 0 || !activeChapters.some((a) => a.inClassNow && (a.uc.lectures_remaining ?? 0) > 0) },
    { label: "Buffer protected", passed: bufferMinutes > 0 },
    { label: "Burnout avoided", passed: burnout.level !== "severe" || adjusted < requestedMinutes },
  ];

  // Corrective pass: fix anything the self-check rejects if time allows.
  if (!selfCheck[2].passed && canFit(MIN_SLOT_MIN) && revisionCandidates.length > 0) {
    const cand = revisionCandidates[0];
    const ps = computeTaskPriority("revision", cand.subject, cand.chapter, chapterRank, recovery, input.examTomorrow);
    place({ title: `Revision: ${cand.subject} — ${cand.chapter}`, subject: cand.subject, type: "revision", estimated_minutes: revMin, priority: "medium", chapter: cand.chapter, source: "revision_engine", priority_score: ps, tracker_ref: null, reason: cand.reason });
    revisionCount++;
    selfCheck[2] = { label: selfCheck[2].label, passed: true };
  }
  if (!selfCheck[4].passed && canFit(lecMin) && activeChapters.length > 0) {
    const ac = activeChapters.find((a) => a.inClassNow && (a.uc.lectures_remaining ?? 0) > 0) ?? activeChapters[0];
    const ps = computeTaskPriority("lecture", ac.subject, ac.chapter, chapterRank, recovery, input.examTomorrow);
    place({ title: `Lecture: ${ac.subject} — ${ac.chapter}`, subject: ac.subject, type: "lecture", estimated_minutes: lecMin, priority: "high", chapter: ac.chapter, source: "active_chapter", priority_score: ps, tracker_ref: { user_chapter_id: ac.uc.id, field: "lectures_remaining", decrement: 1, progress_flag: "lectureCompleted" }, reason: "Keeping pace with class — required by the mentor check." });
    lecturesPlanned++;
    selfCheck[4] = { label: selfCheck[4].label, passed: true };
  }

  // ================= FINALIZE =================
  // Sort by ladder (priority score desc), then interleave breaks.
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

  const byType: Record<string, number> = {}, bySubject: Record<string, number> = {};
  for (const t of interleaved) {
    byType[t.type] = (byType[t.type] ?? 0) + 1;
    if (t.subject) bySubject[t.subject] = (bySubject[t.subject] ?? 0) + 1;
  }

  // ===== Sleep is a CONSTRAINT ONLY: it defines unavailable hours (sleep window)
  // so tasks are never placed during sleep. It does NOT reduce study goals,
  // influence task priority, or weight the allocation. Sleep timing only affects
  // which time slots are available for placement.
  // When sleep hour is before wake hour (e.g., 2 AM sleep, 8 AM wake), sleep
  // is treated as belonging to the next day — available window extends to midnight.
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

  // Keep breaks attached to the task they follow (hard block → rest), but let
  // hard groups claim the best slots before lighter work.
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

  // Tasks with tracker_ref.class_start/class_end (live classes, school hours)
  // are pinned to their exact ranges, which are reserved so no study task
  // ever overlaps them.
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
      if (blk) { cursor = blk.end; continue; } // skip past the live class / school
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
  for (const b of blocked) cursor = Math.max(cursor, b.end);

  const finishTime = fmtTime(base, cursor);
  const gap = adjusted - scheduled;

  // Carry forward: everything we intentionally did NOT dump today.
  const carryForward: CarryForwardItem[] = [];
  for (const b of backlog) {
    if (b.status !== "todo") continue;
    if (!touchedBacklog.has(b.id) && (b.pending_lectures ?? 0) === 0 && (b.pending_dpps ?? 0) === 0 && (b.module_questions_remaining ?? 0) === 0) continue;
    const label = `${b.subject ?? "Study"}: ${b.title}`;
    if ((b.pending_lectures ?? 0) > 0) carryForward.push({ title: `${b.pending_lectures} backlog lecture${(b.pending_lectures ?? 0) > 1 ? "s" : ""} — ${label}`, reason: "Lectures spread 1/day — never dumped in a single sitting." });
    if ((b.pending_dpps ?? 0) > 0) carryForward.push({ title: `${b.pending_dpps} DPP${(b.pending_dpps ?? 0) > 1 ? "s" : ""} — ${label}`, reason: "One sheet per day keeps practice consistent." });
    const remQs = b.module_questions_remaining ?? 0;
    if (remQs > 0) carryForward.push({ title: `${remQs} module Qs — ${label}`, reason: `Split into ${MODULE_CHUNK_QS}-Q chunks; next chunk scheduled tomorrow.` });
  }
  for (const r of recovery) {
    if (!tasksOut.some((t) => (t.tracker_ref as { recovery_id?: string } | null)?.recovery_id === r.id)) {
      carryForward.push({ title: `Recovery: ${r.title}`, reason: r.reason ?? "Still in the recovery bucket — will be redistributed." });
    }
  }

  const completionRateDiag = completionRatePrev;
  const { score: confidenceScore, label: confidenceLabel } = computeConfidence(completionRatePrev, stats, burnout, backlogUnderControl, energyLevel, testWeek);
  const motivation = buildMotivation(burnout, completionRatePrev, stats?.streak_days ?? 0, examTomorrow, testWeek, energyLevel);
  const insight = burnout.level === "severe"
    ? "You've been pushing hard. Today is a recovery day — lighter tasks, more breaks. Consistency beats intensity."
    : burnout.level === "moderate"
      ? "Signs of fatigue detected. We've reduced your load and added more revision. Pace yourself today."
      : recoveryCount > 0
        ? `Catching up on ${recoveryCount} missed items — distributed gradually so you stay on track without overload.`
        : completionRateDiag !== null && completionRateDiag >= 0.8
          ? "Excellent consistency! You're in a great rhythm — keep the momentum going."
          : motivation;

  const dailyGoal = buildDailyGoal(lecturesPlanned, moduleQsPlanned, dppsPlanned, pyqPlanned, revisionCount, schedulableMinutes, finishTime);
  const revisionSchedule = getUpcomingRevisionSchedule(userChapters, stats, 14);
  const completionTarget = completionRatePrev !== null && completionRatePrev < 0.5
    ? "Finish ≥60% of today's tasks — small wins rebuild momentum"
    : completionRatePrev !== null && completionRatePrev >= 0.8
      ? "Finish ≥85% of today's tasks — keep the streak alive"
      : "Finish ≥80% of today's tasks — a realistic day you can complete";

  const coaching: CoachingSummary = {
    dailyGoal,
    plannedMinutes: scheduled,
    estimatedFinishTime: finishTime,
    bufferMinutes,
    energyRead: energyRead(energyLevel, burnout),
    completionTarget,
    taskReasons: interleaved.filter((t) => t.reason).map((t) => ({ title: t.title, reason: t.reason })),
    carryForward,
    revisionSchedule,
    confidenceScore,
    confidenceLabel,
    motivation,
    selfCheck,
    prevDay: plannedPrevCount > 0 ? { completionRate: completionRatePrev, skippedCount: skippedCountPrev, studiedMinutes: studiedPrev, plannedCount: plannedPrevCount } : null,
  };

  const diagnostics: PlannerDiagnostics = {
    requestedMinutes, adjustedMinutes: adjusted, scheduledMinutes: scheduled, gapMinutes: gap,
    taskCount: tasksOut.length, byType, bySubject, bufferMinutes, breakMinutes,
    recoveryTasksIncluded: recoveryCount, revisionTasksIncluded: revisionCount,
    burnout, motivationalInsight: insight, estimatedFinishTime: finishTime, warnings,
    adaptiveLoadFactor, completionRatePrev: completionRateDiag, skippedCountPrev,
    testWeek, daysToTest, confidenceScore,
    energyRead: energyRead(energyLevel, burnout),
    availableMinutes: requestedMinutes, targetMinutes: utilTargetMinutes, utilizationPct,
    dataChecks: { profile: !!profile.id, subjects: subjectNames.length > 0, chapters: chapterRows.length > 0, studyHours: requestedMinutes > 0, inputValid: v.valid },
    habitCalibration: habitStats && calibration ? {
      active: calibration.active,
      selectedMinutes: requestedMinutesBase,
      targetMinutes: calibration.targetMinutes,
      blend: calibration.blend,
      daysObserved: habitStats.daysObserved,
      avgCompletedMinutes: habitStats.avgCompletedMinutes,
      completionRate: habitStats.completionRate,
      consistency: habitStats.consistency,
      startDelayAvg: habitStats.startDelayAvg,
      bestSlot: habitStats.bestSlot,
      message: calibration.message,
    } : null,
  };

  console.info("[mentor-planner] done", { scheduled, adjusted, tasks: tasksOut.length, recovery: recoveryCount, revision: revisionCount, burnout: burnout.level, confidence: confidenceScore, testWeek });
  return { tasks: tasksOut, diagnostics, coaching };
}

// --- Weekly / Monthly goal generation ---

export async function generateWeeklyGoal(profile: Profile): Promise<WeeklyGoal> {
  let userChapters: UserChapter[] = [];
  let backlog: BacklogItem[] = [];
  try { userChapters = await db.getUserChapters(); } catch { /* not found — treat as empty */ }
  try { backlog = await db.getBacklogItems(profile.target_exam); } catch { /* not found — treat as empty */ }

  const ranked = rankChapters(userChapters, backlog, [], profile);
  const targetChapters = ranked.filter((c) => c.status !== "completed" && c.status !== "mastered").slice(0, 5)
    .map((c) => ({ subject: c.subject, chapter: c.chapter }));
  const pool = categorizeBacklog(backlog);
  const studyHoursTarget = (profile.daily_goal_hours ?? 4) * 7 * 0.85;

  return {
    targetChapters,
    revisionGoals: Math.max(3, Math.ceil(userChapters.filter((u) => u.status === "in_progress" || u.status === "started").length * 0.5)),
    questionTargets: pool.pendingDpps + Math.ceil(pool.pendingModuleQs * 0.2) + 20,
    backlogReduction: Math.ceil(pool.pendingLectures * 0.5),
    studyHoursTarget: Math.round(studyHoursTarget),
  };
}

export async function generateMonthlyGoal(profile: Profile): Promise<MonthlyGoal> {
  let userChapters: UserChapter[] = [];
  let backlog: BacklogItem[] = [];
  try { userChapters = await db.getUserChapters(); } catch { /* not found — treat as empty */ }
  try { backlog = await db.getBacklogItems(profile.target_exam); } catch { /* not found — treat as empty */ }

  const ranked = rankChapters(userChapters, backlog, [], profile);
  const majorChapters = ranked.filter((c) => c.status !== "completed" && c.status !== "mastered").slice(0, 10)
    .map((c) => ({ subject: c.subject, chapter: c.chapter }));
  const pool = categorizeBacklog(backlog);

  return {
    majorChapters,
    revisionTargets: Math.max(8, Math.ceil(userChapters.length * 0.3)),
    pyqTargets: 50,
    recoveryTargets: Math.ceil(pool.pendingLectures * 0.3 + pool.pendingDpps * 0.3),
    studyHoursTarget: Math.round((profile.daily_goal_hours ?? 4) * 30 * 0.8),
  };
}

// --- Task lifecycle ---

export async function onTaskCompleted(task: PlanTask): Promise<void> {
  const ref = task.tracker_ref as {
    backlog_id?: string; kind?: BacklogKind; auto_decrement?: boolean;
    recovery_id?: string;
    user_chapter_id?: string; field?: string; decrement?: number; progress_flag?: string;
  } | null;
  if (ref?.backlog_id && ref.kind && ref.auto_decrement) {
    try { await db.decrementBacklog(ref.backlog_id, ref.kind, ref.decrement ?? 1); } catch (e) { console.error("[mentor-planner.onTaskCompleted] backlog", e); }
  }
  if (ref?.recovery_id) {
    try { await db.markRecoveryRecovered(ref.recovery_id); } catch (e) { console.error("[mentor-planner.onTaskCompleted] recovery", e); }
  }
  if (ref?.user_chapter_id && ref.field) {
    try {
      const subject = task.subject; const chapter = task.chapter;
      if (subject && chapter) {
        const patch: Record<string, unknown> = {};
        const progressPatch: Record<string, boolean> = {};
        if (ref.progress_flag) progressPatch[ref.progress_flag] = true;
        const currentChapters = await db.getUserChapters();
        const uc = currentChapters.find((c) => c.id === ref.user_chapter_id);
        if (uc) {
          const decrement = ref.decrement ?? 1;
          if (ref.field === "lectures_remaining") {
            let remaining = Math.max(0, (uc.lectures_remaining ?? 0) - decrement);
            // Chapter still being studied (started/in_progress) with no question
            // work yet: keep two lectures queued so the planner schedules its
            // 2/day minimum while the user is doing the chapter.
            if (remaining < 2 && (uc.status === "started" || uc.status === "in_progress") && (uc.questions_remaining ?? 0) <= 0) remaining = 2;
            patch.lectures_remaining = remaining;
          } else if (ref.field === "questions_remaining") patch.questions_remaining = Math.max(0, (uc.questions_remaining ?? 0) - decrement);
          else if (ref.field === "revision_pending") patch.revision_pending = Math.max(0, (uc.revision_pending ?? 0) - decrement);
          if (Object.keys(progressPatch).length > 0) patch.progress = progressPatch;
          await db.updateUserChapterProgress(subject, chapter, patch as Partial<UserChapter> & { progress?: Record<string, unknown> });
          console.info("[mentor-planner.onTaskCompleted] updated chapter", subject, chapter, patch);
        }
      }
    } catch (e) { console.error("[mentor-planner.onTaskCompleted] chapter update", e); }
  }
  try { await updateStudyStats(); } catch (e) { console.error("[mentor-planner.onTaskCompleted] stats", e); }
}

export async function onTaskStatusChange(task: PlanTask, newStatus: TaskStatus, actualMinutes?: number): Promise<void> {
  if (task.id) {
    try { await db.setTaskStatus(task.id, newStatus, actualMinutes); } catch (e) { console.error("[mentor-planner.onTaskStatusChange]", e); }
  }
  if (newStatus === "completed") {
    await onTaskCompleted(task);
  } else if (newStatus === "skipped" || newStatus === "postponed") {
    // Move to recovery bucket if not already there
    const ref = task.tracker_ref as { recovery_id?: string } | null;
    if (!ref?.recovery_id && task.scheduled_date) {
      try {
        await db.addRecoveryItem({
          title: task.title, subject: task.subject, chapter: task.chapter,
          task_type: task.type, estimated_minutes: task.estimated_minutes,
          priority: task.priority, reason: `Marked as ${newStatus}`, date_missed: task.scheduled_date,
        });
      } catch (e) { console.error("[mentor-planner.onTaskStatusChange] recovery", e); }
    }
  }
}

// --- Missed task engine: call at end of day or on new plan generation ---

export async function processMissedTasks(date: string): Promise<number> {
  return moveMissedTasksToRecovery(date);
}

export function describeDiagnostics(d: PlannerDiagnostics): string {
  const lines = [
    `Available ${d.availableMinutes} min · Requested ${d.requestedMinutes} min · Adjusted ${d.adjustedMinutes} min (load ${d.adaptiveLoadFactor}) · Scheduled ${d.scheduledMinutes} min · Target ${d.targetMinutes} min`,
    `Utilization ${d.utilizationPct}% · Buffer ${d.bufferMinutes} min · Breaks ${d.breakMinutes} min · Gap ${d.gapMinutes} min`,
    `Tasks: ${d.taskCount} | Recovery: ${d.recoveryTasksIncluded} | Revision: ${d.revisionTasksIncluded}`,
    `Burnout: ${d.burnout.level} | ETA: ${d.estimatedFinishTime} | Confidence: ${d.confidenceScore}`,
    `Prev day: ${d.completionRatePrev === null ? "n/a" : Math.round(d.completionRatePrev * 100) + "%"} completed · ${d.skippedCountPrev} skipped${d.testWeek ? ` · Test week (${d.daysToTest}d)` : ""}`,
    `Checks: profile=${d.dataChecks.profile} subjects=${d.dataChecks.subjects} chapters=${d.dataChecks.chapters} hours=${d.dataChecks.studyHours}`,
  ];
  if (d.burnout.reasons.length > 0) lines.push(`Burnout reasons: ${d.burnout.reasons.join("; ")}`);
  if (d.warnings.length > 0) lines.push(`Warnings: ${d.warnings.join("; ")}`);
  return lines.join("\n");
}

export { TASK_TYPE_LABELS, TOLERANCE_MIN };
