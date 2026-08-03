/**
 * migrate-legacy.mjs
 * -----------------------------------------------------------------------------
 * One-time migration tool. Extracts the legacy positional-tuple formula rows
 * from the ORIGINAL scripts/generate-formulas.mjs and converts them into the new
 * declarative seed objects consumed by scripts/formula-generator/.
 *
 * This preserves every formula id (e.g. "phy-001") so existing user favorites /
 * revision lists in the Formula Vault keep working after the redesign.
 *
 * USAGE:
 *   node scripts/migrate-legacy.mjs
 *
 * Approach: read the legacy source, strip the file-writing tail, and evaluate
 * the remaining source in a sandbox that captures the `phy`, `chem`, `math`
 * arrays. The legacy script's writeFileSync side-effects are NOT triggered
 * because we never import it directly.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LEGACY_PATH = join(__dirname, 'generate-formulas.mjs');
const OUT_DIR = join(__dirname, 'formula-generator', 'data', 'legacy');

mkdirSync(OUT_DIR, { recursive: true });

const source = readFileSync(LEGACY_PATH, 'utf8');

// ---- 1. Keep only the data declarations. The legacy file has three sections:
//      imports + mk() + array declarations, then "// Generate files" + writes.
const dataEndIndex = source.indexOf('// Generate files');
if (dataEndIndex === -1) {
  throw new Error('Could not find the "// Generate files" marker in legacy script.');
}
let dataSection = source.slice(0, dataEndIndex);

// Strip ESM-only syntax that the sandbox cannot parse:
//  - import statements
//  - the `__dirname` / `formulasDir` / `mkdirSync(...)` module-level fs setup
dataSection = dataSection
  .split('\n')
  .filter((line) => !/^\s*import\s/.test(line))
  .filter((line) => !line.includes('fileURLToPath'))
  .filter((line) => !line.includes("join(__dirname, '..', 'src', 'data', 'formulas')"))
  .filter((line) => !line.includes('mkdirSync(formulasDir'))
  .join('\n');

// ---- 2. Evaluate the data section in a sandbox that captures arrays.
const sandbox = { __captured: {} };
vm.createContext(sandbox);
vm.runInContext(
  `
  ${dataSection}
  __captured.phy = typeof phy !== 'undefined' ? phy : [];
  __captured.chem = typeof chem !== 'undefined' ? chem : [];
  __captured.math = typeof math !== 'undefined' ? math : [];
  `,
  sandbox,
  { filename: LEGACY_PATH },
);

const { phy = [], chem = [], math = [] } = sandbox.__captured;

// ---- 3. Convert rows to declarative seeds ----
function normalizeVarTuple(v) {
  if (!Array.isArray(v)) return null;
  const [symbol, desc, unit] = v;
  if (!symbol || !desc || symbol === '—') return null;
  return { symbol, description: desc, ...(unit ? { unit } : {}) };
}

function toSeed(row, subject) {
  const [id, category, chapter, topic, name, formula, latex, description, ...rest] = row;
  let varEnd = 0;
  while (varEnd < rest.length && Array.isArray(rest[varEnd])) varEnd++;
  const variables = rest.slice(0, varEnd).map(normalizeVarTuple).filter(Boolean);
  const remaining = rest.slice(varEnd);

  let units, conditions, notes, jeeTip, mistakes, tags, synonyms, importance, difficulty, exam, freq;
  if (remaining.length >= 4 && Array.isArray(remaining[3])) {
    [units, conditions, notes, mistakes, tags, synonyms, importance, difficulty, exam, freq] = remaining;
    jeeTip = undefined;
  } else {
    [units, conditions, notes, jeeTip, mistakes, tags, synonyms, importance, difficulty, exam, freq] = remaining;
  }

  const examMap = {
    Both: ['jee-main', 'jee-advanced'],
    'JEE Main': ['jee-main'],
    'JEE Advanced': ['jee-advanced'],
    NEET: ['neet-ug'],
    School: ['cbse-11', 'cbse-12'],
  };
  const exams = examMap[exam] || [];

  return {
    id,
    subject,
    branch: String(category || '').trim() || undefined,
    chapter: String(chapter || '').trim(),
    topic: String(topic || '').trim(),
    name: String(name || '').trim(),
    expression: String(formula || '').trim(),
    latex: latex || undefined,
    description: String(description || '').trim(),
    variables,
    units: units || undefined,
    conditions: conditions || undefined,
    notes: notes || undefined,
    examTip: jeeTip || undefined,
    mistakes: Array.isArray(mistakes) ? mistakes : mistakes ? [mistakes] : [],
    tags: Array.isArray(tags) ? tags : tags ? [tags] : [],
    synonyms: Array.isArray(synonyms) ? synonyms : synonyms ? [synonyms] : [],
    importance: importance || 'medium',
    difficulty: difficulty || 'medium',
    exams,
    freq: freq === true,
  };
}

const collections = [
  { subject: 'Physics', rows: phy },
  { subject: 'Chemistry', rows: chem },
  { subject: 'Mathematics', rows: math },
];

let total = 0;
for (const { subject, rows } of collections) {
  if (!Array.isArray(rows)) {
    console.warn(`No rows found for ${subject}; skipping.`);
    continue;
  }
  const seeds = rows.map((row) => toSeed(row, subject));
  total += seeds.length;
  const file = join(OUT_DIR, `${subject.toLowerCase()}.mjs`);
  const content = `// AUTO-CONVERTED from legacy tuple format by scripts/migrate-legacy.mjs — DO NOT EDIT MANUALLY.
// These seeds feed the new declarative formula generator.
export const seeds = ${JSON.stringify(seeds, null, 2)};
`;
  writeFileSync(file, content);
  console.log(`Wrote ${seeds.length} ${subject} seeds -> ${file}`);
}

console.log(`\nMigration complete. ${total} total formulas converted.`);
console.log('Next: wire these into scripts/formula-generator/data/index.mjs and run the generator.');

