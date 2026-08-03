#!/usr/bin/env node
/**
 * formula-generator/index.mjs
 * -----------------------------------------------------------------------------
 * CLI orchestrator for the StudyShield formula database.
 *
 * Builds the formula database from declarative data modules, validates it,
 * removes exact duplicates, and writes:
 *   - src/data/formulas/<subject>.ts            (Formula Vault TypeScript data)
 *   - src/data/formulas/index.ts                (public helpers)
 *   - public/data/formula-catalog.json          (full nested JSON catalog)
 *
 * USAGE:
 *   node scripts/formula-generator/index.mjs
 *   node scripts/formula-generator/index.mjs --verbose
 *   node scripts/formula-generator/index.mjs --validate-only
 *   node scripts/formula-generator/index.mjs --no-json
 *   node scripts/formula-generator/index.mjs --exams=jee-main,neet-ug
 *   node scripts/formula-generator/index.mjs --min-importance=high
 *
 * FLAGS:
 *   --verbose            Print debug-level log entries.
 *   --validate-only      Validate + dedupe, but write nothing.
 *   --no-json            Skip writing public/data/formula-catalog.json.
 *   --no-ts              Skip writing src/data/formulas TS files.
 *   --exams=id,id        Only keep formulas whose exams[] intersects the list.
 *   --min-importance=x   Drop formulas with importance below x
 *                        (low < medium < high < critical).
 *   --help               Show this help.
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { f } from './lib/formula.mjs';
import { validateFormulas } from './lib/validate.mjs';
import { dedupe } from './lib/dedupe.mjs';
import { info, warn, error, setVerbose, printSummary } from './lib/logger.mjs';
import { writeSubjectTs, writeIndexTs, writeJsonCatalog } from './lib/output.mjs';
import { resolveExamId } from './lib/registry.mjs';
import { IMPORTANCE_LEVELS, EXAMS } from './lib/constants.mjs';
import { toVarName, toFileName } from './lib/ids.mjs';
import { buildAllSeeds } from './data/index.mjs';
import { expandExams } from './data/expand-exams.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');

const FORMULAS_OUT = join(PROJECT_ROOT, 'src', 'data', 'formulas');
const CATALOG_OUT = join(PROJECT_ROOT, 'public', 'data', 'formula-catalog.json');

// ---- CLI parsing ----
const args = process.argv.slice(2);
const flags = {
  verbose: false,
  validateOnly: false,
  writeJson: true,
  writeTs: true,
  examFilter: null,
  minImportance: null,
};
for (const arg of args) {
  if (arg === '--help' || arg === '-h') {
    console.log(`
StudyShield Formula Generator
${'='.repeat(40)}
USAGE:
  node scripts/formula-generator/index.mjs [flags]

FLAGS:
  --verbose               debug logging
  --validate-only         validate + dedupe only (no writes)
  --no-json               skip JSON catalog output
  --no-ts                 skip TypeScript output
  --exams=id,id           keep only formulas for the given exam ids
  --min-importance=level  drop formulas below importance (low|medium|high|critical)
`);
    process.exit(0);
  }
  if (arg === '--verbose') flags.verbose = true;
  else if (arg === '--validate-only') flags.validateOnly = true;
  else if (arg === '--no-json') flags.writeJson = false;
  else if (arg === '--no-ts') flags.writeTs = false;
  else if (arg.startsWith('--exams=')) flags.examFilter = arg.slice('--exams='.length).split(',').map((s) => s.trim()).filter(Boolean);
  else if (arg.startsWith('--min-importance=')) flags.minImportance = arg.slice('--min-importance='.length).trim();
  else if (arg.startsWith('--')) warn(`Unknown flag: ${arg}`);
  else warn(`Unexpected positional argument: ${arg}`);
}

setVerbose(flags.verbose);

// ---- Build raw formulas from all data modules ----
info('Building formula seeds from data modules...');
const rawSeeds = expandExams(buildAllSeeds());
info(`Loaded ${rawSeeds.length} raw seeds.`);

// ---- Normalize to Formula objects ----
let formulas = [];
const normalizeErrors = [];
for (const seed of rawSeeds) {
  try {
    formulas.push(f(seed));
  } catch (err) {
    normalizeErrors.push(String(err.message || err));
  }
}
if (normalizeErrors.length > 0) {
  for (const msg of normalizeErrors) error(msg);
  error(`Aborting: ${normalizeErrors.length} seed(s) failed to normalize.`);
  process.exit(1);
}
info(`Normalized ${formulas.length} formulas.`);

// ---- Validate every formula ----
const { errors, warnings } = validateFormulas(formulas);
for (const w of warnings) warn(w.toString());
for (const e of errors) error(e.toString());
if (errors.length > 0) {
  error(`Aborting: ${errors.length} validation error(s) found.`);
  printSummary();
  process.exit(1);
}
info(`Validation passed (${warnings.length} warnings).`);

// ---- Deduplicate (exact duplicates are removed; id collisions are fatal) ----
const { formulas: deduped, removed, fuzzy, collisions } = dedupe(formulas);
for (const r of removed) warn(`Removed exact duplicate: "${r.original.name}" (${r.formula.id}).`);
for (const c of collisions) error(`ID collision detected for "${c.formula.id}" (${c.count} occurrences).`);
if (collisions.length > 0) {
  error('Aborting: id collisions are not allowed.');
  process.exit(1);
}
if (fuzzy.length > 0) {
  for (const fm of fuzzy) warn(`Possible near-duplicate: ${fm.reason}`);
}
info(`After dedupe: ${deduped.length} formulas (removed ${removed.length}).`);

// ---- Filters ----
if (flags.examFilter) {
  const examIds = flags.examFilter.map((id) => resolveExamId(id) || id);
  const before = deduped.length;
  formulas = deduped.filter((formula) => (formula.exams || []).some((exam) => examIds.includes(exam)));
  info(`--exams filter: ${before} -> ${formulas.length}.`);
} else {
  formulas = deduped;
}

if (flags.minImportance) {
  const minIndex = IMPORTANCE_LEVELS.indexOf(flags.minImportance);
  if (minIndex === -1) {
    error(`Invalid --min-importance "${flags.minImportance}". Allowed: ${IMPORTANCE_LEVELS.join(', ')}.`);
    process.exit(1);
  }
  const before = formulas.length;
  formulas = formulas.filter((formula) => IMPORTANCE_LEVELS.indexOf(formula.importance) >= minIndex);
  info(`--min-importance filter: ${before} -> ${formulas.length}.`);
}

if (flags.validateOnly) {
  console.log(`\nValidation only: ${formulas.length} formulas are valid (${removed.length} duplicates removed).`);
  printSummary();
  process.exit(0);
}

// ---- Write outputs ----
const writtenFiles = [];

// Group by subject
const bySubject = new Map();
for (const formula of formulas) {
  if (!bySubject.has(formula.subject)) bySubject.set(formula.subject, []);
  bySubject.get(formula.subject).push(formula);
}

if (flags.writeTs) {
  const subjects = [];
  for (const [subject, list] of bySubject) {
    const files = writeSubjectTs(list, subject, FORMULAS_OUT);
    writtenFiles.push(...files);
    subjects.push({ subject, varName: toVarName(subject), count: list.length });
    info(`Wrote ${list.length} ${subject} formulas -> ${files.map((f) => f.split(/[\\/]/).pop()).join(', ')}`);
  }
  const indexPath = writeIndexTs(subjects, FORMULAS_OUT);
  writtenFiles.push(indexPath);
  info(`Wrote index -> ${indexPath.split(/[\\/]/).pop()}`);
}

if (flags.writeJson) {
  const meta = {
    examCount: EXAMS.length,
    subjectCount: bySubject.size,
  };
  const catalogPath = writeJsonCatalog(formulas, meta, CATALOG_OUT);
  writtenFiles.push(catalogPath);
  info(`Wrote catalog -> ${catalogPath.split(/[\\/]/).pop()}`);
}

// ---- Summary report ----
console.log('\n=== Formula Generator Report ===');
console.log(`  Total formulas written : ${formulas.length}`);
console.log(`  Subjects               : ${[...bySubject.keys()].join(', ')}`);
console.log(`  Files written          : ${writtenFiles.length}`);
console.log(`  Warnings               : ${warnings.length + fuzzy.length + removed.length}`);
console.log(`  Errors                 : 0`);
console.log('');
console.log('Per-subject counts:');
for (const [subject, list] of [...bySubject.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const branches = [...new Set(list.map((f) => f.branch).filter(Boolean))].length;
  const chapters = new Set(list.map((f) => f.chapter)).size;
  console.log(`  ${subject.padEnd(28)} ${String(list.length).padStart(4)} formulas | ${chapters} chapters | ${branches} branches`);
}

printSummary();

