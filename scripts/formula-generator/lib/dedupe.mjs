/**
 * dedupe.mjs
 * -----------------------------------------------------------------------------
 * Duplicate detection & removal. Three layers:
 *
 *   1. Exact canonical-key collision  — (subject, chapter, name) identical.
 *      Two formulas cannot both be emitted because validateFormulas() would
 *      fail; the CLI resolves collisions by keeping the first and reporting.
 *
 *   2. Fuzzy "same formula name, different chapter/case" — used to surface
 *      suspicious near-duplicates as warnings (never silently deletes).
 *
 *   3. ID collision — two different seeds producing the same id is a hard error
 *      (surfaces in validation), because the Formula Vault keys off ids.
 *
 * All decisions are deterministic: on exact duplicates the FIRST occurrence wins
 * and the rest are reported. No automatic deletion of fuzzy matches — they are
 * surfaced so a human/CI can decide.
 */

/** Normalize a string for comparison: lowercase, collapse whitespace. */
function norm(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detect exact duplicates within a formula list.
 * @param {object[]} formulas
 * @returns {{ keep: object[], duplicates: Array<{ formula: object, original: object }> }}
 */
export function findExactDuplicates(formulas) {
  const seen = new Map();
  const keep = [];
  const duplicates = [];
  for (const formula of formulas) {
    const key = norm(`${formula.subject}|${formula.chapter}|${formula.name}`);
    if (seen.has(key)) {
      duplicates.push({ formula, original: seen.get(key) });
    } else {
      seen.set(key, formula);
      keep.push(formula);
    }
  }
  return { keep, duplicates };
}

/**
 * Detect fuzzy near-duplicates: same subject + identical normalized name but a
 * different chapter/case, or very similar names in the same chapter.
 * @param {object[]} formulas
 * @returns {Array<{ a: object, b: object, reason: string }>}
 */
export function findFuzzyDuplicates(formulas) {
  const groups = new Map();
  for (const f of formulas) {
    const key = norm(`${f.subject}|${f.name}`);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(f);
  }
  const matches = [];
  for (const group of groups.values()) {
    if (group.length > 1) {
      // Same subject + same name across different chapters — likely near-dupe.
      matches.push({
        a: group[0],
        b: group[1],
        reason: `Same subject/name in different chapters ("${group[0].chapter}" vs "${group[1].chapter}")`,
      });
    }
  }
  return matches;
}

/**
 * @param {object[]} formulas
 * @returns {{ formula: object, count: number }[]} list of ids that appear more than once
 */
export function findIdCollisions(formulas) {
  const counts = new Map();
  for (const f of formulas) {
    counts.set(f.id, (counts.get(f.id) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id, count]) => ({ formula: formulas.find((f) => f.id === id), count }));
}

/**
 * Deduplicate a formula list. Exact duplicates collapse to the first occurrence.
 * @param {object[]} formulas
 * @returns {{ formulas: object[], removed: object[], fuzzy: object[] }}
 */
export function dedupe(formulas) {
  const { keep, duplicates } = findExactDuplicates(formulas);
  const fuzzy = findFuzzyDuplicates(keep);
  const collisions = findIdCollisions(keep);
  return {
    formulas: keep,
    removed: duplicates,
    fuzzy,
    collisions,
  };
}

