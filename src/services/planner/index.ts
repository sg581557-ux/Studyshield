import { db, aliasExamId } from "../db";
import { TASK_TYPE_LABELS } from "../../lib/constants";
import type {
  BacklogItem, EnergyLevel, PlanTask, Priority, Profile, BacklogKind,
  SyllabusSubject, SyllabusChapter, UserChapter, Formula,
  TaskStatus, RecoveryItemInput, RecoveryItem, StudyStats,} from "../../lib/types";
import { computeTaskPriority, rankChapters } from "./priorityEngine";
import { predictedDuration, defaultDuration, updateStudyStats } from "./learningModel";
import { moveMissedTasksToRecovery, getRecoveryTasksForDay, markRecoveryCompleted, type RecoveryTaskWithId } from "./recoveryEngine";
import { getRevisionCandidates } from "./revisionEngine";
import { detectBurnout, applyBurnoutAdjustments, type BurnoutSignal } from "./burnoutDetector";

export interface PlannerInput {
  profile: Profile;
  studyHours: number;
  energyLevel: EnergyLevel;
  wasSchoolDay: boolean;
  examTomorrow: boolean;
  date: string;
  notes?: string;
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
  dataChecks: { profile: boolean; subjects: boolean; chapters: boolean; studyHours: boolean; inputValid: boolean };
}

export interface PlannerResult {
  tasks: PlanTask[];
  diagnostics: PlannerDiagnostics;
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
const BUFFER_PCT = 0.1;
const REVISION_BLOCK_PCT = 0.15;
const PLANNING_TIME_MIN = 5;
const ACTIVE_CHAPTER_PROGRESS_THRESHOLD = 0.6;

function fmtTime(base: Date, minutesFromBase: number): string {
  const d = new Date(base.getTime() + minutesFromBase * 60000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function pick<T>(arr: T[], i: number): T | null { return arr.length === 0 ? null : arr[i % arr.length]; }

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
}

function categorizeBacklog(items: BacklogItem[]): BacklogPool {
  const open = items.filter((b) => b.status === "todo");
  const lectures: BacklogItem[] = [], dpps: BacklogItem[] = [], modules: BacklogItem[] = [];
  let pendingLectures = 0, pendingDpps = 0, pendingModuleQs = 0;
  for (const b of open) {
    const kinds = b.backlog_types ?? [];
    if (kinds.includes("lecture") && (b.pending_lectures ?? 0) > 0) { lectures.push(b); pendingLectures += b.pending_lectures ?? 0; }
    if (kinds.includes("dpp") && (b.pending_dpps ?? 0) > 0) { dpps.push(b); pendingDpps += b.pending_dpps ?? 0; }
    if (kinds.includes("module") && (b.module_questions_remaining ?? 0) > 0) { modules.push(b); pendingModuleQs += b.module_questions_remaining ?? 0; }
  }
  return { lectures, dpps, modules, pendingLectures, pendingDpps, pendingModuleQs };
}

function nextBacklogLecture(pool: BacklogPool) { return pool.lectures.find((b) => (b.pending_lectures ?? 0) > 0) ?? null; }
function nextBacklogDpp(pool: BacklogPool) { return pool.dpps.find((b) => (b.pending_dpps ?? 0) > 0) ?? null; }
function nextBacklogModule(pool: BacklogPool) { return pool.modules.find((b) => (b.module_questions_remaining ?? 0) > 0) ?? null; }

function weakChapters(ucs: UserChapter[]) {
  return ucs.filter((u) => u.status !== "completed" && u.status !== "mastered" && (u.confidence ?? 3) <= 2)
    .map((u) => ({ subject: u.subject, chapter: u.chapter })).sort((a, b) => a.subject.localeCompare(b.subject));
}
function chaptersForRevision(ucs: UserChapter[]) {
  return ucs.filter((u) => u.status === "revision_pending" || u.status === "in_progress" || u.status === "started")
    .map((u) => ({ subject: u.subject, chapter: u.chapter }));
}
function unstartedChapters(subjects: SyllabusSubject[], chapters: SyllabusChapter[], ucs: UserChapter[]) {
  const done = new Set(ucs.map((u) => `${u.subject}|${u.chapter}`));
  const out: { subject: string; chapter: string }[] = [];
  for (const s of subjects) for (const c of chapters.filter((c) => c.subject_id === s.id)) if (!done.has(`${s.name}|${c.name}`)) out.push({ subject: s.name, chapter: c.name });
  return out;
}

function computeMinLectures(pool: BacklogPool, availableMinutes: number, lecMin: number): number {
  const maxFit = Math.max(1, Math.floor(availableMinutes / lecMin));
  const pendingLec = pool.pendingLectures;
  if (pendingLec === 0) return Math.min(2, maxFit);
  if (pendingLec <= 2) return Math.min(4, maxFit);
  if (pendingLec <= 5) return Math.min(5, maxFit);
  return maxFit;
}

interface PlannedTask {
  title: string; subject: string | null; type: string; estimated_minutes: number;
  priority: Priority; chapter: string | null; source: string; priority_score: number;
  tracker_ref: Record<string, unknown> | null;
}

function buildCoaching(profile: Profile, date: string): PlannedTask[] {
  if (!profile.coaching_enabled || !profile.coaching_days?.length) return [];
  const wd = new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
  if (!profile.coaching_days.includes(wd)) return [];
  const [sh, sm] = (profile.coaching_start ?? "16:00").split(":").map(Number);
  const [eh, em] = (profile.coaching_end ?? "19:00").split(":").map(Number);
  return [{ title: `Coaching: ${profile.coaching_name || "Online class"}`, subject: null, type: "coaching", estimated_minutes: Math.max(30, (eh*60+em)-(sh*60+sm)), priority: "high", chapter: null, source: "coaching", priority_score: 9, tracker_ref: null }];
}

function generateInsight(burnout: BurnoutSignal, completionRate: number, taskCount: number, recoveryCount: number): string {
  if (burnout.level === "severe") return "You've been pushing hard. Today is a recovery day — lighter tasks, more breaks. Consistency beats intensity.";
  if (burnout.level === "moderate") return "Signs of fatigue detected. We've reduced your load and added more revision. Pace yourself today.";
  if (recoveryCount > 0) return `Catching up on ${recoveryCount} missed items. We're distributing them gradually so you stay on track without overload.`;
  if (completionRate >= 0.8) return "Excellent consistency! You're in a great rhythm — keep the momentum going.";
  if (taskCount <= 3) return "A focused day. Quality over quantity — make each task count.";
  return "Balanced plan ready. Remember: the best plan is the one you actually follow.";
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
  if (!v.valid) { console.error("[planner-v2] validation failed:", v.errors); throw new PlannerErrorClass("INVALID_INPUT", `Cannot generate plan: ${v.errors.join(" ")}`); }

  const { profile, studyHours, energyLevel, date } = input;
  const requestedMinutes = Math.max(0, Math.round(studyHours * 60));
  console.info("[planner-v2] start", { userId: profile.id, studyHours, requestedMinutes, date, energy: energyLevel });

  // --- Load data ---
  const examKey = aliasExamId(profile.target_exam ?? "");
  let subjects: SyllabusSubject[] = [], chapterRows: SyllabusChapter[] = [], userChapters: UserChapter[] = [];
  let backlog: BacklogItem[] = [], formulas: Formula[] = [];
  let stats: StudyStats | null = null;

  try { subjects = await db.getSubjects(examKey); } catch (e) { console.error("[planner-v2] getSubjects", e); warnings.push("Failed to load subjects."); }
  if (subjects.length > 0) {
    try { chapterRows = (await Promise.all(subjects.map((s) => db.getChapters(s.id).catch(() => [] as SyllabusChapter[])))).flat(); }
    catch (e) { console.error("[planner-v2] chapters", e); warnings.push("Failed to load chapters."); }
  }
  try { userChapters = await db.getUserChapters(); } catch (e) { console.error("[planner-v2] getUserChapters", e); }
  try { backlog = await db.getBacklogItems(); } catch (e) { console.error("[planner-v2] backlog", e); }
  try { formulas = await db.getFormulasForExam(examKey); } catch (e) { console.error("[planner-v2] formulas", e); }
  try { stats = await db.getStudyStats(); } catch (e) { console.error("[planner-v2] stats", e); }

  const subjectNames = subjects.length > 0 ? subjects.map((s) => s.name) : JEE_SUBJECTS_FALLBACK.slice();
  const recovery = await db.getRecoveryItems("pending").catch(() => [] as Awaited<ReturnType<typeof db.getRecoveryItems>>);
  const pool = categorizeBacklog(backlog);
  const weak = weakChapters(userChapters), revisionChapters = chaptersForRevision(userChapters), unstarted = unstartedChapters(subjects, chapterRows, userChapters);

  // --- Burnout detection ---
  const recentCompleted = await db.getRecentCompletedTasks(7).catch(() => [] as PlanTask[]);
  const burnout = detectBurnout(recentCompleted, [energyLevel], [studyHours]);
  const adjustedMinutes = applyBurnoutAdjustments(requestedMinutes, energyLevel, burnout);
  if (burnout.detected) warnings.push(`Burnout detected (${burnout.level}): ${burnout.reasons.join("; ")}`);

  // --- Buffer system: never schedule 100% ---
  const bufferMinutes = Math.round(adjustedMinutes * BUFFER_PCT);
  const revisionBlockMinutes = Math.round(adjustedMinutes * REVISION_BLOCK_PCT);
  const breakMinutes = Math.ceil((adjustedMinutes - bufferMinutes) / 90) * BREAK_MIN;
  const schedulableMinutes = adjustedMinutes - bufferMinutes - breakMinutes - PLANNING_TIME_MIN;
  const effectiveMinutes = Math.max(60, schedulableMinutes);

  // --- Priority ranking ---
  const chapterRank = rankChapters(userChapters, backlog, recovery, profile);
  const revisionCandidates = getRevisionCandidates(userChapters, stats, 8);

  // --- Active Chapter analysis (Priority 1) ---
  const activeChapters = getActiveChapters(userChapters, backlog, recovery, profile);
  const activeChaptersWithWork = activeChapters.filter((a) => a.remainingWork > 0);
  const backlogUnderControl = pool.pendingLectures <= 0 && pool.pendingDpps <= 0 && pool.pendingModuleQs <= 0;
  const canAddNewChapters = activeChaptersWithWork.length === 0 && backlogUnderControl;
  console.info("[planner-v2] active chapters:", activeChapters.map((a) => `${a.subject}/${a.chapter}: ${a.remainingWork} remaining, ${Math.round(a.progressPct * 100)}%`));

  const tasks: PlannedTask[] = [];
  let scheduled = 0;
  let recoveryCount = 0;
  let revisionCount = 0;

  // --- Planning time ---
  tasks.push({ title: "Plan & prioritize", subject: null, type: "study", estimated_minutes: PLANNING_TIME_MIN, priority: "high", chapter: null, source: "system", priority_score: 10, tracker_ref: null });
  scheduled += PLANNING_TIME_MIN;

  // --- Coaching (Priority 2: only the coaching lecture itself) ---
  for (const t of buildCoaching(profile, date)) {
    if (scheduled + t.estimated_minutes > effectiveMinutes + TOLERANCE_MIN) continue;
    tasks.push(t); scheduled += t.estimated_minutes;
  }

  // --- Recovery tasks (gradual, never dump all) ---
  const recoveryBudget = Math.min(effectiveMinutes * 0.2, 90);
  if (recovery.length > 0) {
    try {
      const recoveryTasks: RecoveryTaskWithId[] = await getRecoveryTasksForDay(Math.round(recoveryBudget));
      for (const rt of recoveryTasks) {
        if (scheduled + rt.estimated_minutes > effectiveMinutes) break;
        const ps = computeTaskPriority(rt.task_type, rt.subject ?? null, rt.chapter ?? null, chapterRank, recovery, input.examTomorrow);
        tasks.push({ title: rt.title, subject: rt.subject ?? null, type: rt.task_type, estimated_minutes: rt.estimated_minutes, priority: rt.priority, chapter: rt.chapter ?? null, source: "recovery", priority_score: ps + 1, tracker_ref: { recovery_id: rt.recovery_id } });
        scheduled += rt.estimated_minutes; recoveryCount++;
      }
    } catch (e) { console.error("[planner-v2] recovery", e); }
  }

  // --- Minimum daily lecture target (spec: 2/day minimum, scaled up with backlog) ---
  const lecMin = predictedDuration("lecture", stats);
  const pyqMin = predictedDuration("pyq", stats);
  const dppMin = predictedDuration("dpp", stats);
  const moduleMin = predictedDuration("module", stats);
  const revMin = predictedDuration("revision", stats);
  const minLectures = computeMinLectures(pool, effectiveMinutes - scheduled, lecMin);
  let lecturesPlaced = 0;
  console.info("[planner-v2] lecture target:", { min: minLectures, backlogPending: pool.pendingLectures });

  // --- Phase 1: Backlog lectures (cross-chapter, highest priority after coaching) ---
  for (const ac of activeChapters) {
    if (scheduled >= effectiveMinutes - TOLERANCE_MIN) break;
    const bl = ac.backlogItem;
    while (bl && (bl.pending_lectures ?? 0) > 0 && scheduled + lecMin <= effectiveMinutes + TOLERANCE_MIN) {
      const ps = computeTaskPriority("lecture", ac.subject, ac.chapter, chapterRank, recovery, input.examTomorrow);
      tasks.push({ title: `Backlog Lecture: ${ac.subject} — ${ac.chapter}`, subject: ac.subject, type: "lecture", estimated_minutes: lecMin, priority: "high", chapter: ac.chapter, source: "backlog", priority_score: ps + 0.5, tracker_ref: { backlog_id: bl.id, kind: "lecture", auto_decrement: true, user_chapter_id: ac.uc.id, field: "lectures_remaining", decrement: 1, progress_flag: "lectureCompleted" } });
      bl.pending_lectures = Math.max(0, (bl.pending_lectures ?? 0) - 1);
      ac.uc.lectures_remaining = Math.max(0, (ac.uc.lectures_remaining ?? 0) - 1);
      scheduled += lecMin; lecturesPlaced++;
    }
  }

  // --- Phase 2: Backlog modules (cross-chapter) ---
  for (const ac of activeChapters) {
    if (scheduled >= effectiveMinutes - TOLERANCE_MIN) break;
    const bl = ac.backlogItem;
    while (bl && (bl.module_questions_remaining ?? 0) > 0 && scheduled < effectiveMinutes - TOLERANCE_MIN) {
      const rem = effectiveMinutes - scheduled; const min = Math.min(moduleMin, Math.max(15, rem)); if (min < 15) break;
      const ps = computeTaskPriority("module", ac.subject, ac.chapter, chapterRank, recovery, input.examTomorrow);
      bl.module_questions_remaining = Math.max(0, (bl.module_questions_remaining ?? 0) - 1);
      tasks.push({ title: `Backlog Module: ${ac.subject} — ${ac.chapter}`, subject: ac.subject, type: "module", estimated_minutes: min, priority: "high", chapter: ac.chapter, source: "backlog", priority_score: ps + 0.5, tracker_ref: { backlog_id: bl.id, kind: "module", auto_decrement: true, user_chapter_id: ac.uc.id, field: "questions_remaining", decrement: 1, progress_flag: "moduleQuestionsCompleted" } });
      scheduled += min;
    }
  }

  // --- Phase 3: Backlog DPPs (cross-chapter) ---
  for (const ac of activeChapters) {
    if (scheduled >= effectiveMinutes - TOLERANCE_MIN) break;
    const bl = ac.backlogItem;
    while (bl && (bl.pending_dpps ?? 0) > 0 && scheduled < effectiveMinutes - TOLERANCE_MIN) {
      const rem = effectiveMinutes - scheduled; const min = Math.min(dppMin, Math.max(15, rem)); if (min < 15) break;
      const ps = computeTaskPriority("dpp", ac.subject, ac.chapter, chapterRank, recovery, input.examTomorrow);
      bl.pending_dpps = Math.max(0, (bl.pending_dpps ?? 0) - 1);
      tasks.push({ title: `Backlog DPP: ${ac.subject} — ${ac.chapter}`, subject: ac.subject, type: "dpp", estimated_minutes: min, priority: "high", chapter: ac.chapter, source: "backlog", priority_score: ps + 0.5, tracker_ref: { backlog_id: bl.id, kind: "dpp", auto_decrement: true, user_chapter_id: ac.uc.id, field: "questions_remaining", decrement: 1, progress_flag: "dppCompleted" } });
      scheduled += min;
    }
  }

  // --- Phase 4: Backlog PYQs (cross-chapter, boosted if exam tomorrow) ---
  if (input.examTomorrow) {
    for (const ac of activeChapters) {
      if (scheduled >= effectiveMinutes - TOLERANCE_MIN) break;
      if ((ac.uc.questions_remaining ?? 0) <= 0) continue;
      const rem = effectiveMinutes - scheduled; const min = Math.min(pyqMin, Math.max(15, rem)); if (min < 15) continue;
      const ps = computeTaskPriority("pyq", ac.subject, ac.chapter, chapterRank, recovery, input.examTomorrow);
      tasks.push({ title: `Backlog PYQs: ${ac.subject} — ${ac.chapter}`, subject: ac.subject, type: "pyq", estimated_minutes: min, priority: "high", chapter: ac.chapter, source: "backlog", priority_score: ps + 0.5, tracker_ref: { user_chapter_id: ac.uc.id, field: "questions_remaining", decrement: 1, progress_flag: "pyqsSolved" } });
      scheduled += min;
    }
  }

  // --- Phase 5: Active chapter lectures (to meet minimum daily target) ---
  for (const ac of activeChapters) {
    if (scheduled >= effectiveMinutes - TOLERANCE_MIN) break;
    if (lecturesPlaced >= minLectures) break;
    while ((ac.uc.lectures_remaining ?? 0) > 0 && scheduled + lecMin <= effectiveMinutes + TOLERANCE_MIN && lecturesPlaced < minLectures) {
      const ps = computeTaskPriority("lecture", ac.subject, ac.chapter, chapterRank, recovery, input.examTomorrow);
      tasks.push({ title: `Lecture: ${ac.subject} — ${ac.chapter}`, subject: ac.subject, type: "lecture", estimated_minutes: lecMin, priority: "high", chapter: ac.chapter, source: "active_chapter", priority_score: ps, tracker_ref: { user_chapter_id: ac.uc.id, field: "lectures_remaining", decrement: 1, progress_flag: "lectureCompleted" } });
      ac.uc.lectures_remaining = Math.max(0, (ac.uc.lectures_remaining ?? 0) - 1);
      scheduled += lecMin; lecturesPlaced++;
    }
  }

  // --- Phase 6: Remaining active chapter PYQs (non-backlog) ---
  for (const ac of activeChapters) {
    if (scheduled >= effectiveMinutes - TOLERANCE_MIN) break;
    if ((ac.uc.questions_remaining ?? 0) <= 0) continue;
    if (ac.backlogItem && ((ac.backlogItem.module_questions_remaining ?? 0) > 0 || (ac.backlogItem.pending_dpps ?? 0) > 0)) continue;
    const rem = effectiveMinutes - scheduled; const min = Math.min(pyqMin, Math.max(15, rem)); if (min < 15) continue;
    const ps = computeTaskPriority("pyq", ac.subject, ac.chapter, chapterRank, recovery, input.examTomorrow);
    tasks.push({ title: `PYQs: ${ac.subject} — ${ac.chapter}`, subject: ac.subject, type: "pyq", estimated_minutes: min, priority: "medium", chapter: ac.chapter, source: "active_chapter", priority_score: ps, tracker_ref: { user_chapter_id: ac.uc.id, field: "questions_remaining", decrement: 1, progress_flag: "pyqsSolved" } });
    scheduled += min;
  }

  // --- Break ---
  if (scheduled < effectiveMinutes) {
    tasks.push({ title: "Break", subject: null, type: "study", estimated_minutes: BREAK_MIN, priority: "low", chapter: null, source: "system", priority_score: 0, tracker_ref: null });
    scheduled += BREAK_MIN;
  }

  // --- Phase 7: Revision from active chapters ---
  for (const ac of activeChapters) {
    if (scheduled >= effectiveMinutes - TOLERANCE_MIN) break;
    while ((ac.uc.revision_pending ?? 0) > 0 && scheduled < effectiveMinutes - TOLERANCE_MIN) {
      const rem = effectiveMinutes - scheduled; const min = Math.min(revMin, Math.max(15, rem)); if (min < 15) break;
      const ps = computeTaskPriority("revision", ac.subject, ac.chapter, chapterRank, recovery, input.examTomorrow);
      tasks.push({ title: `Revision: ${ac.subject} — ${ac.chapter}`, subject: ac.subject, type: "revision", estimated_minutes: min, priority: "medium", chapter: ac.chapter, source: "active_chapter", priority_score: ps, tracker_ref: { user_chapter_id: ac.uc.id, field: "revision_pending", decrement: 1, progress_flag: "revision1" } });
      ac.uc.revision_pending = Math.max(0, (ac.uc.revision_pending ?? 0) - 1);
      scheduled += min; revisionCount++;
    }
  }

  // --- Phase 8: Spaced repetition revision block ---
  if (scheduled < effectiveMinutes - TOLERANCE_MIN && revisionCandidates.length > 0) {
    let revBudget = Math.min(revisionBlockMinutes, effectiveMinutes - scheduled);
    while (revBudget >= 15 && revisionCandidates.length > 0) {
      const cand = revisionCandidates.shift()!;
      const revMin2 = Math.min(revMin, revBudget);
      if (revMin2 < 15) break;
      const ps = computeTaskPriority("revision", cand.subject, cand.chapter, chapterRank, recovery, input.examTomorrow);
      tasks.push({ title: `Revision: ${cand.subject} — ${cand.chapter}`, subject: cand.subject, type: "revision", estimated_minutes: revMin2, priority: "medium", chapter: cand.chapter, source: "revision_engine", priority_score: ps, tracker_ref: null });
      scheduled += revMin2; revBudget -= revMin2; revisionCount++;
    }
  }

  // --- Phase 9: New chapters (only if no active chapters with work AND backlog under control) ---
  if (canAddNewChapters && scheduled < effectiveMinutes - TOLERANCE_MIN) {
    for (const nc of unstarted) {
      if (scheduled + lecMin > effectiveMinutes + TOLERANCE_MIN) break;
      const ps = computeTaskPriority("lecture", nc.subject, nc.chapter, chapterRank, recovery, input.examTomorrow);
      tasks.push({ title: `Lecture: ${nc.subject} — ${nc.chapter}`, subject: nc.subject, type: "lecture", estimated_minutes: lecMin, priority: "medium", chapter: nc.chapter, source: "new_chapter", priority_score: ps, tracker_ref: null });
      scheduled += lecMin; lecturesPlaced++;
    }
  }

  // --- Phase 10: Filler (active chapters only, never unstarted) ---
  if (scheduled < effectiveMinutes - TOLERANCE_MIN && activeChapters.length > 0) {
    let safety = 0;
    while (scheduled < effectiveMinutes - TOLERANCE_MIN && safety < 100) {
      safety++;
      const ac = activeChapters[safety % activeChapters.length];
      const rem = effectiveMinutes - scheduled;
      const fillMin = Math.min(defaultDuration("practice"), Math.max(15, rem));
      if (fillMin < 15) break;
      const ps = computeTaskPriority("practice", ac.subject, ac.chapter, chapterRank, recovery, input.examTomorrow);
      tasks.push({ title: `Practice: ${ac.subject} — ${ac.chapter}`, subject: ac.subject, type: "practice", estimated_minutes: fillMin, priority: "medium", chapter: ac.chapter, source: "filler", priority_score: ps, tracker_ref: null });
      scheduled += fillMin;
    }
  }

  // --- Buffer time ---
  if (bufferMinutes > 0 && scheduled < effectiveMinutes + bufferMinutes) {
    tasks.push({ title: "Buffer / flex time", subject: null, type: "study", estimated_minutes: Math.max(5, bufferMinutes), priority: "low", chapter: null, source: "system", priority_score: 0, tracker_ref: null });
    scheduled += Math.max(5, bufferMinutes);
  }

  // --- Fallback ---
  if (tasks.length <= 1) {
    const s = subjectNames[0] ?? "General Studies";
    tasks.push({ title: `Study session: ${s}`, subject: s, type: "study", estimated_minutes: Math.max(25, Math.min(120, effectiveMinutes)), priority: "medium", chapter: null, source: "fallback", priority_score: 3, tracker_ref: null });
    scheduled += tasks[tasks.length - 1].estimated_minutes;
    warnings.push("No active chapters with remaining work found. Generated a generic study session.");
  }

  // --- Sort by priority score (highest first) ---
  tasks.sort((a, b) => b.priority_score - a.priority_score);

  // --- Convert to PlanTask with time slots ---
  const byType: Record<string, number> = {}, bySubject: Record<string, number> = {};
  for (const t of tasks) {
    byType[t.type] = (byType[t.type] ?? 0) + 1;
    if (t.subject) bySubject[t.subject] = (bySubject[t.subject] ?? 0) + 1;
  }

  const base = new Date(`${date}T07:00:00`);
  let cursor = 0;
  const tasksOut: PlanTask[] = tasks.map((t) => {
    const start = fmtTime(base, cursor); cursor += t.estimated_minutes; const end = fmtTime(base, cursor);
    return {
      id: "", user_id: "", plan_id: null, title: t.title, subject: t.subject, type: t.type,
      estimated_minutes: t.estimated_minutes, priority: t.priority, completed: false,
      scheduled_date: date, created_at: "", start_time: start, end_time: end,
      chapter: t.chapter, source: t.source, tracker_ref: t.tracker_ref, completion_pct: 0,
      task_status: "pending" as TaskStatus, missed_count: 0, reschedule_reason: null,
      actual_minutes: null, priority_score: t.priority_score,
    };
  });

  const finishTime = fmtTime(base, cursor);
  const gap = adjustedMinutes - scheduled;
  const completionRate = recentCompleted.length > 0 ? recentCompleted.filter((t) => t.completed).length / recentCompleted.length : 0;
  const insight = generateInsight(burnout, completionRate, tasksOut.length, recoveryCount);

  const diagnostics: PlannerDiagnostics = {
    requestedMinutes, adjustedMinutes, scheduledMinutes: scheduled, gapMinutes: gap,
    taskCount: tasksOut.length, byType, bySubject, bufferMinutes, breakMinutes,
    recoveryTasksIncluded: recoveryCount, revisionTasksIncluded: revisionCount,
    burnout, motivationalInsight: insight, estimatedFinishTime: finishTime, warnings,
    dataChecks: { profile: !!profile.id, subjects: subjectNames.length > 0, chapters: chapterRows.length > 0, studyHours: requestedMinutes > 0, inputValid: v.valid },
  };

  console.info("[planner-v2] done", { scheduled, adjustedMinutes, tasks: tasksOut.length, recovery: recoveryCount, revision: revisionCount, burnout: burnout.level });
  return { tasks: tasksOut, diagnostics };
}

// --- Weekly / Monthly goal generation ---

export async function generateWeeklyGoal(profile: Profile): Promise<WeeklyGoal> {
  const examKey = aliasExamId(profile.target_exam ?? "");
  let subjects: SyllabusSubject[] = [], userChapters: UserChapter[] = [];
  let backlog: BacklogItem[] = [];
  try { subjects = await db.getSubjects(examKey); } catch {}
  try { userChapters = await db.getUserChapters(); } catch {}
  try { backlog = await db.getBacklogItems(); } catch {}

  const ranked = rankChapters(userChapters, backlog, [], profile);
  const targetChapters = ranked.filter((c) => c.status !== "completed" && c.status !== "mastered").slice(0, 5)
    .map((c) => ({ subject: c.subject, chapter: c.chapter }));
  const pool = categorizeBacklog(backlog);
  const studyHoursTarget = (profile.daily_goal_hours ?? 4) * 7 * 0.85;

  return {
    targetChapters,
    revisionGoals: Math.max(3, Math.ceil(userChapters.filter((u) => u.status === "in_progress" || u.status === "started").length * 0.5)),
    questionTargets: pool.pendingDpps + pool.pendingModuleQs + 20,
    backlogReduction: Math.ceil(pool.pendingLectures * 0.5),
    studyHoursTarget: Math.round(studyHoursTarget),
  };
}

export async function generateMonthlyGoal(profile: Profile): Promise<MonthlyGoal> {
  const examKey = aliasExamId(profile.target_exam ?? "");
  let subjects: SyllabusSubject[] = [], userChapters: UserChapter[] = [];
  let backlog: BacklogItem[] = [];
  try { subjects = await db.getSubjects(examKey); } catch {}
  try { userChapters = await db.getUserChapters(); } catch {}
  try { backlog = await db.getBacklogItems(); } catch {}

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
    try { await db.decrementBacklog(ref.backlog_id, ref.kind, 1); } catch (e) { console.error("[planner-v2.onTaskCompleted] backlog", e); }
  }
  if (ref?.recovery_id) {
    try { await db.markRecoveryRecovered(ref.recovery_id); } catch (e) { console.error("[planner-v2.onTaskCompleted] recovery", e); }
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
          if (ref.field === "lectures_remaining") patch.lectures_remaining = Math.max(0, (uc.lectures_remaining ?? 0) - (ref.decrement ?? 1));
          else if (ref.field === "questions_remaining") patch.questions_remaining = Math.max(0, (uc.questions_remaining ?? 0) - (ref.decrement ?? 1));
          else if (ref.field === "revision_pending") patch.revision_pending = Math.max(0, (uc.revision_pending ?? 0) - (ref.decrement ?? 1));
          if (Object.keys(progressPatch).length > 0) patch.progress = progressPatch;
          await db.updateUserChapterProgress(subject, chapter, patch as Partial<UserChapter> & { progress?: Record<string, unknown> });
          console.info("[planner-v2.onTaskCompleted] updated chapter", subject, chapter, patch);
        }
      }
    } catch (e) { console.error("[planner-v2.onTaskCompleted] chapter update", e); }
  }
  try { await updateStudyStats(); } catch (e) { console.error("[planner-v2.onTaskCompleted] stats", e); }
}

export async function onTaskStatusChange(task: PlanTask, newStatus: TaskStatus, actualMinutes?: number): Promise<void> {
  if (task.id) {
    try { await db.setTaskStatus(task.id, newStatus, actualMinutes); } catch (e) { console.error("[planner-v2.onTaskStatusChange]", e); }
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
      } catch (e) { console.error("[planner-v2.onTaskStatusChange] recovery", e); }
    }
  }
}

// --- Missed task engine: call at end of day or on new plan generation ---

export async function processMissedTasks(date: string): Promise<number> {
  return moveMissedTasksToRecovery(date);
}

export function describeDiagnostics(d: PlannerDiagnostics): string {
  const lines = [
    `Requested ${d.requestedMinutes} min · Adjusted ${d.adjustedMinutes} min · Scheduled ${d.scheduledMinutes} min`,
    `Buffer ${d.bufferMinutes} min · Breaks ${d.breakMinutes} min · Gap ${d.gapMinutes} min`,
    `Tasks: ${d.taskCount} | Recovery: ${d.recoveryTasksIncluded} | Revision: ${d.revisionTasksIncluded}`,
    `Burnout: ${d.burnout.level} | ETA: ${d.estimatedFinishTime}`,
    `Checks: profile=${d.dataChecks.profile} subjects=${d.dataChecks.subjects} chapters=${d.dataChecks.chapters} hours=${d.dataChecks.studyHours}`,
  ];
  if (d.burnout.reasons.length > 0) lines.push(`Burnout reasons: ${d.burnout.reasons.join("; ")}`);
  if (d.warnings.length > 0) lines.push(`Warnings: ${d.warnings.join("; ")}`);
  return lines.join("\n");
}

export { TASK_TYPE_LABELS, TOLERANCE_MIN };
