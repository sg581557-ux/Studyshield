import { db, aliasExamId } from "./db";
import { TASK_TYPE_LABELS } from "../lib/constants";
import type {
  BacklogItem, EnergyLevel, PlanTask, Priority, Profile, BacklogKind,
  SyllabusSubject, SyllabusChapter, UserChapter, Formula,
} from "../lib/types";

const JEE_SUBJECTS_FALLBACK = ["Physics", "Chemistry", "Mathematics"];

export interface PlannerInput {
  profile: Profile;
  studyHours: number;
  energyLevel: EnergyLevel;
  wasSchoolDay: boolean;
  examTomorrow: boolean;
  date: string;
}

export interface PlannerDiagnostics {
  requestedMinutes: number;
  scheduledMinutes: number;
  gapMinutes: number;
  taskCount: number;
  byType: Record<string, number>;
  bySubject: Record<string, number>;
  lectures: number;
  dpps: number;
  modules: number;
  pendingLectures: number;
  pendingDpps: number;
  pendingModuleQs: number;
  targetMet: boolean;
  warnings: string[];
  dataChecks: { profile: boolean; subjects: boolean; chapters: boolean; studyHours: boolean; inputValid: boolean };
}

export interface PlannerResult {
  tasks: PlanTask[];
  diagnostics: PlannerDiagnostics;
}

// Internal planned-task shape — NO id, user_id, or created_at (DB defaults those).
interface PlannedTask {
  title: string;
  subject: string | null;
  type: string;
  estimated_minutes: number;
  priority: Priority;
  chapter: string | null;
  source: string;
  tracker_ref: { backlog_id: string; kind: BacklogKind; auto_decrement: true } | null;
}

export class PlannerError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "PlannerError";
  }
}

const DEFAULT_LECTURE_MIN = 120;
const DEFAULT_DPP_MIN = 30;
const DEFAULT_MODULE_MIN = 45;
const DEFAULT_PYQ_MIN = 45;
const DEFAULT_REVISION_MIN = 25;
const DEFAULT_FORMULA_MIN = 20;
const DEFAULT_PRACTICE_MIN = 45;
const DEFAULT_MOCK_REVIEW_MIN = 30;
const TOLERANCE_MIN = 10;

function lectureMinutes(profile: Profile): number {
  const configured = profile?.lecture_duration_min;
  if (configured && configured > 0) return configured;
  return DEFAULT_LECTURE_MIN;
}

function fmtTime(base: Date, minutesFromBase: number): string {
  const d = new Date(base.getTime() + minutesFromBase * 60000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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

function pick<T>(arr: T[], i: number): T | null { return arr.length === 0 ? null : arr[i % arr.length]; }

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

interface FillerCtx {
  subjects: string[]; weak: { subject: string; chapter: string }[]; revision: { subject: string; chapter: string }[];
  unstarted: { subject: string; chapter: string }[]; formulas: Formula[]; rotationIndex: number;
}

const FILLER_QUEUE: { type: string; minutes: number; build: (ctx: FillerCtx) => Omit<PlannedTask, "type" | "estimated_minutes"> | null }[] = [
  { type: "revision", minutes: DEFAULT_REVISION_MIN, build: (c) => {
    const t = pick(c.revision, c.rotationIndex) ?? pick(c.weak, c.rotationIndex) ?? pick(c.unstarted, c.rotationIndex);
    const s = t?.subject ?? pick(c.subjects, c.rotationIndex); if (!s) return null;
    return { title: `Revision: ${s}${t?.chapter ? ` — ${t.chapter}` : ""}`, subject: s, priority: "medium", chapter: t?.chapter ?? null, source: "filler", tracker_ref: null };
  }},
  { type: "spaced_revision", minutes: DEFAULT_REVISION_MIN, build: (c) => {
    const t = pick(c.weak, c.rotationIndex) ?? pick(c.revision, c.rotationIndex);
    const s = t?.subject ?? pick(c.subjects, c.rotationIndex); if (!s) return null;
    return { title: `Weak chapter: ${s}${t?.chapter ? ` — ${t.chapter}` : ""}`, subject: s, priority: "high", chapter: t?.chapter ?? null, source: "filler", tracker_ref: null };
  }},
  { type: "pyq", minutes: DEFAULT_PYQ_MIN, build: (c) => {
    const s = pick(c.subjects, c.rotationIndex); if (!s) return null;
    const t = pick(c.weak, c.rotationIndex) ?? pick(c.unstarted, c.rotationIndex);
    return { title: `PYQs: ${s}${t?.chapter ? ` — ${t.chapter}` : ""}`, subject: s, priority: "high", chapter: t?.chapter ?? null, source: "filler", tracker_ref: null };
  }},
  { type: "module", minutes: DEFAULT_MODULE_MIN, build: (c) => {
    const t = pick(c.weak, c.rotationIndex) ?? pick(c.unstarted, c.rotationIndex);
    const s = t?.subject ?? pick(c.subjects, c.rotationIndex); if (!s) return null;
    return { title: `Module questions: ${s}${t?.chapter ? ` — ${t.chapter}` : ""}`, subject: s, priority: "medium", chapter: t?.chapter ?? null, source: "filler", tracker_ref: null };
  }},
  { type: "formula_revision", minutes: DEFAULT_FORMULA_MIN, build: (c) => {
    const f = pick(c.formulas, c.rotationIndex);
    if (f) return { title: `Formula revision: ${f.subject} — ${f.name}`, subject: f.subject, priority: "low", chapter: f.chapter ?? null, source: "filler", tracker_ref: null };
    const s = pick(c.subjects, c.rotationIndex); if (!s) return null;
    return { title: `Formula revision: ${s}`, subject: s, priority: "low", chapter: null, source: "filler", tracker_ref: null };
  }},
  { type: "practice", minutes: DEFAULT_PRACTICE_MIN, build: (c) => {
    const t = pick(c.unstarted, c.rotationIndex) ?? pick(c.weak, c.rotationIndex);
    const s = t?.subject ?? pick(c.subjects, c.rotationIndex); if (!s) return null;
    return { title: `Practice questions: ${s}${t?.chapter ? ` — ${t.chapter}` : ""}`, subject: s, priority: "medium", chapter: t?.chapter ?? null, source: "filler", tracker_ref: null };
  }},
  { type: "mock_test_review", minutes: DEFAULT_MOCK_REVIEW_MIN, build: (c) => {
    const s = pick(c.subjects, c.rotationIndex); if (!s) return null;
    return { title: `Mock test review: ${s}`, subject: s, priority: "medium", chapter: null, source: "filler", tracker_ref: null };
  }},
];

function nextFillerTask(ctx: FillerCtx, remaining: number): PlannedTask | null {
  if (remaining < 15) return null;
  const start = ctx.rotationIndex % FILLER_QUEUE.length;
  for (let off = 0; off < FILLER_QUEUE.length; off++) {
    const e = FILLER_QUEUE[(start + off) % FILLER_QUEUE.length];
    const min = Math.min(e.minutes, remaining); if (min < 15) continue;
    const base = e.build(ctx); if (!base) continue;
    return { ...base, type: e.type, estimated_minutes: min };
  }
  return null;
}

function buildCoaching(profile: Profile, date: string): PlannedTask[] {
  if (!profile.coaching_enabled || !profile.coaching_days?.length) return [];
  const wd = new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
  if (!profile.coaching_days.includes(wd)) return [];
  const [sh, sm] = (profile.coaching_start ?? "16:00").split(":").map(Number);
  const [eh, em] = (profile.coaching_end ?? "19:00").split(":").map(Number);
  return [{ title: `Coaching: ${profile.coaching_name || "Online class"}`, subject: null, type: "coaching", estimated_minutes: Math.max(30, (eh*60+em)-(sh*60+sm)), priority: "high", chapter: null, source: "coaching", tracker_ref: null }];
}

function computeMinLectures(profile: Profile, pool: BacklogPool): number {
  if (!profile.coaching_enabled) return pool.pendingLectures > 0 ? Math.max(1, Math.ceil(pool.pendingLectures / 2)) : 0;
  return 2 + (pool.pendingLectures > 0 ? Math.ceil(pool.pendingLectures / 3) : 0);
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
  if (!v.valid) { console.error("[planner] validation failed:", v.errors); throw new PlannerError("INVALID_INPUT", `Cannot generate plan: ${v.errors.join(" ")}`); }

  const { profile, studyHours, date } = input;
  const requestedMinutes = Math.max(0, Math.round(studyHours * 60));
  console.info("[planner] start", { userId: profile.id, studyHours, requestedMinutes, date });

  const examKey = aliasExamId(profile.target_exam ?? "");
  let subjects: SyllabusSubject[] = [], chapterRows: SyllabusChapter[] = [], userChapters: UserChapter[] = [], backlog: BacklogItem[] = [], formulas: Formula[] = [];

  try { subjects = await db.getSubjects(examKey); if (subjects.length === 0) { warnings.push(`No subjects for exam "${examKey}".`); console.warn("[planner] no subjects for", examKey); } }
  catch (e) { console.error("[planner] getSubjects threw", e); warnings.push("Failed to load subjects."); }

  if (subjects.length > 0) {
    try { chapterRows = (await Promise.all(subjects.map((s) => db.getChapters(s.id).catch((e) => { console.error(`[planner] getChapters(${s.id}) threw`, e); return [] as SyllabusChapter[]; })))).flat(); }
    catch (e) { console.error("[planner] chapter loading threw", e); warnings.push("Failed to load chapters."); }
  }
  try { userChapters = await db.getUserChapters(); } catch (e) { console.error("[planner] getUserChapters threw", e); warnings.push("Failed to load chapter progress."); }
  try { backlog = await db.getBacklogItems(profile.target_exam); } catch (e) { console.error("[planner] getBacklogItems threw", e); warnings.push("Failed to load backlog."); }
  try { formulas = await db.getFormulasForExam(examKey); } catch (e) { console.error("[planner] getFormulasForExam threw", e); }

  const subjectNames = subjects.length > 0 ? subjects.map((s) => s.name) : JEE_SUBJECTS_FALLBACK.slice();
  const pool = categorizeBacklog(backlog);
  const weak = weakChapters(userChapters), revision = chaptersForRevision(userChapters), unstarted = unstartedChapters(subjects, chapterRows, userChapters);
  const dataChecks = { profile: !!profile.id, subjects: subjectNames.length > 0, chapters: chapterRows.length > 0, studyHours: requestedMinutes > 0, inputValid: v.valid };

  console.info("[planner] data", { subjects: subjectNames.length, chapters: chapterRows.length, userChapters: userChapters.length, backlog: backlog.length, pool: { lec: pool.pendingLectures, dpp: pool.pendingDpps, mod: pool.pendingModuleQs }, weak: weak.length, revision: revision.length, unstarted: unstarted.length });

  const tasks: PlannedTask[] = [];
  let scheduled = 0;

  try { for (const t of buildCoaching(profile, date)) { if (scheduled + t.estimated_minutes > requestedMinutes + TOLERANCE_MIN) continue; tasks.push(t); scheduled += t.estimated_minutes; } }
  catch (e) { console.error("[planner] coaching threw", e); }

  const lecMin = lectureMinutes(profile), minLectures = computeMinLectures(profile, pool);
  let lecPlaced = 0;
  try {
    while (scheduled + lecMin <= requestedMinutes + TOLERANCE_MIN && lecPlaced < minLectures) {
      const b = nextBacklogLecture(pool);
      if (b) {
        tasks.push({ title: `Backlog lecture: ${b.subject ?? ""} ${b.chapter ? `— ${b.chapter}` : ""}`.trim(), subject: b.subject ?? null, type: "lecture", estimated_minutes: lecMin, priority: "high", chapter: b.chapter ?? null, source: "backlog", tracker_ref: { backlog_id: b.id, kind: "lecture", auto_decrement: true } });
        b.pending_lectures = Math.max(0, (b.pending_lectures ?? 0) - 1);
      } else {
        const t = pick(weak, lecPlaced) ?? pick(unstarted, lecPlaced);
        const s = t?.subject ?? pick(subjectNames, lecPlaced)!;
        tasks.push({ title: `Lecture: ${s}${t?.chapter ? ` — ${t.chapter}` : ""}`, subject: s, type: "lecture", estimated_minutes: lecMin, priority: "high", chapter: t?.chapter ?? null, source: "syllabus", tracker_ref: null });
      }
      scheduled += lecMin; lecPlaced++;
    }
  } catch (e) { console.error("[planner] lectures threw", e); }

  try {
    while (scheduled < requestedMinutes - TOLERANCE_MIN) {
      const b = nextBacklogDpp(pool); if (!b) break;
      const rem = requestedMinutes - scheduled; const min = Math.min(DEFAULT_DPP_MIN, Math.max(15, rem)); if (min < 15) break;
      b.pending_dpps = Math.max(0, (b.pending_dpps ?? 0) - 1);
      tasks.push({ title: `DPP: ${b.subject ?? ""} ${b.chapter ? `— ${b.chapter}` : ""}`.trim(), subject: b.subject ?? null, type: "dpp", estimated_minutes: min, priority: "high", chapter: b.chapter ?? null, source: "backlog", tracker_ref: { backlog_id: b.id, kind: "dpp", auto_decrement: true } });
      scheduled += min;
    }
  } catch (e) { console.error("[planner] dpps threw", e); }

  try {
    while (scheduled < requestedMinutes - TOLERANCE_MIN) {
      const b = nextBacklogModule(pool); if (!b) break;
      const rem = requestedMinutes - scheduled; const min = Math.min(DEFAULT_MODULE_MIN, Math.max(15, rem)); if (min < 15) break;
      b.module_questions_remaining = Math.max(0, (b.module_questions_remaining ?? 0) - 1);
      tasks.push({ title: `Module: ${b.subject ?? ""} ${b.chapter ? `— ${b.chapter}` : ""}`.trim(), subject: b.subject ?? null, type: "module", estimated_minutes: min, priority: "high", chapter: b.chapter ?? null, source: "backlog", tracker_ref: { backlog_id: b.id, kind: "module", auto_decrement: true } });
      scheduled += min;
    }
  } catch (e) { console.error("[planner] modules threw", e); }

  const fctx: FillerCtx = { subjects: subjectNames, weak, revision, unstarted, formulas, rotationIndex: 0 };
  let safety = 0;
  while (scheduled < requestedMinutes - TOLERANCE_MIN && safety < 200) {
    safety++;
    const rem = requestedMinutes - scheduled;
    fctx.rotationIndex = safety - 1;
    let t: PlannedTask | null = null;
    try { t = nextFillerTask(fctx, rem); } catch (e) { console.error("[planner] filler threw", e); }
    if (!t) { const min = Math.min(DEFAULT_REVISION_MIN, Math.max(15, rem)); const s = pick(subjectNames, safety) ?? subjectNames[0]; t = { title: `Study session: ${s}`, subject: s, type: "study", estimated_minutes: min, priority: "low", chapter: null, source: "filler", tracker_ref: null }; }
    tasks.push(t); scheduled += t.estimated_minutes;
  }

  if (tasks.length === 0) {
    const s = subjectNames[0] ?? "General Studies";
    const min = Math.max(25, Math.min(DEFAULT_LECTURE_MIN, requestedMinutes || 60));
    tasks.push({ title: `Study session: ${s}`, subject: s, type: "study", estimated_minutes: min, priority: "medium", chapter: null, source: "fallback", tracker_ref: null });
    scheduled += min;
    warnings.push("Generated a minimal fallback study session.");
  }

  const byType: Record<string, number> = {}, bySubject: Record<string, number> = {};
  let lec = 0, dpp = 0, mod = 0;
  for (const t of tasks) {
    byType[t.type] = (byType[t.type] ?? 0) + 1;
    if (t.subject) bySubject[t.subject] = (bySubject[t.subject] ?? 0) + 1;
    if (t.type === "lecture") lec++; if (t.type === "dpp") dpp++; if (t.type === "module") mod++;
  }

  const gap = requestedMinutes - scheduled;
  // Convert to PlanTask, but DO NOT set id/user_id/created_at — DB defaults those (id is uuid).
  const tasksOut: PlanTask[] = [];
  const base = new Date(`${date}T07:00:00`);
  let cursor = 0;
  for (const t of tasks) {
    const start = fmtTime(base, cursor); cursor += t.estimated_minutes; const end = fmtTime(base, cursor);
    tasksOut.push({
      id: "", user_id: "", plan_id: null, title: t.title, subject: t.subject, type: t.type,
      estimated_minutes: t.estimated_minutes, priority: t.priority, completed: false,
      scheduled_date: date, created_at: "", start_time: start, end_time: end,
      chapter: t.chapter, source: t.source, tracker_ref: t.tracker_ref, completion_pct: 0,
      task_status: "pending", missed_count: 0, reschedule_reason: null,
      actual_minutes: null, priority_score: 0,
    });
  }

  const diagnostics: PlannerDiagnostics = {
    requestedMinutes, scheduledMinutes: scheduled, gapMinutes: gap, taskCount: tasksOut.length,
    byType, bySubject, lectures: lec, dpps: dpp, modules: mod,
    pendingLectures: pool.pendingLectures, pendingDpps: pool.pendingDpps, pendingModuleQs: pool.pendingModuleQs,
    targetMet: Math.abs(gap) <= TOLERANCE_MIN, warnings, dataChecks,
  };
  console.info("[planner] done", { requestedMinutes, scheduled, gap, tasks: tasksOut.length, targetMet: diagnostics.targetMet });
  return { tasks: tasksOut, diagnostics };
}

export async function onTaskCompleted(task: PlanTask): Promise<void> {
  const ref = task.tracker_ref as { backlog_id?: string; kind?: BacklogKind; auto_decrement?: boolean } | null;
  if (!ref?.backlog_id || !ref.kind || !ref.auto_decrement) return;
  try { await db.decrementBacklog(ref.backlog_id, ref.kind, 1); }
  catch (e) { console.error("[planner.onTaskCompleted] threw", e); }
}

export function describeDiagnostics(d: PlannerDiagnostics): string {
  const lines = [
    `Requested ${d.requestedMinutes} min · Scheduled ${d.scheduledMinutes} min · Gap ${d.gapMinutes} min`,
    `Tasks: ${d.taskCount} | Lectures ${d.lectures} · DPPs ${d.dpps} · Modules ${d.modules}`,
    `Backlog pending: lectures ${d.pendingLectures}, dpps ${d.pendingDpps}, module Qs ${d.pendingModuleQs}`,
    `Checks: profile=${d.dataChecks.profile} subjects=${d.dataChecks.subjects} chapters=${d.dataChecks.chapters} hours=${d.dataChecks.studyHours}`,
  ];
  if (d.warnings.length > 0) lines.push(`Warnings: ${d.warnings.join("; ")}`);
  return lines.join("\n");
}

export { TASK_TYPE_LABELS, TOLERANCE_MIN };
