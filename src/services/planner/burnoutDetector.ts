import type { PlanTask, EnergyLevel } from "../../lib/types";

export interface BurnoutSignal {
  detected: boolean;
  level: "none" | "mild" | "moderate" | "severe";
  reasons: string[];
  recommendations: string[];
}

export function detectBurnout(
  recentTasks: PlanTask[],
  recentEnergyLevels: EnergyLevel[],
  studyHoursTrend: number[],
): BurnoutSignal {
  const reasons: string[] = [];
  const recommendations: string[] = [];
  let score = 0;

  if (recentTasks.length >= 5) {
    const skipped = recentTasks.filter((t) => t.task_status === "skipped" || t.task_status === "postponed").length;
    const skipRate = skipped / recentTasks.length;
    if (skipRate > 0.4) { score += 3; reasons.push(`${Math.round(skipRate * 100)}% of tasks skipped recently`); }
    else if (skipRate > 0.25) { score += 1.5; reasons.push(`${Math.round(skipRate * 100)}% of tasks skipped`); }

    const completionRate = recentTasks.filter((t) => t.completed).length / recentTasks.length;
    if (completionRate < 0.4 && recentTasks.length >= 5) { score += 2; reasons.push("Low completion rate"); recommendations.push("Reduce today's workload by 25%"); }
  }

  const lowEnergyDays = recentEnergyLevels.filter((e) => e === "low").length;
  if (lowEnergyDays >= 3) { score += 2; reasons.push("Low energy for several days"); recommendations.push("Schedule lighter tasks and more breaks"); }

  const longSessions = recentTasks.filter((t) => (t.actual_minutes ?? t.estimated_minutes) > 180).length;
  if (longSessions >= 3) { score += 1.5; reasons.push("Very long study sessions detected"); recommendations.push("Break sessions into shorter blocks"); }

  const avgHours = studyHoursTrend.length > 0 ? studyHoursTrend.reduce((a, b) => a + b, 0) / studyHoursTrend.length : 0;
  if (avgHours > 10) { score += 1; reasons.push("Sustained high study hours"); recommendations.push("Include more buffer time"); }

  if (studyHoursTrend.length >= 4) {
    const recent = studyHoursTrend.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
    const older = studyHoursTrend.slice(2).reduce((a, b) => a + b, 0) / (studyHoursTrend.length - 2);
    if (recent < older * 0.5) { score += 2; reasons.push("Rapid decrease in study output"); recommendations.push("Take a recovery day"); }
  }

  let level: BurnoutSignal["level"] = "none";
  if (score >= 5) level = "severe";
  else if (score >= 3) level = "moderate";
  else if (score >= 1.5) level = "mild";

  if (level === "severe") recommendations.push("Strongly recommend a half-day with only revision and light review");
  else if (level === "moderate") recommendations.push("Reduce workload by 30-40%, increase revision and buffer");
  else if (level === "mild") recommendations.push("Add an extra break and reduce one task");

  return { detected: score >= 1.5, level, reasons, recommendations };
}

export function applyBurnoutAdjustments(
  requestedMinutes: number,
  energy: EnergyLevel,
  burnout: BurnoutSignal,
): number {
  let adjusted = requestedMinutes;
  if (burnout.level === "severe") adjusted = Math.round(requestedMinutes * 0.5);
  else if (burnout.level === "moderate") adjusted = Math.round(requestedMinutes * 0.65);
  else if (burnout.level === "mild") adjusted = Math.round(requestedMinutes * 0.8);
  if (energy === "low") adjusted = Math.round(adjusted * 0.75);
  return Math.max(60, adjusted);
}
