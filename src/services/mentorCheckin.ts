import { supabase } from "../lib/supabase";
import { todayISODate } from "../lib/constants";
import { db, statsDb } from "./db";
import type { PlanTask } from "../lib/types";

// ============================================================
// AI Mentor Daily Check-in — deterministic, data-driven
// message generator. Never generic: every line is grounded in
// the student's real planner/backlog/streak/mock data.
// ============================================================

export interface CheckinTaskSummary {
  title: string;
  subject: string | null;
  type: string;
}

export interface CheckinResult {
  message: string;
  completedTasks: CheckinTaskSummary[];
  missedTasks: CheckinTaskSummary[];
  focusScore: number | null;
}

const DONE = new Set(["completed", "mastered"]);

function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning 👋";
  if (h < 17) return "Good afternoon 👋";
  return "Good evening 👋";
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

export async function buildDailyCheckin(examKey?: string | null): Promise<CheckinResult | null> {
  if (!supabase) return null;

  const today = todayISODate();
  const yesterday = dateOffset(-1);
  const weekAgo = dateOffset(-6);

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

  const pendingBacklog = backlog.filter((b) => b.status === "todo" || b.status === undefined);
  const pendingLectures = pendingBacklog.reduce((s, b) => s + (b.pending_lectures ?? 0), 0);
  const firstBacklog = [...pendingBacklog].sort((a, b) => (a.priority === "high" ? 0 : 1) - (b.priority === "high" ? 0 : 1))[0] ?? null;

  const streak = stats?.streak_days ?? 0;
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

  // --- Build the message ---
  const lines: string[] = [];
  lines.push(timeGreeting(), "");

  // Yesterday's progress
  if (yCompleted.length === 0 && yMissed.length === 0) {
    lines.push("Yesterday:", "No tasks to report — the day was clear or the plan was cancelled.");
  } else {
    lines.push("Yesterday:");
    if (yCompleted.length > 0) lines.push(...yCompleted.slice(0, 5).map((t) => `✅ ${shortTitle(t)}`));
    if (yMissed.length > 0) lines.push(...yMissed.slice(0, 5).map((t) => `❌ ${shortTitle(t)}`));
    if (yCompleted.length > 5) lines.push(`…and ${yCompleted.length - 5} more completed`);
    if (yMissed.length > 5) lines.push(`…and ${yMissed.length - 5} more missed`);
  }

  if (streak >= 2) lines.push("", `🔥 ${streak}-day streak — protect it today.`);

  // Today's priorities
  const priorities: string[] = sortedToday.slice(0, 3).map((t) => shortTitle(t));
  if (pendingLectures > 0 && firstBacklog) {
    priorities.push(`Clear backlog: ${firstBacklog.subject ? `${firstBacklog.subject} — ${firstBacklog.chapter ?? "pending item"}` : firstBacklog.title ?? "pending item"} (${pendingLectures} lecture${pendingLectures === 1 ? "" : "s"} pending)`);
  }
  if (mockSummary && mockSummary.weakest && mockSummary.weakest.avgPct < 60) {
    priorities.push(`Fix ${mockSummary.weakest.subject} — your weakest mock subject`);
  }
  lines.push("", "Today's priorities:");
  if (priorities.length === 0) {
    lines.push("1. Generate today's plan in the AI Planner — it sets the whole day.");
  } else {
    priorities.slice(0, 4).forEach((p, i) => lines.push(`${i + 1}. ${p}`));
  }

  // Mock performance (if available)
  if (mockSummary) {
    lines.push("", `📊 Latest mock "${mockSummary.latest.test_name}": ${mockSummary.pct}% (${mockSummary.latest.obtained_marks}/${mockSummary.latest.total_marks}).`);
  }

  const checkinMissDays = checkins.filter((c) => ((c.missed_tasks as unknown[]) ?? []).length > 0).length;

  // Repeated-miss warning
  if (weekRate !== null && weekRate < 60 && wPlanned.length >= 4) {
    lines.push(
      "",
      `⚠️ Warning: only ${weekRate}% of planned tasks completed this week${last3Missed >= 2 ? ` — ${last3Missed} missed in the last 3 days` : ""}${checkinMissDays >= 2 ? `; you've had misses on ${checkinMissDays} of the last ${checkins.length} check-ins` : ""}. This is becoming a pattern; break it today.`,
    );
  }

  // One actionable mentor suggestion
  let advice: string;
  if (last3Missed >= 2 || (weekRate !== null && weekRate < 50)) {
    advice = "Don't add new backlog today. Clear pending tasks first — a partial win beats another full miss.";
  } else if (pendingLectures > 0 && firstBacklog) {
    const target = firstBacklog.subject ? `${firstBacklog.subject}${firstBacklog.chapter ? `: ${firstBacklog.chapter}` : ""}` : "the top backlog item";
    advice = `Your ${target} backlog is still pending. Clear it before starting new lectures — unfinished lectures block practice and revision downstream.`;
  } else if (mockSummary && mockSummary.weakest && mockSummary.weakest.avgPct < 65) {
    advice = `Put 30 minutes into ${mockSummary.weakest.subject} today — it's pulling your mock average down.`;
  } else if (weaknessMemories.length > 0) {
    advice = `Prioritise ${weaknessMemories[0].value} today — it's on your weak list, so hit it while motivation is fresh.`;
  } else if (sortedToday.length > 0) {
    advice = `Start with "${shortTitle(sortedToday[0])}" — the highest-priority task. Momentum beats motivation.`;
  } else {
    advice = "Generate today's plan first — a clear plan is the single biggest lever you have.";
  }
  lines.push("", "Mentor advice:", `"${advice}"`);

  return {
    message: lines.join("\n"),
    completedTasks: yCompleted.map(taskSummary),
    missedTasks: yMissed.map(taskSummary),
    focusScore,
  };
}
