import type { PlanTask, RecoveryItemInput } from "../../lib/types";
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
}

export async function getRecoveryTasksForDay(maxMinutes: number): Promise<RecoveryTaskWithId[]> {
  const pending = await db.getRecoveryItems("pending");
  if (pending.length === 0) return [];
  pending.sort((a, b) => {
    const pa = a.priority === "high" ? 0 : a.priority === "medium" ? 1 : 2;
    const pb = b.priority === "high" ? 0 : b.priority === "medium" ? 1 : 2;
    if (pa !== pb) return pa - pb;
    return a.times_rescheduled - b.times_rescheduled;
  });
  const selected: RecoveryTaskWithId[] = [];
  let total = 0;
  for (const item of pending) {
    if (total + item.estimated_minutes > maxMinutes) continue;
    selected.push({
      recovery_id: item.id,
      title: `Recovery: ${item.title}`,
      subject: item.subject,
      chapter: item.chapter,
      task_type: item.task_type,
      estimated_minutes: item.estimated_minutes,
      priority: item.priority,
      difficulty: item.difficulty ?? undefined,
      reason: item.reason,
      date_missed: item.date_missed,
      original_task_id: item.original_task_id,
    });
    total += item.estimated_minutes;
    try { await db.markRecoveryScheduled(item.id, new Date().toISOString().slice(0, 10)); } catch {}
  }
  return selected;
}

export async function markRecoveryCompleted(task: PlanTask): Promise<void> {
  const ref = task.tracker_ref as { recovery_id?: string } | null;
  if (!ref?.recovery_id) return;
  try { await db.markRecoveryRecovered(ref.recovery_id); } catch (e) { console.error("[recoveryEngine] markRecoveryCompleted", e); }
}
