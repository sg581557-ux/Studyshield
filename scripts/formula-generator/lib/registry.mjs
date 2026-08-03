/**
 * registry.mjs
 * -----------------------------------------------------------------------------
 * Exam lookup helpers + the legacy `examRelevance` mapping.
 * Kept separate from constants.mjs so it can grow (subject->branch registries,
 * per-exam subject lists, etc.) without bloating the enum module.
 */

import { EXAMS } from './constants.mjs';

const EXAMS_BY_ID = new Map(EXAMS.map((e) => [e.id, e]));
const EXAMS_BY_ALIAS = new Map();
for (const e of EXAMS) {
  EXAMS_BY_ALIAS.set(e.id.toLowerCase(), e);
  EXAMS_BY_ALIAS.set(e.name.toLowerCase(), e);
  for (const a of e.aliases || []) EXAMS_BY_ALIAS.set(a.toLowerCase(), e);
}

/**
 * @param {string} id
 * @returns {{ id: string, name: string, category: string } | undefined}
 */
export function getExamById(id) {
  return EXAMS_BY_ID.get(id);
}

/**
 * Resolve a user-facing name / alias to a canonical exam id (or undefined).
 * @param {string} input
 * @returns {string | undefined}
 */
export function resolveExamId(input) {
  if (!input) return undefined;
  const hit = EXAMS_BY_ALIAS.get(String(input).toLowerCase().trim());
  return hit?.id;
}

/**
 * @param {string} id
 * @returns {string}
 */
export function getExamName(id) {
  return EXAMS_BY_ID.get(id)?.name || id;
}

/**
 * @param {string} id
 * @returns {boolean}
 */
export function isKnownExam(id) {
  return EXAMS_BY_ID.has(id);
}

/**
 * @returns {Array<{ id: string, name: string, category: string }>}
 */
export function getAllExams() {
  return [...EXAMS];
}

/**
 * Map an exams[] array to the legacy single-value `examRelevance` field used by
 * the Formula Vault's original filter. Unknown exams fall back to 'School'.
 * @param {string[]} exams
 * @returns {'JEE Main' | 'JEE Advanced' | 'Both' | 'NEET' | 'School'}
 */
export function mapExamRelevance(exams = []) {
  if (!exams || exams.length === 0) return 'School';
  if (exams.includes('jee-main') && exams.includes('jee-advanced')) return 'Both';
  if (exams.includes('jee-main')) return 'JEE Main';
  if (exams.includes('jee-advanced')) return 'JEE Advanced';
  if (exams.includes('neet-ug')) return 'NEET';
  return 'School';
}

