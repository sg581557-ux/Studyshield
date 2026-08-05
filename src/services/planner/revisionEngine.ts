import type { UserChapter, StudyStats } from "../../lib/types";

export interface RevisionCandidate {
  subject: string;
  chapter: string;
  urgency: number;
  reason: string;
  revisionNumber: number;
  dueInDays: number;
}

export interface RevisionEvent {
  subject: string;
  chapter: string;
  revisionNumber: number;
  dueInDays: number;
  label: string;
}

// Automatic spaced-repetition schedule: 1 → 3 → 7 → 15 → 30 → 60 days.
export const REVISION_INTERVALS = [1, 3, 7, 15, 30, 60];

function daysSince(ts: string | null | undefined): number {
  if (!ts) return 999;
  return Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 86400000));
}

function adjustedInterval(interval: number, weakness: number): number {
  // Weaker chapters are revised sooner (never below 1 day).
  return Math.max(1, interval - Math.round(weakness * 0.5));
}

function weaknessOf(uc: UserChapter): number {
  return Math.max(0, Math.min(4, 5 - (uc.confidence ?? 3)));
}

function revisionNumberDue(uc: UserChapter): number {
  const days = daysSince(uc.updated_at);
  const weakness = weaknessOf(uc);
  let n = 0;
  for (const iv of REVISION_INTERVALS) {
    if (days >= adjustedInterval(iv, weakness)) n++;
  }
  return Math.min(REVISION_INTERVALS.length, n);
}

export function revisionDue(uc: UserChapter): boolean {
  if (uc.status === "completed" || uc.status === "mastered") {
    return revisionNumberDue(uc) > 0;
  }
  if (uc.revision_pending && uc.revision_pending > 0) return true;
  if (uc.status === "revision_pending" || uc.status === "in_progress" || uc.status === "started") return true;
  return false;
}

export function getRevisionCandidates(
  userChapters: UserChapter[],
  stats: StudyStats | null,
  maxCount: number,
): RevisionCandidate[] {
  const candidates: RevisionCandidate[] = [];
  for (const uc of userChapters) {
    if (!revisionDue(uc)) continue;
    const days = daysSince(uc.updated_at);
    const weakness = weaknessOf(uc);
    const n = revisionNumberDue(uc);
    const pending = uc.revision_pending ?? 0;
    const isOldChapter = uc.status === "completed" || uc.status === "mastered";

    let urgency: number;
    let reason: string;
    let revisionNumber = Math.max(1, n);

    if (!isOldChapter && pending > 0) {
      urgency = 0.75 + Math.min(0.25, pending * 0.1);
      revisionNumber = Math.max(1, n + 1);
      reason = pending > 1 ? `${pending} spaced revisions due now` : "Spaced revision due now";
    } else if (n >= REVISION_INTERVALS.length) {
      urgency = 0.95;
      reason = "Long-term (60-day) revision due";
    } else if (n > 0) {
      const interval = adjustedInterval(REVISION_INTERVALS[n - 1], weakness);
      urgency = 0.6 + (n * 0.06) + (days >= interval ? 0.15 : 0);
      revisionNumber = n;
      reason = `Revision #${n} due (${REVISION_INTERVALS[n - 1]}-day gap)`;
    } else if (days >= adjustedInterval(REVISION_INTERVALS[0], weakness)) {
      urgency = 0.7;
      reason = "Fresh chapter — first revision due";
    } else {
      continue;
    }

    urgency = Math.min(1, urgency + weakness * 0.06);
    if (stats?.weak_subjects.includes(uc.subject)) urgency = Math.min(1, urgency + 0.15);

    candidates.push({
      subject: uc.subject,
      chapter: uc.chapter,
      urgency: Math.round(urgency * 100) / 100,
      reason,
      revisionNumber,
      dueInDays: 0,
    });
  }
  candidates.sort((a, b) => b.urgency - a.urgency);
  return candidates.slice(0, maxCount);
}

export function getUpcomingRevisionSchedule(
  userChapters: UserChapter[],
  stats: StudyStats | null,
  horizonDays = 14,
): RevisionEvent[] {
  const events: RevisionEvent[] = [];
  for (const uc of userChapters) {
    if (uc.status !== "completed" && uc.status !== "mastered") continue;
    const days = daysSince(uc.updated_at);
    const weakness = weaknessOf(uc);
    for (let i = 0; i < REVISION_INTERVALS.length; i++) {
      const dueIn = adjustedInterval(REVISION_INTERVALS[i], weakness) - days;
      if (dueIn >= 0 && dueIn <= horizonDays) {
        const skip = stats?.weak_subjects.includes(uc.subject);
        events.push({
          subject: uc.subject,
          chapter: uc.chapter,
          revisionNumber: i + 1,
          dueInDays: dueIn,
          label: `Rev #${i + 1} · ${uc.chapter}${skip ? " · weak" : ""}`,
        });
      }
    }
  }
  events.sort((a, b) => a.dueInDays - b.dueInDays);
  return events.slice(0, 6);
}

export function shouldScheduleRevision(
  uc: UserChapter,
  lastRevisionDaysAgo: number,
  performance: number,
): boolean {
  const weakness = weaknessOf(uc);
  const threshold = adjustedInterval(REVISION_INTERVALS[0], weakness);
  if (weakness >= 3) return lastRevisionDaysAgo >= threshold;
  if (performance < 0.5) return lastRevisionDaysAgo >= threshold;
  return lastRevisionDaysAgo >= REVISION_INTERVALS[0];
}
