// Chapter progress reminder — "Keep your AI Planner accurate 📚".
//
// Shown at most once per 7-day window (or when a chapter crosses ~80%
// completion for the day), with a one-day snooze and a skip-this-week option.
// State lives in localStorage — no server round-trip for the popup cadence.

export interface ChapterReminderState {
  lastShownAt: string | null;
  snoozeUntil: string | null;
  shownCount: number;
}

const KEY = "studyshield:chapterReminder";
const CADENCE_DAYS = 7;
const SNOOZE_DAYS = 1;

export function loadReminderState(): ChapterReminderState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ChapterReminderState;
      if (parsed && typeof parsed === "object") {
        return {
          lastShownAt: typeof parsed.lastShownAt === "string" ? parsed.lastShownAt : null,
          snoozeUntil: typeof parsed.snoozeUntil === "string" ? parsed.snoozeUntil : null,
          shownCount: Number.isFinite(parsed.shownCount) ? parsed.shownCount : 0,
        };
      }
    }
  } catch { /* corrupt state — reset */ }
  return { lastShownAt: null, snoozeUntil: null, shownCount: 0 };
}

function saveReminderState(state: ChapterReminderState): void {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota / privacy — ignore */ }
}

export function clearReminderState(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

// Cadence gate: at most once per 7-day window, unless snoozed (can return
// after the snooze even inside the window).
export function isReminderEligible(state: ChapterReminderState, now = new Date()): boolean {
  if (state.snoozeUntil && new Date(state.snoozeUntil) > now) return false;
  if (!state.lastShownAt) return true;
  const last = new Date(state.lastShownAt);
  const elapsedMs = now.getTime() - last.getTime();
  return elapsedMs >= CADENCE_DAYS * 24 * 60 * 60 * 1000;
}

export function markReminderShown(state: ChapterReminderState, now = new Date()): ChapterReminderState {
  const next: ChapterReminderState = {
    lastShownAt: now.toISOString(),
    snoozeUntil: null,
    shownCount: state.shownCount + 1,
  };
  saveReminderState(next);
  return next;
}

export function snoozeReminder(state: ChapterReminderState, now = new Date()): ChapterReminderState {
  const target = new Date(now);
  target.setDate(target.getDate() + SNOOZE_DAYS);
  target.setHours(9, 0, 0, 0);
  const next: ChapterReminderState = { ...state, snoozeUntil: target.toISOString() };
  saveReminderState(next);
  return next;
}

// Fast-track: a chapter whose planned tasks for today are ≥80% complete gets
// the reminder even mid-cadence (still gated by the 7-day window above).
export function fastTrackChapter(completed: number, planned: number): boolean {
  return planned >= 2 && completed / planned >= 0.8;
}
