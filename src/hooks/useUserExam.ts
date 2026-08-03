import { useAuth } from '../context/AuthContext';
import { aliasExamId } from '../services/db';
import { examCatalog } from '../data/exams';

/**
 * Resolve a stored profile exam value to a canonical examCatalog id.
 * The profile stores aliased ids (e.g. "jee" for JEE Main/Advanced) or raw
 * catalog ids ("wbjee", "neet-ug", ...). Falls back to null when unknown.
 */
export function normalizeExamId(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const aliased = aliasExamId(stored);
  if (aliased === 'jee') return 'jee-main';
  if (examCatalog.some((e) => e.id === aliased)) return aliased;
  const byName = examCatalog.find((e) => e.name.toLowerCase() === aliased.toLowerCase());
  return byName?.id ?? null;
}

export interface UserExam {
  /** Canonical exam id from the user's profile (null when not set / unknown). */
  examId: string | null;
  /** Display name of the resolved exam. */
  examName: string | null;
}

/**
 * Reactive hook for the user's target exam (the exam chosen during onboarding).
 * Re-renders automatically whenever the profile is refreshed, so a target-exam
 * change in Settings/Profile propagates instantly to Formula Vault consumers.
 */
export function useUserExam(): UserExam {
  const { profile } = useAuth();
  const examId = normalizeExamId(profile?.target_exam);
  const exam = examId ? examCatalog.find((e) => e.id === examId) ?? null : null;
  return { examId, examName: exam?.name ?? null };
}
