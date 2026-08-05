import type { UserChapter, BacklogItem, RecoveryItem, Profile } from "../../lib/types";

interface PriorityFactors {
  examWeightage: number;
  deadline: number;
  remainingWork: number;
  difficulty: number;
  weaknessScore: number;
  daysIgnored: number;
  recoveryUrgency: number;
  coachingProgress: number;
  revisionDue: number;
}

const WEIGHTS = {
  examWeightage: 1.5,
  deadline: 2.0,
  remainingWork: 1.2,
  difficulty: 0.8,
  weaknessScore: 1.8,
  daysIgnored: 1.0,
  recoveryUrgency: 1.3,
  coachingProgress: 0.6,
  revisionDue: 1.1,
};

function normalize(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(1, Math.max(0, value / max));
}

function daysUntilDeadline(deadline: string | null | undefined): number {
  if (!deadline) return 365;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dl = new Date(deadline + "T00:00:00");
  const diff = Math.ceil((dl.getTime() - now.getTime()) / 86400000);
  return Math.max(0, diff);
}

function daysSinceUpdated(updatedAt: string | null | undefined): number {
  if (!updatedAt) return 0;
  const now = new Date();
  const u = new Date(updatedAt);
  return Math.max(0, Math.floor((now.getTime() - u.getTime()) / 86400000));
}

export function computeChapterPriority(
  uc: UserChapter,
  _backlog: BacklogItem[],
  recovery: RecoveryItem[],
  profile: Profile,
): { score: number; factors: PriorityFactors } {
  const examWeightage = normalize((uc.progress?.exam_weightage as number) ?? 5, 10);
  const daysLeft = daysUntilDeadline((uc.progress?.deadline as string) ?? null);
  const deadlineScore = daysLeft <= 7 ? 1 : daysLeft <= 30 ? 0.7 : daysLeft <= 90 ? 0.4 : 0.1;
  const remainingWork = normalize(
    (uc.lectures_remaining ?? 0) + (uc.questions_remaining ?? 0) + (uc.revision_pending ?? 0),
    50,
  );
  const difficulty = normalize((uc.progress?.difficulty as number) ?? 3, 5);
  const weaknessScore = normalize(5 - (uc.confidence ?? 3), 5);
  const daysIgnored = normalize(daysSinceUpdated(uc.updated_at), 14);
  const recoveryUrgency = normalize(
    recovery.filter((r) => r.subject === uc.subject && r.chapter === uc.chapter && r.recovery_status === "pending").length,
    10,
  );
  const coachingProgress = profile.coaching_enabled ? 0.5 : 0;
  const revisionDue = normalize(uc.revision_pending ?? 0, 5);

  const factors: PriorityFactors = {
    examWeightage, deadline: deadlineScore, remainingWork, difficulty,
    weaknessScore, daysIgnored, recoveryUrgency, coachingProgress, revisionDue,
  };

  const score =
    examWeightage * WEIGHTS.examWeightage +
    deadlineScore * WEIGHTS.deadline +
    remainingWork * WEIGHTS.remainingWork +
    difficulty * WEIGHTS.difficulty +
    weaknessScore * WEIGHTS.weaknessScore +
    daysIgnored * WEIGHTS.daysIgnored +
    recoveryUrgency * WEIGHTS.recoveryUrgency +
    coachingProgress * WEIGHTS.coachingProgress +
    revisionDue * WEIGHTS.revisionDue;

  return { score: Math.round(score * 100) / 100, factors };
}

export function rankChapters(
  userChapters: UserChapter[],
  backlog: BacklogItem[],
  recovery: RecoveryItem[],
  profile: Profile,
): { subject: string; chapter: string; score: number; status: string }[] {
  return userChapters
    .map((uc) => {
      const { score } = computeChapterPriority(uc, backlog, recovery, profile);
      return { subject: uc.subject, chapter: uc.chapter, score, status: uc.status };
    })
    .sort((a, b) => b.score - a.score);
}

export function computeTaskPriority(
  type: string,
  subject: string | null,
  chapter: string | null,
  chapterRank: { subject: string; chapter: string; score: number }[],
  recovery: RecoveryItem[],
  examTomorrow: boolean,
): number {
  // Base tiers follow the mentor priority ladder (P1 → P7):
  // coaching/school/today's lecture > weak topics > modules > DPPs > PYQs > revision > backlog filler.
  let base = 5;
  if (type === "coaching" || type === "school") base = 10;
  else if (type === "lecture") base = 9;
  else if (type === "mistake_analysis" || type === "mock_review") base = 8.5;
  else if (type === "pyq") base = examTomorrow ? 9.5 : 7.5;
  else if (type === "module") base = 7.5;
  else if (type === "dpp") base = 7;
  else if (type === "revision" || type === "spaced_revision") base = examTomorrow ? 8 : 7;
  else if (type === "practice") base = 6;
  else if (type === "formula_revision") base = 4;
  else if (type === "study") base = 4;

  let chapterBoost = 0;
  if (subject && chapter) {
    const rank = chapterRank.find((c) => c.subject === subject && c.chapter === chapter);
    if (rank) chapterBoost = Math.min(3, rank.score / 5);
  }

  let recoveryBoost = 0;
  if (subject) {
    const pendingRecovery = recovery.filter((r) => r.subject === subject && r.recovery_status === "pending").length;
    recoveryBoost = Math.min(2, pendingRecovery * 0.3);
  }

  return Math.round((base + chapterBoost + recoveryBoost) * 100) / 100;
}
