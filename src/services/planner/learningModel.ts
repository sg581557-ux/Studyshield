import type { PlanTask, StudyStats } from "../../lib/types";
import { db } from "../db";
import { localISODate } from "../../lib/date";

const DEFAULT_DURATIONS = {
  lecture: 120, dpp: 30, module: 45, pyq: 45, revision: 25,
  formula_revision: 20, spaced_revision: 25, study: 45, practice: 45,
  mock_test_review: 30, coaching: 120, school: 360,
};

export function predictedDuration(type: string, stats: StudyStats | null): number {
  if (!stats || stats.data_points < 5) return DEFAULT_DURATIONS[type as keyof typeof DEFAULT_DURATIONS] ?? 45;
  switch (type) {
    case "lecture": return stats.avg_lecture_min > 0 ? Math.round(stats.avg_lecture_min) : DEFAULT_DURATIONS.lecture;
    case "dpp": return stats.avg_dpp_min > 0 ? Math.round(stats.avg_dpp_min) : DEFAULT_DURATIONS.dpp;
    case "module": return stats.avg_module_min > 0 ? Math.round(stats.avg_module_min) : DEFAULT_DURATIONS.module;
    case "pyq": return stats.avg_pyq_min > 0 ? Math.round(stats.avg_pyq_min) : DEFAULT_DURATIONS.pyq;
    case "revision":
    case "spaced_revision": return stats.avg_revision_min > 0 ? Math.round(stats.avg_revision_min) : DEFAULT_DURATIONS.revision;
    default: return DEFAULT_DURATIONS[type as keyof typeof DEFAULT_DURATIONS] ?? 45;
  }
}

export function defaultDuration(type: string): number {
  return DEFAULT_DURATIONS[type as keyof typeof DEFAULT_DURATIONS] ?? 45;
}

interface SubjectPerf { subject: string; completionRate: number; totalTasks: number; }

export function analyzeSubjects(completedTasks: PlanTask[]): { weak: string[]; strong: string[] } {
  const bySubject = new Map<string, { done: number; total: number }>();
  for (const t of completedTasks) {
    const s = t.subject ?? "General";
    const cur = bySubject.get(s) ?? { done: 0, total: 0 };
    cur.total++;
    if (t.completed) cur.done++;
    bySubject.set(s, cur);
  }
  const perfs: SubjectPerf[] = [];
  for (const [subject, { done, total }] of bySubject) {
    if (total >= 3) perfs.push({ subject, completionRate: done / total, totalTasks: total });
  }
  perfs.sort((a, b) => a.completionRate - b.completionRate);
  const weak = perfs.filter((p) => p.completionRate < 0.6).map((p) => p.subject);
  const strong = perfs.filter((p) => p.completionRate >= 0.8).map((p) => p.subject).reverse();
  return { weak, strong };
}

export async function updateStudyStats(): Promise<void> {
  try {
    const recent = await db.getRecentCompletedTasks(30);
    const existing = await db.getStudyStats();

    // Compute streak including both completed tasks AND plan generation (daily_plan_inputs)
    // so generating a plan counts toward streak max 1/day even before any task is completed.
    const planInputs = await db.getAllDailyPlanInputs().catch(() => []);
    const planDates = new Set(planInputs.map((p) => p.plan_date));
    const computedStreak = computeCurrentStreakWithPlans(recent, planDates);
    const streakDays = computedStreak;

    // Sync profile longest_streak when we beat the record
    if (existing) {
      try {
        const { supabase } = await import("../../lib/supabase");
        const { data } = await supabase!.auth.getSession();
        const uid = data.session?.user?.id;
        if (uid) {
          const profile = await db.getProfile(uid).catch(() => null);
          if (profile && computedStreak > (profile.longest_streak ?? 0)) {
            await db.upsertProfile({ id: uid, longest_streak: computedStreak }).catch(() => {});
          }
        }
      } catch {
        // ignore profile sync failures — study_stats still saves
      }
    }

    if (recent.length === 0 && planDates.size === 0) {
      // No data at all — ensure streak 0 if stats row exists
      if (existing && existing.streak_days !== 0) {
        await db.upsertStudyStats({ streak_days: 0 });
      }
      return;
    }

    const byType = new Map<string, { totalMin: number; count: number }>();
    for (const t of recent) {
      const key = t.type;
      const cur = byType.get(key) ?? { totalMin: 0, count: 0 };
      cur.totalMin += t.actual_minutes ?? t.estimated_minutes;
      cur.count++;
      byType.set(key, cur);
    }
    const avg = (type: string) => {
      const e = byType.get(type);
      return e && e.count > 0 ? Math.round(e.totalMin / e.count) : 0;
    };

    const completed = recent.filter((t) => t.completed).length;
    const completionRate = recent.length > 0 ? Math.round((completed / recent.length) * 100) : 0;
    const totalStudyMin = recent.reduce((a, t) => a + (t.actual_minutes ?? t.estimated_minutes), 0);
    const { weak, strong } = analyzeSubjects(recent);

    // Count questions solved: DPPs, modules, PYQs, and practice tasks each
    // represent answered/solved questions when completed.
    const QUESTION_TYPES = new Set(["dpp", "module", "pyq", "practice"]);
    const questionsSolvedThisBatch = recent.filter((t) => t.completed && QUESTION_TYPES.has(t.type)).length;

    await db.upsertStudyStats({
      avg_lecture_min: avg("lecture"),
      avg_dpp_min: avg("dpp"),
      avg_module_min: avg("module"),
      avg_pyq_min: avg("pyq"),
      avg_revision_min: avg("revision") || avg("spaced_revision"),
      avg_focus_session_min: avg("study"),
      completion_rate: completionRate,
      weak_subjects: weak,
      strong_subjects: strong,
      total_study_min: (existing?.total_study_min ?? 0) + totalStudyMin,
      total_tasks_completed: (existing?.total_tasks_completed ?? 0) + completed,
      total_lectures_completed: (existing?.total_lectures_completed ?? 0) + recent.filter((t) => t.type === "lecture" && t.completed).length,
      total_questions_solved: (existing?.total_questions_solved ?? 0) + questionsSolvedThisBatch,
      streak_days: streakDays,
      data_points: (existing?.data_points ?? 0) + recent.length,
    });
  } catch (e) {
    console.error("[learningModel.updateStudyStats] threw", e);
  }
}

export function computeCurrentStreak(tasks: PlanTask[]): number {
  return computeCurrentStreakWithPlans(tasks, new Set());
}

export function computeCurrentStreakWithPlans(tasks: PlanTask[], planDates: Set<string>): number {
  const taskDates = new Set(
    tasks
      .filter((t) => (t.completed || t.task_status === "completed") && t.scheduled_date)
      .map((t) => t.scheduled_date!)
  );
  const dates = new Set<string>([...taskDates, ...planDates]);
  if (dates.size === 0) return 0;
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(today);
  for (let i = 0; i < 365; i++) {
    if (i > 0) d.setDate(d.getDate() - 1);
    const ds = localISODate(d);
    if (dates.has(ds)) streak++;
    else break;
  }
  return streak;
}