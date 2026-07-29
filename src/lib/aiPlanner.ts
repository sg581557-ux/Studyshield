import { supabase } from "./supabase";
import type { UserChapter, BacklogItem, PlanTask, AiPlan } from "./supabase";

type StudyMode = "balanced" | "hard_push" | "recovery" | "exam_sprint";

type PlannerInput = {
  availableHours: number;
  mode: StudyMode;
  todayGoal: string;
  exam: string;
};

type ScheduledBlock = {
  title: string;
  subject: string;
  chapter: string | null;
  type: "study" | "practice" | "revision" | "break" | "test";
  estimated_minutes: number;
  priority: "high" | "medium" | "low";
  source: string | null;
};

export async function generateDailyPlan(
  userId: string,
  input: PlannerInput
): Promise<{ plan: AiPlan; tasks: PlanTask[] }> {
  const { availableHours, mode, todayGoal, exam } = input;
  const totalMinutes = Math.max(30, Math.round(availableHours * 60));

  const [chaptersRes, backlogRes] = await Promise.all([
    supabase.from("user_chapters").select("*").eq("user_id", userId).eq("exam", exam),
    supabase.from("backlog_items").select("*").eq("user_id", userId).neq("status", "done"),
  ]);

  const chapters = (chaptersRes.data ?? []) as UserChapter[];
  const backlog = (backlogRes.data ?? []) as BacklogItem[];

  const blocks = buildScheduleBlocks(chapters, backlog, totalMinutes, mode, todayGoal);

  const startTime = new Date();
  startTime.setHours(8, 0, 0, 0);
  const scheduledTasks = assignTimes(blocks, startTime);

  const planDate = new Date().toISOString().split("T")[0];

  const { data: planRow } = await supabase
    .from("ai_plans")
    .insert({
      user_id: userId,
      plan_data: { blocks: blocks.map((b) => ({ ...b })) },
      plan_type: "daily",
      plan_date: planDate,
      mode,
      today_goal: todayGoal,
      study_mode: mode,
      available_hours: availableHours,
    })
    .select()
    .single();

  const plan = planRow as AiPlan;

  const taskRows = scheduledTasks.map((t) => ({
    user_id: userId,
    plan_id: plan.id,
    title: t.title,
    subject: t.subject,
    type: t.type,
    estimated_minutes: t.estimated_minutes,
    priority: t.priority,
    completed: false,
    scheduled_date: planDate,
    start_time: t.start_time,
    end_time: t.end_time,
    chapter: t.chapter,
    source: t.source,
    completion_pct: 0,
  }));

  const { data: insertedTasks } = await supabase.from("plan_tasks").insert(taskRows).select();
  const tasks = (insertedTasks ?? []) as unknown as PlanTask[];

  return { plan, tasks };
}

function buildScheduleBlocks(
  chapters: UserChapter[],
  backlog: BacklogItem[],
  totalMinutes: number,
  mode: StudyMode,
  todayGoal: string
): ScheduledBlock[] {
  const blocks: ScheduledBlock[] = [];
  let used = 0;

  const modeConfig: Record<StudyMode, { studyLen: number; breakLen: number; practiceRatio: number }> = {
    balanced: { studyLen: 75, breakLen: 15, practiceRatio: 0.3 },
    hard_push: { studyLen: 90, breakLen: 10, practiceRatio: 0.35 },
    recovery: { studyLen: 45, breakLen: 15, practiceRatio: 0.2 },
    exam_sprint: { studyLen: 60, breakLen: 5, practiceRatio: 0.5 },
  };

  const cfg = modeConfig[mode] ?? modeConfig.balanced;
  const practiceMinutes = Math.round(totalMinutes * cfg.practiceRatio);
  const studyMinutes = totalMinutes - practiceMinutes;

  const inProgressChapters = chapters.filter((c) => c.status === "in_progress");
  const notStartedChapters = chapters.filter((c) => c.status === "not_started");
  const needsRevision = chapters.filter((c) => c.revision_pending > 0);
  const needsLectures = chapters
    .filter((c) => c.lectures_remaining > 0)
    .sort((a, b) => a.lectures_remaining - b.lectures_remaining);

  if (todayGoal && todayGoal.trim()) {
    const goalBlocks = splitGoalIntoBlocks(todayGoal, studyMinutes, cfg.studyLen, cfg.breakLen);
    for (const b of goalBlocks) {
      if (used + b.estimated_minutes > totalMinutes) break;
      blocks.push(b);
      used += b.estimated_minutes;
    }
  }

  for (const ch of needsLectures) {
    if (used >= studyMinutes) break;
    const remaining = studyMinutes - used;
    const blockLen = Math.min(cfg.studyLen, remaining);
    if (blockLen < 15) break;
    blocks.push({
      title: `${ch.chapter} — Lecture`,
      subject: ch.subject,
      chapter: ch.chapter,
      type: "study",
      estimated_minutes: blockLen,
      priority: "high",
      source: "chapter",
    });
    used += blockLen;
    if (used < studyMinutes) {
      blocks.push({ title: "Break", subject: "", chapter: null, type: "break", estimated_minutes: cfg.breakLen, priority: "low", source: null });
      used += cfg.breakLen;
    }
  }

  const practicePool = [...inProgressChapters, ...notStartedChapters];
  let practiceUsed = 0;
  for (const ch of practicePool) {
    if (practiceUsed >= practiceMinutes) break;
    const remaining = practiceMinutes - practiceUsed;
    const blockLen = Math.min(cfg.studyLen, remaining);
    if (blockLen < 15) break;
    blocks.push({
      title: `${ch.chapter} — Module Exercise`,
      subject: ch.subject,
      chapter: ch.chapter,
      type: "practice",
      estimated_minutes: blockLen,
      priority: ch.status === "in_progress" ? "medium" : "low",
      source: "module",
    });
    practiceUsed += blockLen;
    if (practiceUsed < practiceMinutes) {
      blocks.push({ title: "Break", subject: "", chapter: null, type: "break", estimated_minutes: cfg.breakLen, priority: "low", source: null });
      practiceUsed += cfg.breakLen;
    }
  }

  for (const item of backlog.sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority))) {
    if (used >= totalMinutes) break;
    const remaining = totalMinutes - used;
    const blockLen = Math.min(60, remaining);
    if (blockLen < 15) break;
    blocks.push({
      title: item.title,
      subject: item.subject ?? "",
      chapter: item.chapter,
      type: "practice",
      estimated_minutes: blockLen,
      priority: item.priority as "high" | "medium" | "low",
      source: "backlog",
    });
    used += blockLen;
  }

  for (const ch of needsRevision) {
    if (used >= totalMinutes) break;
    const remaining = totalMinutes - used;
    const blockLen = Math.min(30, remaining);
    if (blockLen < 15) break;
    blocks.push({
      title: `${ch.chapter} — Revision`,
      subject: ch.subject,
      chapter: ch.chapter,
      type: "revision",
      estimated_minutes: blockLen,
      priority: "medium",
      source: "revision",
    });
    used += blockLen;
  }

  return blocks;
}

function splitGoalIntoBlocks(
  goal: string,
  budget: number,
  studyLen: number,
  breakLen: number
): ScheduledBlock[] {
  const blocks: ScheduledBlock[] = [];
  let used = 0;
  let studyCount = 0;
  const maxBlocks = Math.floor(budget / (studyLen + breakLen));

  while (used < budget && studyCount < maxBlocks) {
    const remaining = budget - used;
    const len = Math.min(studyLen, remaining);
    if (len < 15) break;
    studyCount++;
    blocks.push({
      title: `${goal} — Study (${studyCount}/${maxBlocks || 1})`,
      subject: "",
      chapter: goal,
      type: "study",
      estimated_minutes: len,
      priority: "high",
      source: "today_goal",
    });
    used += len;
    if (used < budget) {
      blocks.push({ title: "Break", subject: "", chapter: null, type: "break", estimated_minutes: breakLen, priority: "low", source: null });
      used += breakLen;
    }
  }
  return blocks;
}

function assignTimes(blocks: ScheduledBlock[], startTime: Date) {
  let cursor = new Date(startTime);
  return blocks.map((b) => {
    const start = new Date(cursor);
    const end = new Date(cursor.getTime() + b.estimated_minutes * 60000);
    cursor = new Date(end);
    return {
      ...b,
      start_time: start.toTimeString().slice(0, 8),
      end_time: end.toTimeString().slice(0, 8),
    };
  });
}

function priorityWeight(p: string): number {
  if (p === "high") return 3;
  if (p === "medium") return 2;
  return 1;
}

export async function fetchTodayPlan(userId: string): Promise<{ plan: AiPlan | null; tasks: PlanTask[] }> {
  const today = new Date().toISOString().split("T")[0];
  const { data: planData } = await supabase
    .from("ai_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("plan_date", today)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!planData) return { plan: null, tasks: [] };

  const { data: taskData } = await supabase
    .from("plan_tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("scheduled_date", today)
    .order("start_time", { ascending: true });

  return { plan: planData as AiPlan, tasks: (taskData ?? []) as PlanTask[] };
}

export async function toggleTaskComplete(taskId: string, completed: boolean): Promise<void> {
  await supabase.from("plan_tasks").update({ completed, completion_pct: completed ? 100 : 0 }).eq("id", taskId);
}

export async function deletePlanTasks(userId: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  await supabase.from("plan_tasks").delete().eq("user_id", userId).eq("scheduled_date", today);
}
