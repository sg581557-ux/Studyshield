// ============================================================
// Student situation detection for voice tone adaptation.
//
// The AI Mentor logic is untouched — this module only reads the
// same student context the mentor already uses, and classifies
// the student's moment so the VOICE can match it:
//
//   behind          → encouraging but accountable
//   achieved        → celebrate progress
//   stressed        → calm, supportive
//   low-productivity→ motivating push
//   neutral         → personality as chosen in settings
// ============================================================

import type { MentorContext } from "../mentor";

export type MentorSituation = "neutral" | "behind" | "achieved" | "stressed" | "low-productivity";

/** Words that signal the student is talking about feeling stressed. */
const STRESS_RE = /tired|exhaust|stress|overwhelm|anxious|anxiety|burn(ed|out)?|depress|panic|pressure|tension|pareshan|thakan|thak gaya|sab kuch|gabbar|bhavnao|mentally|headache|frustrat|demotivat|give up|quit|chhod|haar/i;

/**
 * Classify the student's current situation from the mentor context
 * (the same data bundle every mentor reply is grounded in) plus the
 * user's latest message, if available. `now` is injectable for tests.
 */
export function detectSituation(ctx: MentorContext | null, userText?: string, now: Date = new Date()): MentorSituation {
  // What the student just said wins — the mentor should sound calm
  // the moment someone talks about being stressed or overwhelmed.
  if (userText && STRESS_RE.test(userText)) return "stressed";

  if (!ctx) return "neutral";

  const c = ctx;

  // Achieved: completed the full plan today, or a strong week with a streak.
  const todayAllDone =
    c.today.plannedTaskCount > 0 && c.today.completedCount >= c.today.plannedTaskCount;
  const weekGreat = c.last7Days.completionRate !== null && c.last7Days.completionRate >= 75 && c.streak >= 3;
  if (todayAllDone || weekGreat) return "achieved";

  // Behind: poor weekly completion, heavy backlog, a half-finished day
  // (only once the day is well advanced — 0/4 tasks at 8am is normal),
  // or a big recovery pile.
  const weekLow = c.last7Days.completionRate !== null && c.last7Days.completionRate < 50;
  const backlogHeavy = c.backlog.pendingItems >= 6;
  const dayAdvanced = now.getHours() >= 14;
  const todayMissed =
    dayAdvanced &&
    c.today.plannedTaskCount > 0 &&
    c.today.completedCount < Math.ceil(c.today.plannedTaskCount / 2);
  const recoveryHeavy = c.recovery.pendingCount >= 5;
  if (weekLow || backlogHeavy || todayMissed || recoveryHeavy) return "behind";

  // Low productivity: no focus sessions all week, or far below the
  // daily study goal on average.
  const goalMinutes = c.dailyGoalHours * 60;
  const noFocusSessions = c.focus.sessionsLast7d === 0;
  const farBelowGoal =
    goalMinutes > 0 && c.last7Days.avgDailyStudyMinutes !== null && c.last7Days.avgDailyStudyMinutes < goalMinutes * 0.4;
  if (noFocusSessions || farBelowGoal) return "low-productivity";

  return "neutral";
}
