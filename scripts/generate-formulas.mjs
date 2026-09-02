#!/usr/bin/env node
/**
 * @deprecated — Legacy shim. The canonical generator is now
 * `scripts/formula-generator/index.mjs` (schema v2.0).
 *
 * This file is kept only to avoid breaking existing `node scripts/generate-formulas.mjs`
 * invocations (e.g. old CI, docs, or muscle memory). It delegates to the
 * new modular generator so `src/data/formulas` is always written in the
 * correct schema and never corrupted by the old monolithic logic.
 */

console.warn('[DEPRECATED] scripts/generate-formulas.mjs is deprecated.');
console.warn('  Use: npm run gen:formulas  (or: node scripts/formula-generator/index.mjs)');
console.warn('  Delegating to the new generator...\n');

import('./formula-generator/index.mjs');

