import type { PlanTask, RecoveryItem, RecoveryItemInput } from "../../lib/types";
import { db } from "../db";

export async function moveMissedTasksToRecovery(date: string): Promise<number> {
  const missed = await db.getMissedTasks(date);
  let count = 0;
  for (const task of missed) {
    if (task.task_status === "cancelled") continue;
    const reason = task.reschedule_reason ?? "Could not fit in available time";
    const recoveryItem: RecoveryItemInput = {
      title: task.title,
      subject: task.subject,
      chapter: task.chapter,
      task_type: task.type,
      estimated_minutes: task.estimated_minutes,
      priority: task.priority,
      reason,
      date_missed: date,
      original_task_id: task.id || null,
    };
    try {
      await db.addRecoveryItem(recoveryItem);
      if (task.id) await db.setTaskStatus(task.id, "postponed");
      count++;
    } catch (e) {
      console.error("[recoveryEngine] failed to add recovery item", e);
    }
  }
  if (count > 0) console.info(`[recoveryEngine] moved ${count} missed tasks to recovery for ${date}`);
  return count;
}

export interface RecoveryTaskWithId extends RecoveryItemInput {
  recovery_id: string;
  times_rescheduled: number;
}

const MICRO_SPLIT_AFTER_SKIPS = 3;
const MICRO_MAX_MIN = 20;

function splitIntoMicroTasks(item: RecoveryItem): RecoveryTaskWithId[] {
  // Missed 3+ times: never keep pushing the same block. Break it into
  // smaller, easier wins and rebuild the student's confidence.
  const minutes = Math.max(10, Math.min(MICRO_MAX_MIN, item.estimated_minutes));
  const chunks = Math.max(1, Math.min(3, Math.round(item.estimated_minutes / minutes)));
  const out: RecoveryTaskWithId[] = [];
  for (let i = 0; i < chunks; i++) {
    out.push({
      recovery_id: item.id,
      title: `Recovery: ${item.title} (part ${i + 1}/${chunks})`,
      subject: item.subject,
      chapter: item.chapter,
      task_type: item.task_type,
      estimated_minutes: minutes,
      priority: item.priority,
      difficulty: "easy",
      reason: `${item.reason ?? "Missed task"} · skipped ${item.times_rescheduled}×, split into micro tasks`,
      date_missed: item.date_missed,
      original_task_id: item.original_task_id,
      times_rescheduled: item.times_rescheduled,
    });
  }
  return out;
}

export async function getRecoveryTasksForDay(maxMinutes: number): Promise<RecoveryTaskWithId[]> {
  const pending = await db.getRecoveryItems("pending");
  if (pending.length === 0) return [];

  const rank = (p: RecoveryItem) => {
    const pri = p.priority === "high" ? 0 : p.priority === "medium" ? 1 : 2;
    return pri * 100 - Math.min(20, p.times_rescheduled);
  };
  pending.sort((a, b) => rank(a) - rank(b));

  const selected: RecoveryTaskWithId[] = [];
  const scheduledIds = new Set<string>();
  let total = 0;
  for (const item of pending) {
    if (total >= maxMinutes) break;
    const tasks = item.times_rescheduled >= MICRO_SPLIT_AFTER_SKIPS
      ? splitIntoMicroTasks(item)
      : [{
          recovery_id: item.id,
          title: `Recovery: ${item.title}`,
          subject: item.subject,
          chapter: item.chapter,
          task_type: item.task_type,
          estimated_minutes: item.estimated_minutes,
          priority: item.priority,
          difficulty: item.difficulty ?? undefined,
          reason: item.reason ?? undefined,
          date_missed: item.date_missed,
          original_task_id: item.original_task_id,
          times_rescheduled: item.times_rescheduled,
        }];
    for (const t of tasks) {
      if (total + t.estimated_minutes > maxMinutes) continue;
      selected.push(t);
      total += t.estimated_minutes;
      scheduledIds.add(item.id);
    }
  }
  if (scheduledIds.size > 0) {
    const today = new Date().toISOString().slice(0, 10);
    for (const id of scheduledIds) {
      try { await db.markRecoveryScheduled(id, today); } catch {}
    }
  }
  return selected;
}

export async function markRecoveryCompleted(task: PlanTask): Promise<void> {
  const ref = task.tracker_ref as { recovery_id?: string } | null;
  if (!ref?.recovery_id) return;
  try { await db.markRecoveryRecovered(ref.recovery_id); } catch (e) { console.error("[recoveryEngine] markRecoveryCompleted", e); }
}
