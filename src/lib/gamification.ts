import type { Achievement, Task, FocusSession, Subject, Formula, PYQAttempt, MockTest, User } from "./types";
import { ACHIEVEMENTS } from "./constants";

export interface Stats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  streak: number;
  totalFocusMinutes: number;
  todayFocusMinutes: number;
  totalXP: number;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function computeStats(tasks: Task[], focusSessions: FocusSession[], user: User | null): Stats {
  const completed = tasks.filter((t) => t.status === "completed");
  const pending = tasks.filter((t) => t.status === "pending");
  const today = new Date();
  const todayFocus = focusSessions.filter((f) => isSameDay(new Date(f.date), today)).reduce((s, f) => s + f.minutes, 0);
  const totalFocus = focusSessions.reduce((s, f) => s + f.minutes, 0);

  const focusDates = new Set(focusSessions.map((f) => dayKey(new Date(f.date))));
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    if (focusDates.has(dayKey(d))) streak++;
    else if (i > 0) break;
  }

  return {
    totalTasks: tasks.length, completedTasks: completed.length, pendingTasks: pending.length,
    streak, totalFocusMinutes: totalFocus, todayFocusMinutes: todayFocus, totalXP: user?.xp || 0,
  };
}

type MetricKey = "xp" | "tasks" | "focusMinutes" | "streak" | "subjects" | "formulas" | "pyqs" | "mocks";

export function checkAchievements(
  current: Achievement[],
  stats: Stats,
  subjects: Subject[],
  formulas: Formula[],
  pyqAttempts: PYQAttempt[],
  mockTests: MockTest[],
): Achievement[] {
  const metrics: Record<MetricKey, number> = {
    xp: stats.totalXP,
    tasks: stats.completedTasks,
    focusMinutes: stats.totalFocusMinutes,
    streak: stats.streak,
    subjects: subjects.length,
    formulas: formulas.filter((f) => f.isBookmarked).length,
    pyqs: pyqAttempts.reduce((s, a) => s + a.solved, 0),
    mocks: mockTests.length,
  };
  const now = new Date().toISOString();
  return ACHIEVEMENTS.map((def) => {
    const existing = current.find((a) => a.id === def.id);
    const value = metrics[def.metric as MetricKey] ?? 0;
    if (value >= def.threshold) {
      return existing?.unlockedAt ? existing : { ...def, unlockedAt: existing?.unlockedAt || now };
    }
    return { ...def, unlockedAt: null };
  });
}
