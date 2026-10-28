import { supabase } from "../lib/supabase";
import { todayISODate } from "../lib/constants";
import { db, statsDb } from "./db";
import type { PlanTask, Profile } from "../lib/types";

// ============================================================
// Echo Daily Check-in — aesthetic, personalised, data-driven
// Every line grounded in real planner/backlog/streak/mock data.
// Now returns structured EchoCheckinData for the bento UI.
//
// Legacy `message` is still generated & persisted for DB compat.
// ============================================================

export interface CheckinTaskSummary {
  title: string;
  subject: string | null;
  type: string;
}

export type EchoCheckinTone = "celebrate" | "push" | "recover" | "focus" | "steady";

export interface EchoPriority {
  title: string;
  subject: string | null;
  type: string;
  reason: "planned" | "backlog" | "weak" | "generate";
}

export interface EchoCheckinData {
  greeting: string;
  name: string | null;
  dateLabel: string;
  fullDateLabel: string;
  personaLine: string;
  examLabel: string | null;
  yesterday: {
    completed: CheckinTaskSummary[];
    missed: CheckinTaskSummary[];
    empty: boolean;
  };
  streak: number;
  focusScore: number | null;
  week: {
    rate: number | null;
    studiedMin: number;
    planned: number;
    done: number;
    missed: number;
  };
  priorities: EchoPriority[];
  backlog: {
    pendingItems: number;
    pendingLectures: number;
    firstLabel: string | null;
  } | null;
  mock: {
    name: string;
    pct: number;
    obtained: number;
    total: number;
    weakest: { subject: string; avgPct: number } | null;
  } | null;
  warning: string | null;
  advice: {
    text: string;
    tone: EchoCheckinTone;
    label: string;
  };
}

export interface CheckinResult {
  message: string;
  completedTasks: CheckinTaskSummary[];
  missedTasks: CheckinTaskSummary[];
  focusScore: number | null;
  data: EchoCheckinData;
}

const DONE = new Set(["completed", "mastered"]);

function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function shortTitle(t: PlanTask): string {
  const title = t.title?.trim() || "Task";
  return title.length > 60 ? title.slice(0, 57) + "…" : title;
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function taskSummary(t: PlanTask): CheckinTaskSummary {
  return { title: shortTitle(t), subject: t.subject ?? null, type: t.type ?? "task" };
}

function firstNameOf(profile: Profile | null | undefined): string | null {
  const raw = (profile?.display_name || profile?.full_name || "").trim();
  if (!raw) return null;
  const first = raw.split(/\s+/)[0];
  if (!first) return null;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function formatDateLabel(d = new Date()): string {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
}

function formatFullDateLabel(d = new Date()): string {
  return d.toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function buildPersonaLine(profile: Profile | null | undefined, _stats: Awaited<ReturnType<typeof statsDb.get>>, streak: number): string {
  const bits: string[] = [];
  const exam = profile?.target_exam?.trim();
  if (exam) {
    const year = profile?.exam_year?.trim();
    bits.push(year ? `${exam} · ${year}` : exam);
  }
  if (streak >= 2) bits.push(`🔥 ${streak}-day streak`);
  else if (streak === 1) bits.push("🔥 1-day streak — keep it alive");
  else bits.push("fresh start today");

  const level = profile?.xp != null ? Math.floor((profile.xp ?? 0) / 800) + 1 : null;
  if (level) bits.push(`Level ${level}`);

  const productive = profile?.productive_time;
  if (productive && bits.length < 4) {
    const map: Record<string, string> = {
      early_morning: "early bird",
      morning: "morning focus",
      afternoon: "afternoon grind",
      evening: "evening flow",
      night: "night owl",
      night_owl: "night owl",
    };
    if (map[productive]) bits.push(map[productive]);
  }
  return bits.join("  •  ");
}

function toneLabel(tone: EchoCheckinTone): string {
  switch (tone) {
    case "celebrate": return "On fire";
    case "push": return "Push today";
    case "recover": return "Reset today";
    case "focus": return "Focus point";
    default: return "Echo says";
  }
}

export async function buildDailyCheckin(examKey?: string | null, profile?: Profile | null): Promise<CheckinResult | null> {
  if (!supabase) return null;

  const today = todayISODate();
  const yesterday = dateOffset(-1);
  const weekAgo = dateOffset(-6);
  const now = new Date();

  const [yTasks, tTasks, allTasks, backlog, focus, stats, mocks, memories, checkins] = await Promise.all([
    db.getTasksForDate(yesterday),
    db.getTasksForDate(today),
    db.getAllTasks(),
    db.getBacklogItems(examKey),
    db.getFocusSessions(),
    statsDb.get().catch(() => null),
    db.getMockTests(),
    db.getMentorMemories(),
    db.getRecentCheckins(7),
  ]);

  if (yTasks.length === 0 && tTasks.length === 0 && backlog.length === 0 && !stats) return null;

  const yCompleted = yTasks.filter((t) => DONE.has(t.task_status));
  const yMissed = yTasks.filter((t) => !DONE.has(t.task_status) && t.task_status !== "cancelled");

  const weekTasks = allTasks.filter((t) => (t.scheduled_date ?? "") >= weekAgo);
  const wPlanned = weekTasks.filter((t) => t.task_status !== "cancelled");
  const wDone = weekTasks.filter((t) => DONE.has(t.task_status));
  const wMissed = weekTasks.filter((t) => !DONE.has(t.task_status) && t.task_status !== "cancelled");
  const weekRate = wPlanned.length > 0 ? clamp100((wDone.length / wPlanned.length) * 100) : null;
  const last3Missed = wMissed.filter((t) => (t.scheduled_date ?? "") >= dateOffset(-2)).length;
  const weekStudiedMin = wDone.reduce((sum, t) => sum + (t.actual_minutes ?? t.estimated_minutes ?? 0), 0);

  const pendingBacklog = backlog.filter((b) => b.status === "todo" || b.status === undefined);
  const pendingLectures = pendingBacklog.reduce((s, b) => s + (b.pending_lectures ?? 0), 0);
  const firstBacklog = [...pendingBacklog].sort((a, b) => (a.priority === "high" ? 0 : 1) - (b.priority === "high" ? 0 : 1))[0] ?? null;

  const streak = stats?.streak_days ?? profile?.longest_streak ?? 0;
  const weekFocus = focus.filter((f) => (f.started_at ?? "") >= new Date(Date.now() - 604800000).toISOString());
  const focusScore = weekFocus.length > 0 ? clamp100((weekFocus.filter((f) => f.completed === true || f.completed === undefined).length / weekFocus.length) * 100) : null;

  const mockSummary = mocks.length > 0
    ? (() => {
        const latest = mocks[0];
        const pct = Number(latest.total_marks) > 0 ? clamp100((Number(latest.obtained_marks) / Number(latest.total_marks)) * 100) : 0;
        const bySubject = new Map<string, { count: number; sum: number }>();
        for (const m of mocks) {
          const key = m.subject || "Overall";
          const cur = bySubject.get(key) ?? { count: 0, sum: 0 };
          cur.count += 1;
          cur.sum += Number(m.total_marks) > 0 ? (Number(m.obtained_marks) / Number(m.total_marks)) * 100 : 0;
          bySubject.set(key, cur);
        }
        let weakest: { subject: string; avgPct: number } | null = null;
        for (const [subject, v] of bySubject) {
          const avgPct = clamp100(v.sum / v.count);
          if (!weakest || avgPct < weakest.avgPct) weakest = { subject, avgPct };
        }
        return { latest, pct, weakest };
      })()
    : null;

  const weaknessMemories = memories
    .filter((m) => m.category === "weakness" || m.category === "problem")
    .sort((a, b) => b.importance - a.importance);

  const sortedToday = [...tTasks].sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0));

  // --- Personalised greeting bits ---
  const greeting = timeGreeting();
  const name = firstNameOf(profile);
  const dateLabel = formatDateLabel(now);
  const fullDateLabel = formatFullDateLabel(now);
  const examLabel = (profile?.target_exam ?? examKey ?? null) as string | null;
  const personaLine = buildPersonaLine(profile, stats, streak);

  // --- Priorities (structured) ---
  const priorities: EchoPriority[] = [];
  for (const t of sortedToday.slice(0, 3)) {
    priorities.push({ title: shortTitle(t), subject: t.subject ?? null, type: t.type ?? "task", reason: "planned" });
  }
  if (pendingLectures > 0 && firstBacklog) {
    const label = firstBacklog.subject ? `${firstBacklog.subject}${firstBacklog.chapter ? ` — ${firstBacklog.chapter}` : ""}` : firstBacklog.title ?? "pending item";
    priorities.push({
      title: `Clear backlog: ${label} (${pendingLectures} lecture${pendingLectures === 1 ? "" : "s"} pending)`,
      subject: firstBacklog.subject ?? null,
      type: "backlog",
      reason: "backlog",
    });
  }
  if (mockSummary && mockSummary.weakest && mockSummary.weakest.avgPct < 60) {
    priorities.push({
      title: `Fix ${mockSummary.weakest.subject} — weakest mock subject (${mockSummary.weakest.avgPct}%)`,
      subject: mockSummary.weakest.subject,
      type: "weak",
      reason: "weak",
    });
  }
  const finalPriorities = priorities.slice(0, 4);
  if (finalPriorities.length === 0) {
    finalPriorities.push({
      title: "Generate today's plan in the AI Planner — it sets the whole day.",
      subject: null,
      type: "plan",
      reason: "generate",
    });
  }

  // --- Warning ---
  const checkinMissDays = checkins.filter((c) => ((c.missed_tasks as unknown[]) ?? []).length > 0).length;
  let warning: string | null = null;
  if (weekRate !== null && weekRate < 60 && wPlanned.length >= 4) {
    warning = `Only ${weekRate}% done this week${last3Missed >= 2 ? ` — ${last3Missed} missed in last 3 days` : ""}${checkinMissDays >= 2 ? ` · misses on ${checkinMissDays}/${checkins.length} check-ins` : ""}. Break the pattern today.`;
  }

  // --- Advice (personalised, tone-aware) ---
  let adviceTone: EchoCheckinTone = "steady";
  let adviceText: string;

  const nameForAdvice = name ?? "you";
  if (last3Missed >= 2 || (weekRate !== null && weekRate < 50)) {
    adviceTone = "recover";
    adviceText = `Hey ${nameForAdvice}, don't add new backlog today — just clear one pending task fully. A small, clean win resets momentum faster than a packed plan.`;
  } else if (streak >= 7) {
    adviceTone = "celebrate";
    adviceText = `${streak} days straight, ${nameForAdvice}! That's rare discipline. Protect it today — even a light, complete plan keeps the chain alive.`;
  } else if (streak >= 3 && (weekRate ?? 0) >= 65) {
    adviceTone = "celebrate";
    adviceText = `You're building real momentum, ${nameForAdvice} — ${streak}-day streak and ${weekRate}% this week. Don't let a quiet day stall it.`;
  } else if (pendingLectures > 0 && firstBacklog) {
    const target = firstBacklog.subject ? `${firstBacklog.subject}${firstBacklog.chapter ? `: ${firstBacklog.chapter}` : ""}` : "the top backlog item";
    adviceTone = "focus";
    adviceText = `Your ${target} backlog is still pending — clear it before new lectures. Unfinished lectures block practice & revision downstream.`;
  } else if (mockSummary && mockSummary.weakest && mockSummary.weakest.avgPct < 65) {
    adviceTone = "push";
    adviceText = `Put 30 focused minutes into ${mockSummary.weakest.subject} today, ${nameForAdvice} — it's pulling your average down and targeted work lifts it fastest.`;
  } else if (weaknessMemories.length > 0) {
    adviceTone = "focus";
    adviceText = `Prioritise ${weaknessMemories[0].value} today, ${nameForAdvice} — it's on your weak list. Hit it while motivation is fresh.`;
  } else if (sortedToday.length > 0) {
    adviceTone = "push";
    adviceText = `Start with "${shortTitle(sortedToday[0])}" — the highest-priority task. Momentum beats motivation once you start.`;
  } else {
    adviceTone = "steady";
    adviceText = `Generate today's plan first, ${nameForAdvice} — a clear plan is the single biggest lever for a good day.`;
  }

  // --- Legacy message for DB (still personalised) ---
  const lines: string[] = [];
  lines.push(`${greeting}, ${name ?? "there"}! 👋`, "");
  if (yCompleted.length === 0 && yMissed.length === 0) {
    lines.push("Yesterday: No tasks to report — fresh slate today.");
  } else {
    lines.push("Yesterday:");
    if (yCompleted.length > 0) lines.push(...yCompleted.slice(0, 5).map((t) => `✅ ${shortTitle(t)}`));
    if (yMissed.length > 0) lines.push(...yMissed.slice(0, 5).map((t) => `❌ ${shortTitle(t)}`));
    if (yCompleted.length > 5) lines.push(`…and ${yCompleted.length - 5} more completed`);
    if (yMissed.length > 5) lines.push(`…and ${yMissed.length - 5} more missed`);
  }
  if (streak >= 2) lines.push("", `🔥 ${streak}-day streak — protect it today.`);
  lines.push("", "Today's priorities:");
  if (finalPriorities.length === 0) {
    lines.push("1. Generate today's plan in the AI Planner — it sets the whole day.");
  } else {
    finalPriorities.forEach((p, i) => lines.push(`${i + 1}. ${p.title}`));
  }
  if (mockSummary) {
    lines.push("", `📊 Latest mock "${mockSummary.latest.test_name}": ${mockSummary.pct}% (${mockSummary.latest.obtained_marks}/${mockSummary.latest.total_marks}).`);
  }
  if (warning) lines.push("", `⚠️ ${warning}`);
  lines.push("", "Echo says:", `"${adviceText}"`);

  const backlogData = pendingBacklog.length > 0 || pendingLectures > 0
    ? {
        pendingItems: pendingBacklog.length,
        pendingLectures,
        firstLabel: firstBacklog
          ? firstBacklog.subject
            ? `${firstBacklog.subject}${firstBacklog.chapter ? ` — ${firstBacklog.chapter}` : ""}`
            : firstBacklog.title ?? null
          : null,
      }
    : null;

  const data: EchoCheckinData = {
    greeting,
    name,
    dateLabel,
    fullDateLabel,
    personaLine,
    examLabel,
    yesterday: {
      completed: yCompleted.map(taskSummary),
      missed: yMissed.map(taskSummary),
      empty: yCompleted.length === 0 && yMissed.length === 0,
    },
    streak,
    focusScore,
    week: {
      rate: weekRate,
      studiedMin: weekStudiedMin,
      planned: wPlanned.length,
      done: wDone.length,
      missed: wMissed.length,
    },
    priorities: finalPriorities,
    backlog: backlogData,
    mock: mockSummary
      ? {
          name: mockSummary.latest.test_name,
          pct: mockSummary.pct,
          obtained: Number(mockSummary.latest.obtained_marks),
          total: Number(mockSummary.latest.total_marks),
          weakest: mockSummary.weakest,
        }
      : null,
    warning,
    advice: { text: adviceText, tone: adviceTone, label: toneLabel(adviceTone) },
  };

  return {
    message: lines.join("\n"),
    completedTasks: yCompleted.map(taskSummary),
    missedTasks: yMissed.map(taskSummary),
    focusScore,
    data,
  };
}
