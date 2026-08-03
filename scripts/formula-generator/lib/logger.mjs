/**
 * logger.mjs
 * -----------------------------------------------------------------------------
 * Minimal structured logger for build-time visibility. Supports a `--verbose`
 * flag and collects a summary that the CLI prints at the end.
 */

/** @type {{ level: 'info'|'warn'|'error'|'debug', message: string, meta?: object }[]} */
const entries = [];
let verboseEnabled = false;

/** @param {boolean} value */
export function setVerbose(value) {
  verboseEnabled = Boolean(value);
}

function push(level, message, meta) {
  entries.push({ level, message, meta });
}

/** @param {string} message @param {object} [meta] */
export function info(message, meta) {
  push('info', message, meta);
}

/** @param {string} message @param {object} [meta] */
export function debug(message, meta) {
  if (verboseEnabled) push('debug', message, meta);
}

/** @param {string} message @param {object} [meta] */
export function warn(message, meta) {
  push('warn', message, meta);
}

/** @param {string} message @param {object} [meta] */
export function error(message, meta) {
  push('error', message, meta);
}

/** @returns {typeof entries} */
export function getEntries() {
  return entries;
}

/** Print a summary grouped by level. */
export function printSummary() {
  const counts = { info: 0, debug: 0, warn: 0, error: 0 };
  for (const e of entries) counts[e.level] += 1;
  console.log('\n=== Generator Log Summary ===');
  for (const [level, count] of Object.entries(counts)) {
    console.log(`  ${level}: ${count}`);
  }
  if (verboseEnabled) {
    for (const e of entries.filter((x) => x.level === 'debug')) {
      console.log(`  [debug] ${e.message}`);
    }
  }
}

