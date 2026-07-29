/*
# Extend backlog_items with lecture / DPP / module tracking fields

## Purpose
The Backlog Management workflow now captures structured backlog detail per
chapter: which backlog types apply (lecture / DPP / module), how many
lectures are pending, how many DPPs are pending, and module question
progress. The AI Planner reads these fields to schedule the right work and
decrements them automatically as the user completes tasks.

## Safety
- This migration is purely ADDITIVE. It does NOT drop, rename, or retype any
  existing column. All existing backlog rows keep their data and gain sane
  defaults for the new columns.
- Existing RLS policies on backlog_items are untouched (owner-scoped CRUD
  via auth.uid() = user_id). New columns are covered by the existing
  permissive owner policies automatically.
- A new `updated_at` column + trigger tracks last-modified time. The trigger
  function and trigger are created with OR REPLACE / DROP IF EXISTS so the
  migration is safe to re-run.

## New columns on `backlog_items`
1. `backlog_types` (text[], default '{}') — which backlog kinds apply for
   this item. Any subset of: 'lecture', 'dpp', 'module'. Empty array means
   a legacy / free-form item (backward compatible with existing rows).
2. `pending_lectures` (integer, default 0) — number of lectures still to be
   watched/attended for this chapter.
3. `pending_dpps` (integer, default 0) — number of DPP sheets pending.
4. `module_progress` (text, default 'not_started') — one of
   'not_started' | 'started' | 'in_progress' | 'completed'.
5. `module_total_questions` (integer, default 0) — total module questions.
6. `module_solved_questions` (integer, default 0) — solved so far.
7. `module_questions_remaining` (integer, GENERATED ALWAYS AS
   GREATEST(module_total_questions - module_solved_questions, 0) STORED) —
   remaining module questions, auto-calculated, never written directly.
8. `updated_at` (timestamptz, default now()) — last-modified timestamp,
   kept in sync by the trigger below.

## Trigger
- `set_updated_at()` sets NEW.updated_at = now() on every UPDATE.
- Trigger `backlog_items_updated_at` fires BEFORE UPDATE on backlog_items.

## Notes
- Existing rows: new scalar columns default to 0 / 'not_started' / '{}' so
  every legacy item remains valid and visible. `title`, `subject`,
  `chapter`, `priority`, `status`, `backlog_data`, `overall_progress` are
  all preserved exactly.
- The AI Planner and Dashboard read the new columns; missing/zero values
  fall back gracefully to the existing behavior.
*/

-- 1. Add new columns (idempotent — safe to re-run)
ALTER TABLE backlog_items
  ADD COLUMN IF NOT EXISTS backlog_types text[] NOT NULL DEFAULT '{}';

ALTER TABLE backlog_items
  ADD COLUMN IF NOT EXISTS pending_lectures integer NOT NULL DEFAULT 0;

ALTER TABLE backlog_items
  ADD COLUMN IF NOT EXISTS pending_dpps integer NOT NULL DEFAULT 0;

ALTER TABLE backlog_items
  ADD COLUMN IF NOT EXISTS module_progress text NOT NULL DEFAULT 'not_started';

ALTER TABLE backlog_items
  ADD COLUMN IF NOT EXISTS module_total_questions integer NOT NULL DEFAULT 0;

ALTER TABLE backlog_items
  ADD COLUMN IF NOT EXISTS module_solved_questions integer NOT NULL DEFAULT 0;

-- 2. Remaining module questions = total - solved (auto-calculated, never negative)
ALTER TABLE backlog_items
  ADD COLUMN IF NOT EXISTS module_questions_remaining integer
  GENERATED ALWAYS AS (GREATEST(module_total_questions - module_solved_questions, 0)) STORED;

-- 3. updated_at column + trigger
ALTER TABLE backlog_items
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS backlog_items_updated_at ON backlog_items;
CREATE TRIGGER backlog_items_updated_at
  BEFORE UPDATE ON backlog_items
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
