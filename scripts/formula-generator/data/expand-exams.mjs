/**
 * data/expand-exams.mjs
 * -----------------------------------------------------------------------------
 * Exam expansion rules. Many exams share the same syllabus, so instead of
 * duplicating formula rows we TAG an existing formula with additional exam ids.
 * This is what keeps the "one formula, many exams" model duplication-free.
 *
 * Every rule is documented with its rationale. All additions are idempotent
 * (Set-based), so re-running the generator never doubles tags.
 */

/** State engineering entrance exams drawn from the Class 11-12 PCM syllabus. */
const STATE_ENGINEERING_EXAMS = Object.freeze([
  'bitsat',
  'viteee',
  'srmeee',
  'wbjee',
  'mht-cet',
  'kcet',
  'comedk',
  'ap-eamcet',
  'ts-eamcet',
]);

const PCM_SUBJECTS = new Set(['Physics', 'Chemistry', 'Mathematics']);

/**
 * @param {object[]} seeds
 * @returns {object[]} seeds with expanded `exams` arrays (new array, originals untouched)
 */
export function expandExams(seeds) {
  return seeds.map((seed) => {
    const exams = new Set((seed.exams || []).map((e) => String(e).trim()).filter(Boolean));
    let changed = false;

    // Rule 1 — JEE Main-level PCM is the exact syllabus tested by every state
    // engineering entrance (BITSAT, VITEEE, SRMJEEE, WBJEE, MHT CET, KCET,
    // COMEDK, AP/TS EAMCET). Tag once, reuse everywhere.
    if (PCM_SUBJECTS.has(seed.subject) && exams.has('jee-main')) {
      for (const id of STATE_ENGINEERING_EXAMS) {
        if (!exams.has(id)) {
          exams.add(id);
          changed = true;
        }
      }
    }

    // Rule 2 — NEET Biology/PCM follows the NCERT Class 11-12 syllabus, which
    // is also the CUET UG domain-subject syllabus.
    if (exams.has('neet-ug') && !exams.has('cuet-ug')) {
      exams.add('cuet-ug');
      changed = true;
    }

    // Rule 3 — CBSE Class 12 syllabus maps to CUET UG domains and the ISC
    // Class 12 curriculum (both NCERT-aligned).
    if (exams.has('cbse-12')) {
      for (const id of ['cuet-ug', 'isc']) {
        if (!exams.has(id)) {
          exams.add(id);
          changed = true;
        }
      }
    }

    // Rule 4 — Quantitative Aptitude is the CUET UG General Test's quantitative
    // reasoning section (same arithmetic/modern-math formulas as SSC/Banking).
    if (seed.subject === 'Quantitative Aptitude' && !exams.has('cuet-ug')) {
      exams.add('cuet-ug');
      changed = true;
    }

    if (!changed) return seed;
    return { ...seed, exams: [...exams] };
  });
}
