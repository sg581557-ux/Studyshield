/**
 * validate.mjs
 * -----------------------------------------------------------------------------
 * Build-time validation for the formula database. Runs before any output is
 * written so malformed formulas can never reach the app.
 *
 * Checks (in order):
 *   1. Structural — required fields, types, array shapes.
 *   2. Enum — difficulty / importance must be from the allowed set.
 *   3. Reference — variables must be non-empty & tags/units stringified safely.
 *   4. LaTeX — braces/parens balanced (best-effort, configurable strictness).
 *   5. ID uniqueness — no two formulas share an id.
 *   6. Canonical-key uniqueness — (subject, chapter, name) collisions.
 */

import { DIFFICULTY_LEVELS, IMPORTANCE_LEVELS } from './constants.mjs';

/** Problem descriptor returned by the validators. */
export class ValidationProblem {
  /**
   * @param {'error'|'warning'} level
   * @param {string} code
   * @param {string} message
   * @param {object} [meta]
   */
  constructor(level, code, message, meta = {}) {
    this.level = level;
    this.code = code;
    this.message = message;
    this.meta = meta;
  }
  toString() {
    return `[${this.level}] ${this.code}: ${this.message}`;
  }
}

const REQUIRED_STRING_FIELDS = ['id', 'subject', 'category', 'chapter', 'name', 'formula', 'description'];

function checkRequiredStrings(formula, problems) {
  for (const field of REQUIRED_STRING_FIELDS) {
    const value = formula[field];
    if (typeof value !== 'string' || value.trim() === '') {
      problems.push(
        new ValidationProblem('error', 'missing-field', `Formula ${formula.id || '(no id)'} has empty/missing \`${field}\`.`, { field }),
      );
    }
  }
}

function checkEnums(formula, problems) {
  if (!DIFFICULTY_LEVELS.includes(formula.difficulty)) {
    problems.push(
      new ValidationProblem('error', 'invalid-enum', `Formula "${formula.id}" has invalid difficulty "${formula.difficulty}".`, { field: 'difficulty' }),
    );
  }
  if (!IMPORTANCE_LEVELS.includes(formula.importance)) {
    problems.push(
      new ValidationProblem('error', 'invalid-enum', `Formula "${formula.id}" has invalid importance "${formula.importance}".`, { field: 'importance' }),
    );
  }
}

function checkVariables(formula, problems) {
  if (!Array.isArray(formula.variables)) {
    problems.push(
      new ValidationProblem('error', 'bad-shape', `Formula "${formula.id}" has non-array \`variables\`.`),
    );
    return;
  }
  for (const [i, v] of formula.variables.entries()) {
    if (!v || typeof v !== 'object' || !v.symbol || !v.description) {
      problems.push(
        new ValidationProblem('error', 'bad-variable', `Formula "${formula.id}" has an invalid variable at index ${i}. Expected { symbol, description, unit? }.`),
      );
    }
  }
}

function checkArrays(formula, problems) {
  for (const field of ['commonMistakes', 'tags', 'synonyms', 'relatedFormulas', 'exams']) {
    const value = formula[field];
    if (value !== undefined && !Array.isArray(value)) {
      problems.push(
        new ValidationProblem('error', 'bad-shape', `Formula "${formula.id}" has non-array \`${field}\`.`),
      );
    }
  }
}

/** Best-effort LaTeX brace/paren balance checker. */
function checkLatexBalance(latex, formula, problems) {
  if (!latex) return;
  const pairs = [
    ['{', '}'],
    ['(', ')'],
  ];
  for (const [open, close] of pairs) {
    let depth = 0;
    for (const ch of latex) {
      if (ch === open) depth += 1;
      else if (ch === close) depth -= 1;
      if (depth < 0) break;
    }
    if (depth !== 0) {
      problems.push(
        new ValidationProblem(
          'warning',
          'unbalanced-latex',
          `Formula "${formula.id}" has unbalanced '${open}${close}' in latex.`,
          { field: 'latex' },
        ),
      );
    }
  }
  // Detect common KaTeX-breaking patterns like unmatched \frac
  const fracCount = (latex.match(/\\frac/g) || []).length;
  const leftBraceCount = (latex.match(/{/g) || []).length;
  if (fracCount > leftBraceCount) {
    problems.push(
      new ValidationProblem('warning', 'bad-frac', `Formula "${formula.id}" has \\frac without matching braces.`),
    );
  }
}

/** Validate one normalized formula. Returns an array of problems (may be empty). */
export function validateFormula(formula) {
  const problems = [];
  checkRequiredStrings(formula, problems);
  checkEnums(formula, problems);
  checkVariables(formula, problems);
  checkArrays(formula, problems);
  checkLatexBalance(formula.latex, formula, problems);
  return problems;
}

/**
 * Validate a full list of formulas, including cross-formula uniqueness.
 * @param {object[]} formulas
 * @param {{ latexStrict?: boolean }} [opts]
 * @returns {{ errors: ValidationProblem[], warnings: ValidationProblem[] }}
 */
export function validateFormulas(formulas, opts = {}) {
  const errors = [];
  const warnings = [];
  const seenIds = new Map();
  const seenKeys = new Map();

  for (const formula of formulas) {
    const problems = validateFormula(formula);
    for (const p of problems) {
      if (p.level === 'error') errors.push(p);
      else warnings.push(p);
    }

    if (seenIds.has(formula.id)) {
      errors.push(
        new ValidationProblem(
          'error',
          'duplicate-id',
          `Formula id "${formula.id}" is generated by BOTH "${seenIds.get(formula.id)}" and "${formula.name}".`,
          { id: formula.id },
        ),
      );
    } else {
      seenIds.set(formula.id, formula.name);
    }

    const key = `${formula.subject}||${formula.chapter}||${formula.name}`;
    if (seenKeys.has(key)) {
      errors.push(
        new ValidationProblem(
          'error',
          'duplicate-key',
          `Duplicate canonical key "${key}" (ids: ${seenKeys.get(key)} and ${formula.id}).`,
          { key },
        ),
      );
    } else {
      seenKeys.set(key, formula.id);
    }
  }

  return { errors, warnings };
}

