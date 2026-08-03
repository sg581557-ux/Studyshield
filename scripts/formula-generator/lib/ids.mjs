/**
 * ids.mjs
 * -----------------------------------------------------------------------------
 * Deterministic identifier helpers. Formula ids are derived from
 * (subject, chapter, name) so they are STABLE across regenerations — user
 * favorites/revision lists that reference ids never break.
 */

const SUBJECT_CODES = {
  Physics: 'phy',
  Chemistry: 'chm',
  Mathematics: 'mth',
  Biology: 'bio',
  'Quantitative Aptitude': 'qnt',
  Accounts: 'acc',
  Economics: 'eco',
  'Business Studies': 'bsn',
  'Engineering Mathematics': 'eng',
  Geography: 'geo',
};

/**
 * Slugify any string into a url/file-friendly kebab-case token.
 * @param {unknown} value
 * @returns {string}
 */
export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

/**
 * Short stable prefix for a subject (used in formula ids).
 * @param {string} subject
 * @returns {string}
 */
export function subjectCode(subject) {
  return SUBJECT_CODES[subject] || slugify(subject).slice(0, 4) || 'gen';
}

/**
 * Deterministic formula id derived from (subject, chapter, name).
 * Uniqueness is guaranteed by the generator's dedupe step, which enforces
 * (subject, chapter, name) as the canonical key.
 * @param {string} subject
 * @param {string} chapter
 * @param {string} name
 * @returns {string}
 */
export function formulaId(subject, chapter, name) {
  return `${subjectCode(subject)}-${slugify(chapter)}-${slugify(name)}`;
}

/**
 * Camel-cased exported variable name for a subject's TS data file,
 * e.g. "Quantitative Aptitude" -> "quantitativeAptitudeFormulas".
 * @param {string} subject
 * @returns {string}
 */
export function toVarName(subject) {
  const camel = slugify(subject).replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
  return `${camel}Formulas`;
}

/**
 * File name for a subject's TS data file, e.g. "quantitative-aptitude.ts".
 * @param {string} subject
 * @returns {string}
 */
export function toFileName(subject) {
  return `${slugify(subject)}.ts`;
}

