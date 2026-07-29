import type { UserChapter, StudyStats } from "../../lib/types";

interface RevisionCandidate {
  subject: string; chapter: string; urgency: number; reason: string;
}

const REVISION_INTERVALS = [1, 3, 7, 14, 30];

export function revisionDue(uc: UserChapter): boolean {
  if (uc.status === "completed" || uc.status === "mastered") return false;
  if (uc.revision_pending && uc.revision_pending > 0) return true;
  if (uc.status === "revision_pending" || uc.status === "in_progress" || uc.status === "started") return true;
  return false;
}

function daysSinceCompleted(uc: UserChapter): number {
  if (!uc.updated_at) return 999;
  return Math.max(0, Math.floor((Date.now() - new Date(uc.updated_at).getTime()) / 86400000));
}

export function getRevisionCandidates(
  userChapters: UserChapter[],
  stats: StudyStats | null,
  maxCount: number,
): RevisionCandidate[] {
  const candidates: RevisionCandidate[] = [];
  for (const uc of userChapters) {
    if (!revisionDue(uc)) continue;
    const daysSince = daysSinceCompleted(uc);
    const weakness = 5 - (uc.confidence ?? 3);
    let urgency = 0;
    let reason = "";

    if (uc.status === "in_progress" || uc.status === "started") {
      urgency = 0.9;
      reason = "Recently started — needs reinforcement";
    } else if (uc.revision_pending && uc.revision_pending > 0) {
      urgency = 0.85;
      reason = `${uc.revision_pending} revisions pending`;
    } else if (daysSince <= 2) {
      urgency = 0.7;
      reason = "Fresh chapter — revise soon";
    } else if (daysSince <= 7) {
      urgency = 0.6;
      reason = "First spaced repetition due";
    } else if (daysSince <= 14) {
      urgency = 0.5;
      reason = "Second spaced repetition due";
    } else if (daysSince <= 30) {
      urgency = 0.4;
      reason = "Monthly revision due";
    } else {
      urgency = 0.3;
      reason = "Long-term revision due";
    }
    urgency += weakness * 0.1;
    if (stats?.weak_subjects.includes(uc.subject)) urgency += 0.15;

    candidates.push({ subject: uc.subject, chapter: uc.chapter, urgency: Math.min(1, urgency), reason });
  }
  candidates.sort((a, b) => b.urgency - a.urgency);
  return candidates.slice(0, maxCount);
}

export function shouldScheduleRevision(
  uc: UserChapter,
  lastRevisionDaysAgo: number,
  performance: number,
): boolean {
  const weakness = 5 - (uc.confidence ?? 3);
  let intervalIdx = Math.min(REVISION_INTERVALS.length - 1, Math.floor(lastRevisionDaysAgo / 7));
  if (weakness >= 3) intervalIdx = Math.max(0, intervalIdx - 1);
  if (performance < 0.5) intervalIdx = Math.max(0, intervalIdx - 1);
  return lastRevisionDaysAgo >= REVISION_INTERVALS[intervalIdx];
}
