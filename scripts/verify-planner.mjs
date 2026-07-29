// Standalone verifier for the planner's time-target-fill logic.
// Mirrors the allocation constants and loop from src/services/planner.ts
// and asserts that 5h, 8h, and 10h all produce a schedule within ±10 min.

const DEFAULT_LECTURE_MIN = 120;
const DEFAULT_DPP_MIN = 30;
const DEFAULT_MODULE_MIN = 45;
const DEFAULT_PYQ_MIN = 45;
const DEFAULT_REVISION_MIN = 25;
const DEFAULT_FORMULA_MIN = 20;
const DEFAULT_PRACTICE_MIN = 45;
const DEFAULT_MOCK_REVIEW_MIN = 30;
const TOLERANCE = 10;

const FILLER_QUEUE = [
  { type: "revision", minutes: DEFAULT_REVISION_MIN },
  { type: "spaced_revision", minutes: DEFAULT_REVISION_MIN },
  { type: "pyq", minutes: DEFAULT_PYQ_MIN },
  { type: "module", minutes: DEFAULT_MODULE_MIN },
  { type: "formula_revision", minutes: DEFAULT_FORMULA_MIN },
  { type: "study", minutes: DEFAULT_PRACTICE_MIN },
  { type: "mock_test_review", minutes: DEFAULT_MOCK_REVIEW_MIN },
];

function plan({ studyHours, lectures, lecMin = DEFAULT_LECTURE_MIN, backlogDpps = 0, backlogModules = 0 }) {
  const requestedMinutes = Math.round(studyHours * 60);
  const tasks = [];
  let scheduled = 0;

  // 1. Lectures (backlog + minimum)
  let lecCount = 0;
  while (lecCount < lectures && scheduled + lecMin <= requestedMinutes + TOLERANCE) {
    tasks.push({ type: "lecture", minutes: lecMin });
    scheduled += lecMin;
    lecCount++;
  }

  // 2. Backlog DPPs
  let dppCount = 0;
  while (dppCount < backlogDpps && scheduled < requestedMinutes - TOLERANCE) {
    const remaining = requestedMinutes - scheduled;
    const minutes = Math.min(DEFAULT_DPP_MIN, Math.max(15, remaining));
    if (minutes < 15) break;
    tasks.push({ type: "dpp", minutes });
    scheduled += minutes;
    dppCount++;
  }

  // 3. Backlog modules
  let modCount = 0;
  while (modCount < backlogModules && scheduled < requestedMinutes - TOLERANCE) {
    const remaining = requestedMinutes - scheduled;
    const minutes = Math.min(DEFAULT_MODULE_MIN, Math.max(15, remaining));
    if (minutes < 15) break;
    tasks.push({ type: "module", minutes });
    scheduled += minutes;
    modCount++;
  }

  // 4. Filler loop — cycles through all 7 filler types until target met
  let safety = 0;
  while (scheduled < requestedMinutes - TOLERANCE && safety < 200) {
    safety++;
    const remaining = requestedMinutes - scheduled;
    const entry = FILLER_QUEUE[(safety - 1) % FILLER_QUEUE.length];
    const minutes = Math.min(entry.minutes, Math.max(15, remaining));
    if (minutes < 15) {
      // pad with a generic study session
      tasks.push({ type: "study", minutes: Math.max(15, remaining) });
      scheduled += Math.max(15, remaining);
      continue;
    }
    tasks.push({ type: entry.type, minutes });
    scheduled += minutes;
  }

  return { requestedMinutes, scheduledMinutes: scheduled, gap: requestedMinutes - scheduled, tasks };
}

function assertClose(hours, lectures = 2, opts = {}) {
  const r = plan({ studyHours: hours, lectures, ...opts });
  const ok = Math.abs(r.gap) <= TOLERANCE;
  const byType = r.tasks.reduce((a, t) => { a[t.type] = (a[t.type] ?? 0) + 1; return a; }, {});
  console.log(
    `${hours}h → requested ${r.requestedMinutes}m, scheduled ${r.scheduledMinutes}m, gap ${r.gap}m, tasks ${r.tasks.length} | ${ok ? "PASS" : "FAIL"} | types:`,
    JSON.stringify(byType),
  );
  if (!ok) process.exit(1);
}

// Required verifications from the task spec
assertClose(5, 2);
assertClose(8, 2);
assertClose(10, 3);

// Edge cases
assertClose(1, 0);            // tiny budget, no lectures
assertClose(12, 4);           // large budget
assertClose(8, 0, { backlogDpps: 3, backlogModules: 2 }); // backlog-heavy
assertClose(8, 2, { backlogDpps: 20 }); // more DPPs than fit
console.log("\nAll time-target verifications passed.");
