/**
 * formula.mjs
 * -----------------------------------------------------------------------------
 * The declarative FormulaBuilder. Data modules call `f({ ... })` with a plain,
 * human-readable seed object and receive a fully-normalized Formula object.
 *
 * The seed intentionally uses friendly key names (expression, mistakes, examTip,
 * freq, meaning, ...) which get mapped onto the canonical Formula shape consumed
 * by the Formula Vault. No positional arrays — adding a field later can never
 * silently shift the meaning of existing rows.
 */

import { formulaId } from './ids.mjs';
import { DIFFICULTY_LEVELS, IMPORTANCE_LEVELS } from './constants.mjs';
import { mapExamRelevance } from './registry.mjs';

/**
 * Normalize a declarative seed into a canonical Formula object.
 * Throws a descriptive Error for invalid/malformed seeds so data errors surface
 * at build time instead of crashing the app later.
 *
 * @param {object} seed
 * @returns {object} normalized Formula (id assigned, enums validated, arrays deduped)
 */
export function f(seed) {
  if (!seed || typeof seed !== 'object') {
    throw new Error('Formula seed must be an object literal.');
  }

  const { subject, chapter, name } = seed;
  if (!subject) throw new Error('Formula seed is missing `subject`.');
  if (!chapter) throw new Error(`Formula seed "${name || '(no name)'}" is missing \`chapter\`.`);
  if (!name) throw new Error(`Formula seed "${subject}/${chapter}" is missing \`name\`.`);
  if (!seed.expression) throw new Error(`Formula seed "${subject}/${chapter}/${name}" is missing \`expression\`.`);

  const difficulty = seed.difficulty || 'medium';
  if (!DIFFICULTY_LEVELS.includes(difficulty)) {
    throw new Error(`"${subject}/${chapter}/${name}" has invalid difficulty "${difficulty}". Allowed: ${DIFFICULTY_LEVELS.join(', ')}.`);
  }

  const importance = seed.importance || 'medium';
  if (!IMPORTANCE_LEVELS.includes(importance)) {
    throw new Error(`"${subject}/${chapter}/${name}" has invalid importance "${importance}". Allowed: ${IMPORTANCE_LEVELS.join(', ')}.`);
  }

  const branch = seed.branch || seed.category || null;
  const exams = [...new Set((seed.exams || []).map((e) => String(e).trim()).filter(Boolean))];

  const variables = (seed.variables || [])
    .map((v) => {
      const symbol = v?.symbol;
      const description = v?.meaning || v?.description || '';
      if (!symbol || !description) return null;
      return { symbol, description, ...(v.unit ? { unit: v.unit } : {}) };
    })
    .filter(Boolean);

  const toUniqueArray = (arr) => [...new Set((Array.isArray(arr) ? arr : arr ? [arr] : []))];

  const NOW = '2025-01-01T00:00:00.000Z';
  const createdAt = seed.createdAt || NOW;
  const updatedAt = seed.updatedAt || createdAt;

  return {
    // Prefer an explicit seed.id so legacy formula ids (e.g. "phy-001") survive
    // migration and existing user favorites keep working.
    id: seed.id || formulaId(subject, chapter, name),
    subject,
    // `category` is kept as an alias of `branch` for backward compatibility with
    // the existing Formula Vault filters (getFormulaCategories uses `category`).
    category: branch,
    branch,
    chapter,
    topic: seed.topic || '',
    name,
    formula: seed.expression,
    latex: seed.latex || undefined,
    description: seed.description || '',
    variables,
    units: seed.units || '',
    conditions: seed.conditions || '',
    notes: seed.notes || '',
    jeeTip: seed.examTip || seed.jeeTip || undefined,
    commonMistakes: toUniqueArray(seed.mistakes || seed.commonMistakes),
    memoryTrick: seed.memoryTrick || '',
    tags: toUniqueArray(seed.tags),
    synonyms: toUniqueArray(seed.synonyms),
    importance,
    difficulty,
    examRelevance: mapExamRelevance(exams),
    exams,
    relatedFormulas: toUniqueArray(seed.related),
    frequentlyUsed: seed.freq === true || seed.frequentlyUsed === true,
    createdAt,
    updatedAt,
  };
}

/**
 * Validate a seed object BEFORE calling f() — used by tests/tooling to surface
 * shape errors with better context.
 * @param {object} seed
 * @returns {string[]} list of problems (empty = valid)
 */
export function validateSeed(seed) {
  const problems = [];
  if (!seed?.subject) problems.push('missing subject');
  if (!seed?.chapter) problems.push('missing chapter');
  if (!seed?.name) problems.push('missing name');
  if (!seed?.expression) problems.push('missing expression');
  return problems;
}

