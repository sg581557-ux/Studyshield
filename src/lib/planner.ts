import type {
  Task, Subject, Chapter, User, OnboardingProfile, CoachingSchedule,
  SchoolSchedule, PlanResult, TaskType, Priority, ID,
} from "./types";
import {
  uid, WEEKDAYS, DEFAULT_LECTURE_DURATION_MIN, DEFAULT_REVISION_DURATION_MIN,
  DEFAULT_DPP_DURATION_MIN, DEFAULT_MODULE_DURATION_MIN, DEFAULT_PYQ_DURATION_MIN,
  DEFAULT_FORMULA_REVISION_DURATION_MIN, SPACED_REVISION_DAYS, TASK_TYPE_DURATIONS_MIN,
} from "./constants";

const nowISO = () => new Date().toISOString();
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addMinutes = (d: Date, min: number) => new Date(d.getTime() + min * 60000);
const weekdayName = (d: Date) => WEEKDAYS[(d.getDay() + 6) % 7];

interface PlannedBlock {
  start: Date;
  end: Date;
  task: Task;
}

function overlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Builds the coaching schedule blocks for a given date.
 * Coaching is highest priority — nothing else is scheduled during class time.
 * Each lecture defaults to 2 hours (DEFAULT_LECTURE_DURATION_MIN) unless
 * the user specified a custom lectureDurationMin.
 */
function buildCoachingBlocks(date: Date, coaching: CoachingSchedule, subjects: Subject[]): PlannedBlock[] {
  if (!coaching.enabled) return [];
  const wd = weekdayName(date);
  if (!coaching.days.includes(wd)) return [];
  const [sh, sm] = coaching.startTime.split(":").map(Number);
  const [eh, em] = coaching.endTime.split(":").map(Number);
  if (isNaN(sh) || isNaN(eh)) return [];
  const dayStart = startOfDay(date);
  const windowStart = new Date(dayStart); windowStart.setHours(sh, sm, 0, 0);
  const windowEnd = new Date(dayStart); windowEnd.setHours(eh, em, 0, 0);
  if (windowEnd <= windowStart) return [];

  const lectureLen = coaching.lectureDurationMin > 0 ? coaching.lectureDurationMin : DEFAULT_LECTURE_DURATION_MIN;
  const blocks: PlannedBlock[] = [];
  let cursor = new Date(windowStart);
  let lectureIdx = 0;
  const subjPool = subjects.length > 0 ? subjects : [];
  while (cursor.getTime() + lectureLen <= windowEnd.getTime()) {
    const end = addMinutes(cursor, lectureLen);
    const subj = subjPool.length > 0 ? subjPool[lectureIdx % subjPool.length] : null;
    const task: Task = {
      id: uid("task"), title: `${subj?.name ?? "Coaching"} Lecture`, subjectId: subj?.id ?? null,
      chapterId: null, type: coaching.isLive ? "coaching_live" : "coaching_recorded",
      priority: "high", status: "pending", deadline: end.toISOString(),
      estimatedMinutes: lectureLen, completedAt: null, scheduledDate: dayKey(date),
      order: 0, source: "coaching",
    };
    blocks.push({ start: new Date(cursor), end, task });
    cursor = new Date(end);
    lectureIdx++;
  }
  return blocks;
}

function buildSchoolBlocks(date: Date, school: SchoolSchedule): PlannedBlock[] {
  if (!school.enabled) return [];
  const wd = weekdayName(date);
  if (!school.days.includes(wd)) return [];
  const [sh, sm] = school.startTime.split(":").map(Number);
  const [eh, em] = school.endTime.split(":").map(Number);
  if (isNaN(sh) || isNaN(eh)) return [];
  const dayStart = startOfDay(date);
  const start = new Date(dayStart); start.setHours(sh, sm, 0, 0);
  const end = new Date(dayStart); end.setHours(eh, em, 0, 0);
  if (end <= start) return [];
  // Represent school as a single unavailable block (no task, but blocks time).
  const blockTask: Task = {
    id: uid("task"), title: "School", subjectId: null, chapterId: null, type: "break",
    priority: "low", status: "pending", deadline: end.toISOString(),
    estimatedMinutes: Math.round((end.getTime() - start.getTime()) / 60000),
    completedAt: null, scheduledDate: dayKey(date), order: 0, source: "manual",
  };
  return [{ start, end, task: blockTask }];
}

function buildSleepBlock(date: Date, profile: OnboardingProfile | null): PlannedBlock[] | null {
  if (!profile) return null;
  const sleepT = profile.sleepTime || "23:00";
  const wakeT = profile.wakeTime || "06:00";
  const [sh, sm] = sleepT.split(":").map(Number);
  const [wh, wm] = wakeT.split(":").map(Number);
  if (isNaN(sh) || isNaN(wh)) return null;
  const dayStart = startOfDay(date);
  const sleepStart = new Date(dayStart); sleepStart.setHours(sh, sm, 0, 0);
  let sleepEnd = new Date(dayStart); sleepEnd.setHours(wh, wm, 0, 0);
  if (sleepEnd <= sleepStart) sleepEnd = addMinutes(sleepEnd, 24 * 60);
  return null; // sleep handled as availability window, not explicit block
}

function availabilityStart(date: Date, profile: OnboardingProfile | null): Date {
  if (!profile || !profile.wakeTime) {
    const d = startOfDay(date); d.setHours(6, 0, 0, 0); return d;
  }
  const [h, m] = profile.wakeTime.split(":").map(Number);
  const d = startOfDay(date); d.setHours(h || 6, m || 0, 0, 0); return d;
}

function availabilityEnd(date: Date, profile: OnboardingProfile | null): Date {
  if (!profile || !profile.sleepTime) {
    const d = startOfDay(date); d.setHours(23, 0, 0, 0); return d;
  }
  const [h, m] = profile.sleepTime.split(":").map(Number);
  const d = startOfDay(date); d.setHours(h || 23, m || 0, 0, 0); return d;
}

function rankOfType(type: TaskType): number {
  const order: TaskType[] = [
    "coaching_live", "coaching_missed", "lecture_revision", "general_revision",
    "dpp", "module", "pyq", "formula_revision", "mock", "spaced_revision",
    "coaching_recorded", "study", "practice", "break",
  ];
  return order.indexOf(type);
}

/**
 * Builds spaced-revision tasks for chapters that were revised on past dates.
 * Revision cycle: Day 1, 3, 7, 15, 30. Missed revisions auto-reschedule.
 */
function buildSpacedRevisions(date: Date, chapters: Chapter[], subjects: Subject[], existing: Task[]): Task[] {
  const today = startOfDay(date);
  const revisions: Task[] = [];
  chapters.forEach((ch) => {
    if (!ch.lastRevisedAt) return;
    const lastRevised = new Date(ch.lastRevisedAt);
    SPACED_REVISION_DAYS.forEach((dayOffset, idx) => {
      const dueDate = addMinutes(lastRevised, dayOffset * 24 * 60);
      if (isSameDay(dueDate, today) || dueDate < today) {
        const already = existing.some(
          (t) => t.type === "spaced_revision" && t.chapterId === ch.id && t.revisionDay === dayOffset,
        );
        if (already) return;
        const subj = subjects.find((s) => s.id === ch.subjectId);
        revisions.push({
          id: uid("task"),
          title: `Spaced Revision: ${ch.name} (D${dayOffset})`,
          subjectId: ch.subjectId, chapterId: ch.id, type: "spaced_revision",
          priority: idx >= 2 ? "high" : "medium", status: "pending",
          deadline: dueDate.toISOString(),
          estimatedMinutes: DEFAULT_REVISION_DURATION_MIN,
          completedAt: null, scheduledDate: dayKey(date), order: 0,
          source: "spaced", revisionDay: dayOffset,
        });
      }
    });
  });
  return revisions;
}

/**
 * Collects pending backlog tasks (missed tasks, pending DPP, weak chapters, PYQs).
 * Auto-reschedules unfinished past tasks to today.
 */
function collectBacklog(date: Date, tasks: Task[], chapters: Chapter[], subjects: Subject[]): { backlog: Task[]; rescheduled: number } {
  const today = startOfDay(date);
  const backlog: Task[] = [];
  let rescheduled = 0;
  tasks.forEach((t) => {
    if (t.status === "completed" || t.status === "skipped") return;
    const due = t.deadline ? new Date(t.deadline) : null;
    const sched = t.scheduledDate ? new Date(t.scheduledDate + "T00:00:00") : null;
    const ref = due || sched;
    if (ref && ref < today && t.status === "pending") {
      rescheduled++;
      backlog.push({ ...t, scheduledDate: dayKey(date), deadline: new Date(today.getTime() + 23 * 3600000 + 5900000).toISOString() });
    } else if (t.status === "pending" && (!ref || isSameDay(ref, today))) {
      backlog.push(t);
    }
  });
  // Weak chapters → revision tasks
  chapters.filter((c) => c.isWeak || c.completion < 50).slice(0, 4).forEach((c) => {
    const subj = subjects.find((s) => s.id === c.subjectId);
    backlog.push({
      id: uid("task"), title: `Revise: ${c.name} (Weak)`, subjectId: c.subjectId, chapterId: c.id,
      type: "general_revision", priority: "high", status: "pending",
      deadline: new Date(today.getTime() + 23 * 3600000).toISOString(),
      estimatedMinutes: DEFAULT_REVISION_DURATION_MIN, completedAt: null,
      scheduledDate: dayKey(date), order: 0, source: "planner",
    });
  });
  return { backlog, rescheduled };
}

/**
 * Generates starter study blocks from the user's selected subjects when no
 * backlog exists. Fills the remaining capacity with a balanced mix.
 */
function buildStarterBlocks(subjects: Subject[], profile: OnboardingProfile | null, capacityMin: number, date: Date): Task[] {
  const selectedNames = profile?.subjects?.length ? profile.subjects : [];
  const weakNames = profile?.weakSubjects ?? [];
  let pool = selectedNames.length > 0
    ? subjects.filter((s) => selectedNames.includes(s.name))
    : subjects;
  if (pool.length === 0) pool = subjects;
  if (pool.length === 0) return [];

  pool = [...pool].sort((a, b) => {
    const aw = weakNames.includes(a.name) ? 0 : 1;
    const bw = weakNames.includes(b.name) ? 0 : 1;
    return aw - bw;
  });

  // Balanced mix ratios
  const mix: { type: TaskType; ratio: number; label: (s: Subject) => string }[] = [
    { type: "general_revision", ratio: 0.25, label: (s) => `Revise ${s.name}` },
    { type: "pyq", ratio: 0.2, label: (s) => `${s.name} PYQ Practice` },
    { type: "dpp", ratio: 0.2, label: (s) => `${s.name} DPP` },
    { type: "study", ratio: 0.25, label: (s) => `Study ${s.name}` },
    { type: "practice", ratio: 0.1, label: (s) => `${s.name} Practice` },
  ];

  const tasks: Task[] = [];
  let remaining = capacityMin;
  let subjIdx = 0;
  let blockIdx = 0;
  while (remaining >= 20) {
    const item = mix[blockIdx % mix.length];
    const dur = Math.min(TASK_TYPE_DURATIONS_MIN[item.type] || 45, remaining);
    if (dur < 20) break;
    const subj = pool[subjIdx % pool.length];
    tasks.push({
      id: uid("task"), title: item.label(subj), subjectId: subj.id, chapterId: null,
      type: item.type, priority: item.type === "general_revision" ? "high" : "medium",
      status: "pending", deadline: new Date(date.getTime() + 23 * 3600000).toISOString(),
      estimatedMinutes: dur, completedAt: null, scheduledDate: dayKey(date), order: 0,
      source: "planner", generated: true,
    });
    remaining -= dur;
    subjIdx++;
    blockIdx++;
  }
  return tasks;
}

/**
 * The post-lecture sequence: after each coaching lecture, schedule
 * Lecture Revision → DPP → Module → PYQ → Formula Revision.
 * Each is only added if capacity remains.
 */
function buildPostLectureSequence(subjectId: ID | null, date: Date, blocks: PlannedBlock[]): PlannedBlock[] {
  const seq: { type: TaskType; minutes: number; label: string; priority: Priority }[] = [
    { type: "lecture_revision", minutes: DEFAULT_REVISION_DURATION_MIN, label: "Lecture Revision", priority: "high" },
    { type: "dpp", minutes: DEFAULT_DPP_DURATION_MIN, label: "DPP", priority: "medium" },
    { type: "module", minutes: DEFAULT_MODULE_DURATION_MIN, label: "Module Questions", priority: "medium" },
    { type: "pyq", minutes: DEFAULT_PYQ_DURATION_MIN, label: "PYQ Practice", priority: "medium" },
    { type: "formula_revision", minutes: DEFAULT_FORMULA_REVISION_DURATION_MIN, label: "Formula Revision", priority: "low" },
  ];
  const result: PlannedBlock[] = [];
  const lastLecture = [...blocks].reverse().find((b) => b.task.type === "coaching_live" || b.task.type === "coaching_recorded");
  if (!lastLecture) return result;
  let cursor = new Date(lastLecture.end);
  const dayEnd = availabilityEnd(date, null);
  for (const item of seq) {
    if (cursor.getTime() + item.minutes * 60000 > dayEnd.getTime()) break;
    const end = addMinutes(cursor, item.minutes);
    const task: Task = {
      id: uid("task"), title: item.label, subjectId, chapterId: null,
      type: item.type, priority: item.priority, status: "pending",
      deadline: end.toISOString(), estimatedMinutes: item.minutes,
      completedAt: null, scheduledDate: dayKey(date), order: 0, source: "planner",
    };
    result.push({ start: new Date(cursor), end, task });
    cursor = new Date(end);
  }
  return result;
}

/**
 * MAIN: generatePlan
 *
 * hardLimitHours is a HARD LIMIT — the planner will schedule approximately
 * that many hours of study and will NEVER reduce it automatically.
 * If hardLimitHours > 0 and subjects exist, the plan is NEVER empty.
 *
 * Priority order enforced:
 *   1. Live Coaching Classes
 *   2. Missed Classes
 *   3. Lecture Revision
 *   4. Weak Chapters (general revision)
 *   5. Pending DPP
 *   6. Module Questions
 *   7. PYQs
 *   8. Formula Revision
 *   9. Mock Test
 *  10. General Revision / Spaced Revision
 *
 * No two tasks overlap in time. School, coaching, and sleep windows are respected.
 */
export function generatePlan(
  existingTasks: Task[],
  chapters: Chapter[],
  subjects: Subject[],
  user: User | null,
  hardLimitHours: number,
  date: Date = new Date(),
): PlanResult {
  // --- Validation ---
  if (hardLimitHours <= 0) {
    return { tasks: [], rescheduledCount: 0, generated: false, totalMinutes: 0, hardLimitMinutes: 0, coachingCount: 0, message: "No study hours requested." };
  }
  const profile = user?.profile ?? null;
  const hardLimitMin = Math.round(hardLimitHours * 60);

  const coachingBlocks = buildCoachingBlocks(date, profile?.coaching ?? { enabled: false, name: "", days: [], startTime: "09:00", endTime: "12:00", lectureDurationMin: DEFAULT_LECTURE_DURATION_MIN, isLive: true, revisionTime: "evening" }, subjects);
  const schoolBlocks = buildSchoolBlocks(date, profile?.school ?? { enabled: false, days: [], startTime: "08:00", endTime: "15:00" });
  buildSleepBlock(date, profile);

  const postLecture = buildPostLectureSequence(coachingBlocks[0]?.task.subjectId ?? null, date, coachingBlocks);

  const { backlog, rescheduled } = collectBacklog(date, existingTasks, chapters, subjects);
  const spaced = buildSpacedRevisions(date, chapters, subjects, existingTasks);

  // Merge all candidate tasks, sort by priority rank
  const allCandidates: Task[] = [...coachingBlocks.map((b) => b.task), ...postLecture.map((b) => b.task), ...backlog, ...spaced];
  allCandidates.sort((a, b) => rankOfType(a.type) - rankOfType(b.type) || (a.priority === "high" ? -1 : 1) - (b.priority === "high" ? -1 : 1));

  // Place blocks on the timeline without overlapping fixed blocks (coaching, school)
  const fixedBlocks: PlannedBlock[] = [...coachingBlocks, ...schoolBlocks];
  const availStart = availabilityStart(date, profile);
  const availEnd = availabilityEnd(date, profile);

  const placed: PlannedBlock[] = [...fixedBlocks];
  let totalScheduledMin = fixedBlocks
    .filter((b) => b.task.type !== "break")
    .reduce((s, b) => s + Math.round((b.end.getTime() - b.start.getTime()) / 60000), 0);

  const isFree = (start: Date, end: Date): boolean => {
    if (start < availStart || end > availEnd) return false;
    return !placed.some((b) => overlap(start, end, b.start, b.end));
  };

  const tryPlace = (task: Task): boolean => {
    const dur = task.estimatedMinutes;
    let cursor = new Date(availStart);
    while (cursor.getTime() + dur * 60000 <= availEnd.getTime()) {
      const end = addMinutes(cursor, dur);
      if (isFree(cursor, end)) {
        placed.push({ start: new Date(cursor), end, task: { ...task, scheduledDate: dayKey(date), deadline: end.toISOString() } });
        totalScheduledMin += dur;
        return true;
      }
      cursor = addMinutes(cursor, 10);
    }
    return false;
  };

  const scheduledTasks: Task[] = [];
  for (const candidate of allCandidates) {
    if (totalScheduledMin >= hardLimitMin) break;
    if (candidate.type === "break") continue;
    if (tryPlace(candidate)) scheduledTasks.push(candidate);
  }

  // Top-up with starter blocks if capacity remains and plan is sparse
  let generated = false;
  if (totalScheduledMin < hardLimitMin && subjects.length > 0) {
    const remainingMin = hardLimitMin - totalScheduledMin;
    const starters = buildStarterBlocks(subjects, profile, remainingMin, date);
    for (const st of starters) {
      if (totalScheduledMin >= hardLimitMin) break;
      if (tryPlace(st)) { scheduledTasks.push(st); generated = true; }
    }
  }

  if (scheduledTasks.length === 0 && subjects.length > 0) {
    const starters = buildStarterBlocks(subjects, profile, hardLimitMin, date);
    starters.forEach((st) => { if (tryPlace(st)) scheduledTasks.push(st); });
    generated = true;
  }

  scheduledTasks.sort((a, b) => rankOfType(a.type) - rankOfType(b.type));
  scheduledTasks.forEach((t, i) => { t.order = i; });

  const coachingCount = coachingBlocks.length;
  const totalMinutes = scheduledTasks.reduce((s, t) => s + t.estimatedMinutes, 0);
  const message = coachingCount > 0
    ? `Scheduled ${scheduledTasks.length} tasks (${Math.round(totalMinutes / 60)}h) including ${coachingCount} coaching lectures.`
    : `Scheduled ${scheduledTasks.length} tasks (${Math.round(totalMinutes / 60)}h) within your ${hardLimitHours}h limit.`;

  return {
    tasks: scheduledTasks,
    rescheduledCount: rescheduled,
    generated,
    totalMinutes,
    hardLimitMinutes: hardLimitMin,
    coachingCount,
    message,
  };
}

export { buildStarterBlocks, buildSpacedRevisions, collectBacklog };
