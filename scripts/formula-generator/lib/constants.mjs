/**
 * constants.mjs
 * -----------------------------------------------------------------------------
 * Canonical enums + the exam registry. This module is the SINGLE source of truth
 * for every enum and exam id used by the formula generator. Data modules and the
 * CLI read from here, so a new exam or enum only needs to be added in ONE place.
 *
 * This mirrors (and supersedes) the static `examCatalog` in src/data/exams.ts.
 */

export const SCHEMA_VERSION = '2.0';
export const GENERATOR_NAME = 'scripts/formula-generator/index.mjs';

/** Difficulty levels (same union as src/types/index.ts). */
export const DIFFICULTY_LEVELS = Object.freeze(['easy', 'medium', 'hard']);

/** Importance levels (same union as src/types/index.ts). */
export const IMPORTANCE_LEVELS = Object.freeze(['low', 'medium', 'high', 'critical']);

/** Exam categories (same union as src/data/exams.ts). */
export const EXAM_CATEGORIES = Object.freeze([
  'Engineering',
  'Medical',
  'Commerce',
  'Government',
  'Defence',
  'Law',
  'MBA',
  'School',
  'International',
  'Other',
]);

/**
 * Canonical exam registry.
 * `id` MUST match the ids used in src/data/exams.ts (plus newly added exams).
 * `aliases` let the CLI / future tooling resolve user-friendly names to ids.
 */
export const EXAMS = Object.freeze([
  // ---------------- Engineering ----------------
  { id: 'jee-main', name: 'JEE Main', category: 'Engineering', shortName: 'JEE Main', aliases: ['jee', 'jee main'] },
  { id: 'jee-advanced', name: 'JEE Advanced', category: 'Engineering', shortName: 'JEE Adv', aliases: ['jee advanced', 'jee adv'] },
  { id: 'bitsat', name: 'BITSAT', category: 'Engineering', aliases: ['bitsat'] },
  { id: 'viteee', name: 'VITEEE', category: 'Engineering', aliases: ['vit'] },
  { id: 'srmeee', name: 'SRMJEEE', category: 'Engineering', aliases: ['srm'] },
  { id: 'wbjee', name: 'WBJEE', category: 'Engineering', aliases: ['wbjee'] },
  { id: 'mht-cet', name: 'MHT CET', category: 'Engineering', aliases: ['mhtcet', 'mht cet'] },
  { id: 'comedk', name: 'COMEDK', category: 'Engineering', aliases: ['comedk'] },
  { id: 'kcet', name: 'KCET', category: 'Engineering', aliases: ['kcet'] },
  { id: 'ap-eamcet', name: 'AP EAMCET', category: 'Engineering', aliases: ['apeamcet', 'ap eamcet'] },
  { id: 'ts-eamcet', name: 'TS EAMCET', category: 'Engineering', aliases: ['tseamcet', 'ts eamcet'] },
  // ---------------- Medical ----------------
  { id: 'neet-ug', name: 'NEET UG', category: 'Medical', shortName: 'NEET', aliases: ['neet', 'neet ug'] },
  { id: 'aiims', name: 'AIIMS Preparation', category: 'Medical', shortName: 'AIIMS', aliases: ['aiims'] },
  { id: 'jipmer', name: 'JIPMER', category: 'Medical', aliases: ['jipmer'] },
  // ---------------- Commerce ----------------
  { id: 'ca-foundation', name: 'CA Foundation', category: 'Commerce', shortName: 'CA Found', aliases: ['ca foundation', 'caf'] },
  { id: 'ca-intermediate', name: 'CA Intermediate', category: 'Commerce', shortName: 'CA Inter', aliases: ['ca inter', 'ca intermediate'] },
  { id: 'ca-final', name: 'CA Final', category: 'Commerce', shortName: 'CA Final', aliases: ['ca final'] },
  { id: 'cs-executive', name: 'CS Executive', category: 'Commerce', shortName: 'CS Exec', aliases: ['cs executive'] },
  { id: 'cs-professional', name: 'CS Professional', category: 'Commerce', shortName: 'CS Prof', aliases: ['cs professional'] },
  { id: 'cma-foundation', name: 'CMA Foundation', category: 'Commerce', shortName: 'CMA Found', aliases: ['cma foundation'] },
  { id: 'cma-intermediate', name: 'CMA Intermediate', category: 'Commerce', shortName: 'CMA Inter', aliases: ['cma intermediate'] },
  // ---------------- Government ----------------
  { id: 'upsc-cse', name: 'UPSC CSE', category: 'Government', shortName: 'UPSC', aliases: ['upsc'] },
  { id: 'ssc-cgl', name: 'SSC CGL', category: 'Government', aliases: ['ssc cgl'] },
  { id: 'ssc-chsl', name: 'SSC CHSL', category: 'Government', aliases: ['ssc chsl'] },
  { id: 'ssc-gd', name: 'SSC GD', category: 'Government', aliases: ['ssc gd'] },
  { id: 'ibps-po-clerk', name: 'Banking (IBPS PO/Clerk)', category: 'Government', shortName: 'IBPS', aliases: ['ibps', 'banking'] },
  { id: 'sbi-po', name: 'SBI PO', category: 'Government', aliases: ['sbi'] },
  { id: 'rbi-grade-b', name: 'RBI Grade B', category: 'Government', shortName: 'RBI Gr B', aliases: ['rbi'] },
  { id: 'railway-exams', name: 'Railway Exams', category: 'Government', shortName: 'Railway', aliases: ['railway'] },
  { id: 'state-psc', name: 'State PSC', category: 'Government', aliases: ['state psc'] },
  // ---------------- Defence ----------------
  { id: 'nda', name: 'NDA', category: 'Defence', aliases: ['nda'] },
  { id: 'cds', name: 'CDS', category: 'Defence', aliases: ['cds'] },
  { id: 'afcat', name: 'AFCAT', category: 'Defence', aliases: ['afcat'] },
  { id: 'agniveer', name: 'Agniveer', category: 'Defence', aliases: ['agniveer'] },
  // ---------------- Law ----------------
  { id: 'clat', name: 'CLAT', category: 'Law', aliases: ['clat'] },
  { id: 'ailet', name: 'AILET', category: 'Law', aliases: ['ailet'] },
  // ---------------- MBA ----------------
  { id: 'cat', name: 'CAT', category: 'MBA', aliases: ['cat'] },
  { id: 'xat', name: 'XAT', category: 'MBA', aliases: ['xat'] },
  { id: 'snap', name: 'SNAP', category: 'MBA', aliases: ['snap'] },
  { id: 'nmat', name: 'NMAT', category: 'MBA', aliases: ['nmat'] },
  // ---------------- School ----------------
  { id: 'cbse-10', name: 'CBSE Class 10', category: 'School', shortName: 'CBSE 10', aliases: ['cbse 10', 'cbse x'] },
  { id: 'cbse-11', name: 'CBSE Class 11', category: 'School', shortName: 'CBSE 11', aliases: ['cbse 11', 'cbse xi'] },
  { id: 'cbse-12', name: 'CBSE Class 12', category: 'School', shortName: 'CBSE 12', aliases: ['cbse 12', 'cbse xii', 'cbse'] },
  { id: 'isc', name: 'ISC', category: 'School', aliases: ['isc'] },
  { id: 'icse', name: 'ICSE', category: 'School', aliases: ['icse'] },
  { id: 'state-boards', name: 'State Boards', category: 'School', aliases: ['state board', 'state boards'] },
  // ---------------- International ----------------
  { id: 'sat', name: 'SAT', category: 'International', aliases: ['sat'] },
  { id: 'act', name: 'ACT', category: 'International', aliases: ['act'] },
  { id: 'gre', name: 'GRE', category: 'International', aliases: ['gre'] },
  { id: 'gmat', name: 'GMAT', category: 'International', aliases: ['gmat'] },
  // ---------------- Other ----------------
  { id: 'olympiad', name: 'Olympiads', category: 'Other', shortName: 'Olympiad', aliases: ['olympiad', 'olympiads', 'physics olympiad', 'chemistry olympiad', 'math olympiad'] },
  { id: 'gate', name: 'GATE', category: 'Other', aliases: ['gate'] },
  { id: 'ugc-net', name: 'UGC NET', category: 'Other', aliases: ['ugc net'] },
  { id: 'cuet-ug', name: 'CUET UG', category: 'Other', aliases: ['cuet', 'cuet ug'] },
  { id: 'cuet-pg', name: 'CUET PG', category: 'Other', aliases: ['cuet pg'] },
]);

/** Canonical subject names understood by the Formula Vault. */
export const SUBJECTS = Object.freeze([
  'Physics',
  'Chemistry',
  'Mathematics',
  'Biology',
  'Quantitative Aptitude',
  'Accounts',
  'Economics',
  'Business Studies',
  'Engineering Mathematics',
  'Geography',
]);

