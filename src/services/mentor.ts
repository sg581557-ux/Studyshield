import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { todayISODate } from "../lib/constants";
import { db, statsDb, recoveryDb, goalsDb } from "./db";
import { revisionDue } from "./planner/revisionEngine";
import type { DailyPlanInputs, PlanTask, PlannerGoal, Profile, StudyStats, UserChapter } from "../lib/types";

// ============================================================
// AI Mentor service
// ============================================================

export interface MentorChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface MentorThread {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface SubjectBreakdown {
  name: string;
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  pendingLectures: number;
  pendingQuestions: number;
  revisionDue: number;
  avgConfidence: number;
}

export interface MockSummary {
  available: boolean;
  count: number;
  avgPct: number | null;
  bestPct: number | null;
  latest: { name: string; pct: number; date: string } | null;
  bySubject: { subject: string; count: number; avgPct: number }[];
  trend: "up" | "down" | "flat" | null;
}

export interface MentorContext {
  exam: string | null;
  examYear: string | null;
  daysToExam: number | null;
  dailyGoalHours: number;
  attendsSchool: boolean;
  coachingEnabled: boolean;
  // Onboarding v3 profile context (school schedule, goals, sleep, tests).
  stream: string | null;
  schoolClass: string | null;
  board: string | null;
  academicGoals: string[];
  studyDays: string[];
  schoolDays: string[];
  schoolStart: string | null;
  schoolEnd: string | null;
  productiveTime: string | null;
  productiveSlots: string[];
  desiredSleepHours: number | null;
  testsPerWeek: number | null;
  streak: number;
  xp: number;
  today: {
    date: string;
    plannedMinutes: number;
    plannedTaskCount: number;
    completedCount: number;
    completedMinutes: number;
    input: DailyPlanInputs | null;
  };
  last7Days: {
    completionRate: number | null;
    studiedMinutes: number;
    plannedCount: number;
    completedCount: number;
    skippedCount: number;
    avgDailyStudyMinutes: number;
  };
  stats: StudyStats | null;
  chapters: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    pendingLectures: number;
    pendingQuestions: number;
    revisionPending: number;
  };
  subjects: SubjectBreakdown[];
  revisionDue: { subject: string; chapter: string; confidence: number }[];
  backlog: {
    pendingItems: number;
    pendingLectures: number;
    pendingDpps: number;
    pendingModuleQs: number;
  };
  recovery: { pendingCount: number; pendingMinutes: number };
  focus: { sessionsLast7d: number; minutesLast7d: number };
  goals: { type: string; summary: string }[];
  weakSubjects: string[];
  strongSubjects: string[];
  mockTests: { name: string; subject: string | null; obtained: number; total: number; pct: number; date: string }[];
  mockSummary: MockSummary;
  checkins: { date: string; completed: number; missed: number; focusScore: number | null; message: string }[];
  generatedAt: string;
}

export type MentorErrorKind =
  | "not_deployed"
  | "not_configured"
  | "rate_limited"
  | "auth"
  | "bad_request"
  | "server_error"
  | "network"
  | "relay";

export class MentorError extends Error {
  kind: MentorErrorKind;
  retryable: boolean;
  status?: number;

  constructor(kind: MentorErrorKind, message: string, opts?: { retryable?: boolean; status?: number }) {
    super(message);
    this.name = "MentorError";
    this.kind = kind;
    this.retryable = opts?.retryable ?? false;
    this.status = opts?.status;
  }
}

export interface MentorReplyResult {
  reply: string;
  source: "llm" | "offline";
  reason?: string;
  /** Language the mentor actually replied in (detected + preference). */
  language?: string;
}

// ============================================================
// Context builder — gathers the student's real data
// ============================================================

function daysAgoISODate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function daysUntilTargetYear(year: string | null): number | null {
  if (!year || !/^\d{4}$/.test(year.trim())) return null;
  const y = parseInt(year, 10);
  if (y < new Date().getFullYear()) return null;
  // Approximate exam window: mid-June of the target year
  const target = new Date(y, 5, 15).getTime();
  return Math.max(0, Math.ceil((target - Date.now()) / 86400000));
}

export async function buildMentorContext(_userId: string, profile: Profile | null): Promise<MentorContext> {
  const today = todayISODate();
  const weekAgo = daysAgoISODate(7);

  const [stats, chapters, backlog, recovery, tasks, focusSessions, dailyInputs, goals, checkins] = await Promise.all([
    statsDb.get().catch(() => null),
    db.getUserChapters().catch(() => [] as UserChapter[]),
    db.getBacklogItems(profile?.target_exam).catch(() => []),
    recoveryDb.getPending().catch(() => []),
    db.getAllTasks().catch(() => [] as PlanTask[]),
    db.getFocusSessions().catch(() => []),
    db.getDailyPlanInputs(today).catch(() => null),
    goalsDb.getActive().catch(() => [] as PlannerGoal[]),
    db.getRecentCheckins(7).catch(() => []),
  ]);

  const todayTasks = tasks.filter((t) => t.scheduled_date === today);
  const lastWeekTasks = tasks.filter((t) => (t.scheduled_date ?? "") >= weekAgo);

  const weekCompleted = lastWeekTasks.filter((t) => t.task_status === "completed");
  const weekSkipped = lastWeekTasks.filter((t) => t.task_status === "skipped" || t.task_status === "cancelled");
  const weekPlanned = lastWeekTasks.filter((t) => t.task_status !== "cancelled");
  const weekStudiedMin = weekCompleted.reduce((sum, t) => sum + (t.actual_minutes ?? t.estimated_minutes ?? 0), 0);

  const todayCompleted = todayTasks.filter((t) => t.task_status === "completed");
  const todayCompletedMin = todayCompleted.reduce((sum, t) => sum + (t.actual_minutes ?? t.estimated_minutes ?? 0), 0);

  const doneStates = new Set(["completed", "mastered"]);
  const activeChapters = chapters.filter((c) => c.status !== "not_started");

  const revisionDueList = chapters
    .filter((c) => revisionDue(c))
    .map((c) => ({ subject: c.subject, chapter: c.chapter, confidence: c.confidence ?? 3 }))
    .sort((a, b) => a.confidence - b.confidence)
    .slice(0, 12);

  const pendingBacklog = backlog.filter((b) => b.status === "todo" || b.status === undefined);
  const pendingLectures = pendingBacklog.reduce((s, b) => s + (b.pending_lectures ?? 0), 0);
  const pendingDpps = pendingBacklog.reduce((s, b) => s + (b.pending_dpps ?? 0), 0);
  const pendingModuleQs = pendingBacklog.reduce(
    (s, b) => s + (b.module_questions_remaining ?? Math.max(0, (b.module_total_questions ?? 0) - (b.module_solved_questions ?? 0))),
    0,
  );

  const lastWeekFocus = focusSessions.filter((f) => (f.started_at ?? "") >= new Date(Date.now() - 604800000).toISOString());
  const focusMinutes = lastWeekFocus.reduce(
    (sum, f) => sum + (f.duration_minutes ?? f.minutes ?? 0),
    0,
  );
  const focusCompleted = lastWeekFocus.filter((f) => f.completed === true || f.completed === undefined).length;

  const bySubject = new Map<string, SubjectBreakdown>();
  for (const c of chapters) {
    const key = c.subject || "Unspecified";
    let b = bySubject.get(key);
    if (!b) {
      b = { name: key, total: 0, completed: 0, inProgress: 0, notStarted: 0, pendingLectures: 0, pendingQuestions: 0, revisionDue: 0, avgConfidence: 0 };
      bySubject.set(key, b);
    }
    b.total += 1;
    if (doneStates.has(c.status)) b.completed += 1;
    else if (c.status === "in_progress" || c.status === "started") b.inProgress += 1;
    else b.notStarted += 1;
    b.pendingLectures += c.lectures_remaining ?? 0;
    b.pendingQuestions += c.questions_remaining ?? 0;
    b.revisionDue += c.revision_pending ?? 0;
    b.avgConfidence += c.confidence ?? 3;
  }
  const subjects: SubjectBreakdown[] = [...bySubject.values()]
    .map((b) => ({ ...b, avgConfidence: Math.round((b.avgConfidence / Math.max(1, b.total)) * 10) / 10 }))
    .sort((a, b) => b.notStarted + b.pendingLectures - (a.notStarted + a.pendingLectures));

  const mockResults = await db.getMockTests();
  const withPct = mockResults.map((m) => ({
    m,
    pct: Number(m.total_marks) > 0 ? (Number(m.obtained_marks) / Number(m.total_marks)) * 100 : 0,
  }));
  const mockTests = withPct.slice(0, 10).map((x) => ({
    name: x.m.test_name,
    subject: x.m.subject,
    obtained: Number(x.m.obtained_marks),
    total: Number(x.m.total_marks),
    pct: Math.round(x.pct),
    date: x.m.test_date,
  }));
  const bySubjectMocks = new Map<string, { count: number; sum: number }>();
  for (const x of withPct) {
    const key = x.m.subject || "All subjects";
    const cur = bySubjectMocks.get(key) ?? { count: 0, sum: 0 };
    cur.count += 1;
    cur.sum += x.pct;
    bySubjectMocks.set(key, cur);
  }
  const avgPct = withPct.length > 0 ? Math.round(withPct.reduce((s, x) => s + x.pct, 0) / withPct.length) : null;
  const latest = withPct.length > 0 ? withPct[0] : null;
  const mockSummary: MockSummary = {
    available: withPct.length > 0,
    count: withPct.length,
    avgPct,
    bestPct: withPct.length > 0 ? Math.round(Math.max(...withPct.map((x) => x.pct))) : null,
    latest: latest ? { name: latest.m.test_name, pct: Math.round(latest.pct), date: latest.m.test_date } : null,
    bySubject: [...bySubjectMocks.entries()]
      .map(([subject, v]) => ({ subject, count: v.count, avgPct: Math.round(v.sum / v.count) }))
      .sort((a, b) => b.avgPct - a.avgPct),
    trend: !latest || avgPct === null || withPct.length < 3
      ? null
      : Math.round(latest.pct) > avgPct + 3 ? "up"
      : Math.round(latest.pct) < avgPct - 3 ? "down"
      : "flat",
  };

  return {
    exam: profile?.target_exam ?? null,
    examYear: profile?.exam_year ?? null,
    daysToExam: daysUntilTargetYear(profile?.exam_year ?? null),
    dailyGoalHours: profile?.daily_goal_hours ?? 0,
    attendsSchool: profile?.attends_school ?? false,
    coachingEnabled: profile?.coaching_enabled ?? false,
    stream: profile?.stream ?? null,
    schoolClass: profile?.school_class ?? null,
    board: profile?.board ?? null,
    academicGoals: profile?.academic_goals ?? [],
    studyDays: profile?.study_days ?? [],
    schoolDays: profile?.school_days ?? [],
    schoolStart: profile?.school_start ?? null,
    schoolEnd: profile?.school_end ?? null,
    productiveTime: profile?.productive_time ?? null,
    productiveSlots: profile?.productive_slots ?? [],
    desiredSleepHours: profile?.desired_sleep_hours ?? null,
    testsPerWeek: profile?.tests_per_week ?? null,
    streak: stats?.streak_days ?? profile?.longest_streak ?? 0,
    xp: profile?.xp ?? 0,
    today: {
      date: today,
      plannedMinutes: todayTasks.reduce((sum, t) => sum + (t.estimated_minutes ?? 0), 0),
      plannedTaskCount: todayTasks.length,
      completedCount: todayCompleted.length,
      completedMinutes: todayCompletedMin,
      input: dailyInputs,
    },
    last7Days: {
      completionRate: weekPlanned.length > 0 ? Math.round((weekCompleted.length / weekPlanned.length) * 100) : null,
      studiedMinutes: weekStudiedMin,
      plannedCount: weekPlanned.length,
      completedCount: weekCompleted.length,
      skippedCount: weekSkipped.length,
      avgDailyStudyMinutes: Math.round(weekStudiedMin / 7),
    },
    stats,
    chapters: {
      total: chapters.length,
      completed: chapters.filter((c) => doneStates.has(c.status)).length,
      inProgress: chapters.filter((c) => c.status === "in_progress" || c.status === "started").length,
      notStarted: chapters.filter((c) => c.status === "not_started").length,
      pendingLectures: activeChapters.reduce((s, c) => s + (c.lectures_remaining ?? 0), 0),
      pendingQuestions: activeChapters.reduce((s, c) => s + (c.questions_remaining ?? 0), 0),
      revisionPending: activeChapters.reduce((s, c) => s + (c.revision_pending ?? 0), 0),
    },
    subjects,
    revisionDue: revisionDueList,
    backlog: { pendingItems: pendingBacklog.length, pendingLectures, pendingDpps, pendingModuleQs },
    recovery: {
      pendingCount: recovery.length,
      pendingMinutes: recovery.reduce((s, r) => s + (r.estimated_minutes ?? 0), 0),
    },
    focus: { sessionsLast7d: focusCompleted, minutesLast7d: focusMinutes },
    goals: goals.map((g) => ({
      type: g.goal_type,
      summary: Object.entries((g.goals as Record<string, unknown>) ?? {})
        .map(([k, v]) => `${k}: ${String(v)}`)
        .join(", "),
    })),
    weakSubjects: stats?.weak_subjects ?? [],
    strongSubjects: stats?.strong_subjects ?? [],
    mockTests,
    mockSummary,
    checkins: checkins.map((c) => ({
      date: c.date,
      completed: ((c.completed_tasks as unknown[]) ?? []).length,
      missed: ((c.missed_tasks as unknown[]) ?? []).length,
      focusScore: c.focus_score,
      message: (c.message ?? "").slice(0, 400),
    })),
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================
// Thread + message persistence
// ============================================================

export async function listMentorThreads(): Promise<MentorThread[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("mentor_threads")
    .select("id, title, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(20);
  if (error) {
    console.error("[mentor] listMentorThreads", error);
    return [];
  }
  return (data ?? []) as MentorThread[];
}

export async function createMentorThread(title = "Mentor chat"): Promise<MentorThread | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("mentor_threads")
    .insert({ title })
    .select("id, title, created_at, updated_at")
    .single();
  if (error) {
    console.error("[mentor] createMentorThread", error);
    return null;
  }
  return data as MentorThread;
}

export async function getMentorMessages(threadId: string): Promise<MentorChatMessage[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("mentor_messages")
    .select("role, content")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) {
    console.error("[mentor] getMentorMessages", error);
    return [];
  }
  return (data ?? []) as MentorChatMessage[];
}

async function addMentorMessage(threadId: string, role: "user" | "assistant", content: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("mentor_messages").insert({ thread_id: threadId, role, content });
  if (error) console.error("[mentor] addMentorMessage", error);
}

async function updateThreadTitleIfDefault(threadId: string, currentTitle: string, firstMessage: string): Promise<void> {
  if (!supabase) return;
  if (currentTitle !== "Mentor chat") return;
  const title = firstMessage.trim().slice(0, 48);
  if (!title) return;
  await supabase.from("mentor_threads").update({ title }).eq("id", threadId);
}

// ============================================================
// Send a message — LLM via edge function, offline fallback
// ============================================================

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Turn a raw functions.invoke error into a descriptive MentorError.
export async function classifyMentorError(raw: unknown): Promise<MentorError> {
  if (raw instanceof FunctionsFetchError) {
    return new MentorError("network", "Network error — couldn't reach the AI Mentor service. Check your connection and retry.", { retryable: true });
  }
  if (raw instanceof FunctionsRelayError) {
    return new MentorError("relay", "The AI Mentor service failed to respond. Please retry.", { retryable: true });
  }
  if (raw instanceof FunctionsHttpError) {
    // In functions-js (used by supabase-js v2.45), `context` IS the raw
    // Response object: context.status + await context.json() for the body.
    const context = raw.context as Response | undefined;
    const status = context?.status ?? 0;
    let message = "";
    try {
      const j = await context?.json();
      message = (j?.message ?? j?.error ?? "") as string;
    } catch {
      // json() failed — keep the empty fallback
    }
    switch (status) {
      case 401:
        return new MentorError("auth", "Your session expired or is invalid. Sign out, log in again, then retry.", { status });
      case 403:
        return new MentorError("auth", "The AI Mentor service denied access. Sign in again and retry.", { status });
      case 404:
        return new MentorError("not_deployed", "The AI Mentor service isn't deployed yet. Run `supabase functions deploy mentor-chat` to enable live answers.", { status });
      case 429:
        return new MentorError("rate_limited", message || "The AI provider is rate-limiting requests. Wait a minute and retry.", { retryable: true, status });
      case 503:
        return new MentorError("not_configured", message || "The AI Mentor service is missing its LLM API key (OPENROUTER_API_KEY or OPENAI_API_KEY).", { status });
      default:
        if (status >= 500) {
          return new MentorError("server_error", message || `The AI Mentor service failed (HTTP ${status}). Please retry.`, { retryable: true, status });
        }
        return new MentorError("bad_request", message || `The AI Mentor service rejected the request (HTTP ${status}).`, { status });
    }
  }
  const e = raw as { message?: string };
  return new MentorError("server_error", e?.message || "Unexpected error while contacting the AI Mentor.", { retryable: true });
}

export async function sendMentorMessage(
  threadId: string,
  threadTitle: string,
  userText: string,
  history: MentorChatMessage[],
  context: MentorContext,
  opts?: { persistUser?: boolean },
  language?: string,
): Promise<MentorReplyResult> {
  const trimmedText = userText.trim();
  const persistUser = opts?.persistUser !== false;

  if (!supabase) {
    throw new MentorError("network", "App database connection is unavailable. Check your internet connection and retry.", { retryable: true });
  }

  if (persistUser) {
    await addMentorMessage(threadId, "user", trimmedText);
    if (history.length === 0) {
      await updateThreadTitleIfDefault(threadId, threadTitle, trimmedText);
    }
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new MentorError("auth", "You are not signed in. Please log in and try again.");
  }

  let attempts = 0;
  for (;;) {
    try {
      const { data, error } = await supabase.functions.invoke("mentor-chat", {
        body: {
          context,
          messages: [...history, { role: "user", content: trimmedText }],
          ...(language ? { language } : {}),
        },
      });
      if (error) throw error;
      const reply: string = data?.reply ?? "";
      if (!reply) throw new Error("Empty mentor reply");
      await addMentorMessage(threadId, "assistant", reply);
      return { reply, source: "llm", language: (data?.language as string | undefined) ?? language };
    } catch (raw) {
      const err = await classifyMentorError(raw);
      console.error(
        `[mentor] send failed kind=${err.kind} status=${err.status ?? "n/a"} thread=${threadId} ` +
        `messages=${history.length + 1} lastUser="${trimmedText.slice(0, 100)}" msg="${err.message}"`,
      );
      // Service genuinely unavailable (not deployed / no API key): fall back to
      // the deterministic offline mentor, and report the real reason.
      if (err.kind === "not_deployed" || err.kind === "not_configured") {
        const reply = fallbackMentorReply(trimmedText, context);
        await addMentorMessage(threadId, "assistant", reply);
        return { reply, source: "offline", reason: err.message };
      }
      // One automatic retry for temporary failures (network/relay/5xx/429)
      if (attempts === 0 && err.retryable) {
        attempts = 1;
        await delay(900);
        continue;
      }
      throw err;
    }
  }
}

// ============================================================
// Offline deterministic mentor (used when the edge function or
// LLM is unavailable — still grounded in real student data)
// ============================================================

function ctxIntro(ctx: MentorContext): string {
  const exam = ctx.exam ?? "your exam";
  const parts = [
    `Your profile: ${exam}${ctx.examYear ? `, target ${ctx.examYear}` : ""}`,
    `Daily goal: ${ctx.dailyGoalHours}h`,
    `Streak: ${ctx.streak} day${ctx.streak === 1 ? "" : "s"}`,
  ];
  return parts.join(" · ");
}

function todayPlanReply(ctx: MentorContext): string {
  const t = ctx.today;
  const input = t.input;
  const lines: string[] = [];

  if (t.plannedTaskCount === 0) {
    lines.push(
      "**Direct Answer**\nYou have no AI Planner plan for today yet — that's the first thing to fix.",
      "**Analysis from my StudyShield data**\nNo plan means no schedule, and drift usually costs the whole day. Generating today's plan takes two minutes and the planner already knows your backlog, revision schedule and study hours.",
      "**Personalized Action Plan**\n1. Open the AI Planner and enter today's study hours and energy level.\n2. Generate the plan.\n3. Start with the first task — don't reshuffle it.",
      "**Mistakes to Avoid**\nDon't free-wheel 'I'll study whatever feels right'. Don't rebuild the planner's order manually — it already accounts for backlog and revision.",
      "**Next Best Action**\nGenerate today's plan now, then come back and tell me how it went.",
    );
  } else {
    lines.push(
      `**Direct Answer**\nToday's plan has ${t.plannedTaskCount} tasks totalling ${t.plannedMinutes} minutes. ${t.completedCount} task${t.completedCount === 1 ? "" : "s"} done so far (${t.completedMinutes} min).`,
      `**Analysis from my StudyShield data**\nYour planned load is ${(t.plannedMinutes / 60).toFixed(1)}h${ctx.dailyGoalHours ? ` vs your ${ctx.dailyGoalHours}h goal` : ""}. ${t.completedCount > 0 ? "You're in motion — protect the momentum." : "Nothing done yet — the biggest risk is the first task not starting."}`,
      "**Personalized Action Plan**\n1. Do the highest-priority incomplete task next — don't start with the easiest.\n2. Take planned breaks; they keep your attention alive.\n3. Mark tasks completed as you finish so tomorrow's carry-forward is accurate.",
      "**Mistakes to Avoid**\nDon't skip the rest of the plan because one task took longer. Don't stay stuck on a task longer than 15 minutes — move it to recovery if needed.",
      "**Next Best Action**\nStart the highest-priority pending task right now.",
    );
  }

  const prev = ctx.last7Days;
  if (prev.plannedCount > 0) {
    lines.push(
      "",
      `Context: last 7 days you completed ${prev.completedCount}/${prev.plannedCount} planned tasks (${prev.completionRate ?? 0}%) and studied ${Math.round(prev.studiedMinutes / 60 * 10) / 10}h${ctx.revisionDue.length > 0 ? `; ${ctx.revisionDue.length} chapter${ctx.revisionDue.length === 1 ? "" : "s"} need revision` : ""}.`,
    );
  }
  if (ctx.mockSummary.available) {
    lines.push(`Latest mock: "${ctx.mockSummary.latest?.name}" at ${ctx.mockSummary.latest?.pct}% (${ctx.mockSummary.latest?.date}); average ${ctx.mockSummary.avgPct}% across ${ctx.mockSummary.count}.`);
  }
  if (input) {
    lines.push(`Today's inputs: ${input.study_hours}h, energy ${input.energy_level}${input.was_school_day ? ", school day" : ""}${input.exam_tomorrow ? ", exam tomorrow" : ""}.`);
  }
  return [ctxIntro(ctx), ...lines].join("\n\n");
}

function syllabusReply(ctx: MentorContext): string {
  const c = ctx.chapters;
  const lines: string[] = [];

  if (c.total === 0) {
    lines.push(
      "**Direct Answer**\nI can't estimate syllabus completion — your chapter tracking is empty.",
      "**Analysis from my StudyShield data**\nThe calculation needs your chapter list, per-chapter remaining lectures and your pace. Without them any number I give would be made up.",
      "**Personalized Action Plan**\n1. Mark your chapters in the Subjects page (status + lectures remaining).\n2. Study for a few days so the planner records your pace.\n3. Come back and ask again.",
      "**Mistakes to Avoid**\nDon't guess completion by feel — the Subjects page takes five minutes to set up and makes every future answer precise.",
      "**Next Best Action**\nOpen Subjects and update 5 chapters right now.",
    );
    return [ctxIntro(ctx), ...lines].join("\n\n");
  }

  const done = c.completed;
  const remaining = c.total - done;

  lines.push(
    `**Direct Answer**\nYou've completed ${done}/${c.total} chapters (${c.total > 0 ? Math.round((done / c.total) * 100) : 0}%). ${remaining} remain${c.pendingLectures > 0 ? ` with ${c.pendingLectures} lectures still pending` : ""}.`,
    `**Analysis from my StudyShield data**\nAt your last-7-days pace (~${ctx.last7Days.completedCount} planned task${ctx.last7Days.completedCount === 1 ? "" : "s"} done/day, ${Math.round(ctx.last7Days.avgDailyStudyMinutes / 60 * 10) / 10}h studied/day), finishing everything at this pace${ctx.daysToExam ? ` over the ~${ctx.daysToExam} days to your target year` : ""} is a stretch ${ctx.last7Days.completionRate !== null && ctx.last7Days.completionRate < 70 ? "unless completion rate improves" : "but feasible with focus"}.${ctx.subjects.length > 0 ? ` Largest pending load by subject: ${ctx.subjects.slice(0, 2).map((s) => `${s.name} (${s.notStarted} not started, ${s.pendingLectures} lectures pending)`).join(", ")}.` : ""}`,
    "**Personalized Action Plan**\n1. Attack backlog lectures first — they block practice and revision downstream.\n2. Keep a hard daily floor of planned hours; consistency beats long weekends.\n3. Schedule weekly revision of completed chapters so they don't decay.",
    "**Mistakes to Avoid**\nDon't race new chapters while leaving pending lectures pile up — unfinished lectures don't count. Don't drop practice for lectures-only days.",
    "**Next Best Action**\nClear the highest-priority backlog lecture today.",
  );
  return [ctxIntro(ctx), ...lines].join("\n\n");
}

function improvementReply(ctx: MentorContext): string {
  const weak = ctx.weakSubjects;
  const m = ctx.mockSummary;
  const lines: string[] = [];

  const mockDirect = m.available
    ? `Your latest mock "${m.latest?.name}" came in at ${m.latest?.pct}%. Average across ${m.count} mock${m.count === 1 ? "" : "s"}: ${m.avgPct}% (best ${m.bestPct}%).`
    : "I don't have your mock analysis data yet. Upload your test analysis or enable mock tracking — until then I can only judge consistency and completion.";
  const mockAnalysis = m.available
    ? `${m.count >= 3 && m.trend ? `Scores are trending ${m.trend}. ` : ""}${m.bySubject.length > 0 ? `Subject-wise: ${m.bySubject.slice(0, 3).map((s) => `${s.subject} ${s.avgPct}% (${s.count})`).join(", ")}.` : ""} ${m.bySubject.length > 0 && m.bySubject[0] ? `The weakest on record is ${m.bySubject[m.bySubject.length - 1]?.subject ?? "your lowest-scoring subject"} — that's where mock marks are leaking.` : ""}`
    : "Log a mock (PYQ Tracker → Log Attempt) and I can compare subject-wise marks, spot leaky chapters and track the trend across tests.";

  lines.push(
    `**Direct Answer**\n${mockDirect}`,
    `**Analysis from my StudyShield data**\nLast 7 days: ${ctx.last7Days.completionRate ?? "n/a"}% planned-task completion, ${Math.round(ctx.last7Days.avgDailyStudyMinutes / 60 * 10) / 10}h avg study/day${ctx.stats ? `, ${ctx.stats.total_questions_solved ?? 0} total questions solved` : ""}${ctx.chapters.pendingQuestions > 0 ? `, ${ctx.chapters.pendingQuestions} practice questions still pending across chapters` : ""}. ${mockAnalysis}`,
    "**Personalized Action Plan**\n1. Finish tasks you start; a 40-minute completed task beats a 90-minute abandoned one.\n2. Daily practice questions with analysis — errors are data.\n3. Revise before solving: weak recall forces wrong answers.",
    "**Mistakes to Avoid**\nDon't add hours when completion is dropping — stabilise first. Don't skip mistake analysis; repeating the same error pattern is the slowest improvement killer.",
    "**Next Best Action**\nComplete today's highest-priority task fully before starting anything new.",
  );

  if (weak.length > 0) {
    lines.push("", `**Weak subjects on record**: ${weak.join(", ")}. Prioritise these in the next planner session.`);
  }
  if (ctx.revisionDue.length > 0) {
    lines.push("", `**Revision due now**: ${ctx.revisionDue.slice(0, 5).map((r) => `${r.subject}: ${r.chapter}`).join("; ")}.`);
  }
  return [ctxIntro(ctx), ...lines].join("\n\n");
}

function revisionReply(ctx: MentorContext): string {
  const lines: string[] = [];
  if (ctx.revisionDue.length === 0) {
    lines.push(
      "**Direct Answer**\nNo chapters are due for revision right now — good.",
      "**Analysis from my StudyShield data**\nYour spaced-revision schedule (1→3→7→15→30→60 days) shows nothing overdue, which means recently completed chapters are still fresh.",
      "**Personalized Action Plan**\n1. Keep completing chapters — revision fires automatically based on your progress.\n2. When a chapter is due, the planner will place a revision block; do it first.\n3. Use formula revision for quick warm-ups.",
      "**Mistakes to Avoid**\nDon't skip scheduled revision because the material feels known — that's exactly when forgetting starts.",
      "**Next Best Action**\nNothing to revise today — channel the time into the plan.",
    );
  } else {
    const top = ctx.revisionDue.slice(0, 5);
    lines.push(
      `**Direct Answer**\n${ctx.revisionDue.length} chapter${ctx.revisionDue.length === 1 ? " is" : "s are"} due for revision: ${top.map((r) => `${r.subject}: ${r.chapter}`).join("; ")}${ctx.revisionDue.length > 5 ? ` (+${ctx.revisionDue.length - 5} more)` : ""}.`,
      "**Analysis from my StudyShield data**\nSpaced repetition schedules these because the interval (1/3/7/15/30/60 days) has elapsed. Revisiting now costs ~25 minutes but saves a full re-learn later.",
      "**Personalized Action Plan**\n1. Slot the top 1–2 revision chapters into today's plan (25 min each).\n2. For low-confidence chapters, solve 5 questions after revision to anchor it.\n3. Keep the rest on tomorrow's plan — don't cram all at once.",
      "**Mistakes to Avoid**\nNever skip revision in favour of new material — forgetting outpaces learning.\nDon't re-read passively; revise actively (formulas → closed-book recall → questions).",
      "**Next Best Action**\nRevise the first due chapter for 25 minutes now.",
    );
  }
  return [ctxIntro(ctx), ...lines].join("\n\n");
}

function chapterChoiceReply(ctx: MentorContext): string {
  const lines: string[] = [];
  const inProgress = ctx.chapters.inProgress;
  if (inProgress > 0) {
    lines.push(
      `**Direct Answer**\nStick with your ${inProgress} chapter${inProgress === 1 ? "" : "s"} in progress — don't start something new.`,
      "**Analysis from my StudyShield data**\nYou have in-progress chapters plus pending backlog and revision. Starting fresh chapters while others are unfinished multiplies fragmentation — nothing gets closed out.",
      "**Personalized Action Plan**\n1. Finish the most advanced in-progress chapter to 'completed'.\n2. Clear its pending lectures and module questions.\n3. Then, and only then, consider the next chapter — ideally one the planner ranks highest.",
      "**Mistakes to Avoid**\nDon't jump to a new chapter because the current one got hard. Don't start chapters whose prerequisites are incomplete.",
      "**Next Best Action**\nClose out the in-progress chapter with the fewest remaining lectures.",
    );
  } else {
    lines.push(
      "**Direct Answer**\nYou have no chapters in progress — pick the one with the most pending lectures in your backlog or the planner's highest-priority chapter.",
      "**Analysis from my StudyShield data**\nWith nothing mid-flight, the strongest move is clearing the highest-priority backlog, because it unblocks practice and revision downstream.",
      "**Personalized Action Plan**\n1. Open Backlog and check pending lectures.\n2. Add that chapter's remaining lectures to today's plan.\n3. Follow it with its DPP or module questions.",
      "**Mistakes to Avoid**\nDon't start with the easiest chapter — start with the one that unblocks the most. Don't start multiple chapters in the same day.",
      "**Next Best Action**\nOpen Backlog and pick the top pending-lecture item.",
    );
  }
  return [ctxIntro(ctx), ...lines].join("\n\n");
}

function backlogReply(ctx: MentorContext): string {
  const b = ctx.backlog;
  const r = ctx.recovery;
  if (b.pendingItems === 0 && r.pendingCount === 0) {
    return [ctxIntro(ctx),
      "**Direct Answer**\nYour backlog is clean and nothing is in recovery.",
      "**Analysis from my StudyShield data**\nNo pending backlog items and no missed tasks in the recovery bucket means carry-forward pressure is zero — rare and good.",
      "**Personalized Action Plan**\n1. Keep it this way: finish every planned task the same day.\n2. Keep generating daily plans so nothing accumulates.",
      "**Mistakes to Avoid**\nDon't let a small backlog quietly grow over a week — one missed day compounds.",
      "**Next Best Action**\nGenerate today's plan and protect the streak.",
    ].join("\n\n");
  }
  return [ctxIntro(ctx),
    `**Direct Answer**\nYou have ${b.pendingItems} pending backlog item${b.pendingItems === 1 ? "" : "s"} (${b.pendingLectures} lectures, ${b.pendingDpps} DPPs, ${b.pendingModuleQs} module questions)${r.pendingCount > 0 ? ` and ${r.pendingCount} missed tasks in recovery (~${r.pendingMinutes} min)` : ""}.`,
    "**Analysis from my StudyShield data**\nBacklog is blocking because lectures, DPPs and module questions chain: an uncleared lecture leaves its DPP and module stuck, and revision of that chapter never starts.",
    "**Personalized Action Plan**\n1. Attack lectures first — they have the longest chain.\n2. After each lecture, do its DPP the same or next day.\n3. Let the planner's recovery block handle missed tasks; don't double-book them manually.",
    "**Mistakes to Avoid**\nDon't add new chapters while backlog exists — that's how backlog grows. Don't mark backlog done without actually closing its lectures/questions.",
    "**Next Best Action**\nClear one pending lecture from the backlog today.",
  ].join("\n\n");
}

function energyReply(ctx: MentorContext): string {
  const t = ctx.today;
  const input = t.input;
  const level = input?.energy_level ?? null;
  return [ctxIntro(ctx),
    `**Direct Answer**\n${level ? `You're at ${level} energy today. ` : "No energy input recorded for today. "}Plan lighter: keep revision and practice, defer heavy new-material lectures.`,
    "**Analysis from my StudyShield data**\nLow-energy days are for consolidation, not conquest — revising and solving a few questions preserves the streak without burning you out.",
    "**Personalized Action Plan**\n1. Do 2–3 revision blocks (25 min each).\n2. Solve one module or DPP chunk.\n3. Stop on time — the plan exists to be finished, not to be heroic.",
    "**Mistakes to Avoid**\nDon't skip studying entirely (streak and momentum die). Don't push a full heavy day on low energy — it breeds the missed-task cycle.",
    "**Next Best Action**\nSet today's plan to your available hours at a relaxed energy level.",
  ].join("\n\n");
}

export function fallbackMentorReply(raw: string, ctx: MentorContext): string {
  const text = raw.toLowerCase();
  const has = (...keys: string[]) => keys.some((k) => text.includes(k));

  if (has("today", "strategy", "today's plan", "plan for today", "what should i do today", "aaj")) {
    return todayPlanReply(ctx);
  }
  if (has("syllabus", "finish", "complete", "possible", "will i be able", "cover", "syllabus complete")) {
    return syllabusReply(ctx);
  }
  if (has("revise", "revision", "forget", "retain", "remember")) {
    return revisionReply(ctx);
  }
  if (has("weak", "improve", "marks", "score", "accuracy", "performance", "better")) {
    return improvementReply(ctx);
  }
  if (has("backlog", "pending", "missed", "recovery")) {
    return backlogReply(ctx);
  }
  if (has("energy", "tired", "exhaust", "burnout", "demotiv", "low")) {
    return energyReply(ctx);
  }
  if (has("which chapter", "what to study", "start new", "new chapter", "next chapter", "chapter should i")) {
    return chapterChoiceReply(ctx);
  }
  return [ctxIntro(ctx),
    `**Direct Answer**\nHere's where you actually stand: ${ctx.streak}-day streak, ${ctx.last7Days.completionRate ?? "n/a"}% planned-task completion this week, ${Math.round(ctx.last7Days.avgDailyStudyMinutes / 60 * 10) / 10}h avg study/day, ${ctx.chapters.completed}/${ctx.chapters.total || "?"} chapters done${ctx.mockSummary.available ? `, latest mock ${ctx.mockSummary.latest?.name ?? "test"} at ${ctx.mockSummary.latest?.pct}%` : ""}${ctx.backlog.pendingItems > 0 ? `, ${ctx.backlog.pendingItems} backlog items pending` : ""}${ctx.revisionDue.length > 0 ? `, ${ctx.revisionDue.length} chapters due for revision` : ""}.`,
    "**Analysis from my StudyShield data**\nThese numbers are what a mentor would look at first: consistency, completion, and what's decaying (backlog, revision).",
    "**Personalized Action Plan**\n1. Keep the daily plan generation habit — it's the backbone.\n2. Close out one backlog chain (lecture → DPP → module).\n3. Protect revision slots.",
    "**Mistakes to Avoid**\nDon't compare yourself to others — only to your own completion trend.",
    "**Next Best Action**\nAsk me something specific: today's strategy, syllabus feasibility, revision, backlog, or how to improve marks.",
  ].join("\n\n");
}
