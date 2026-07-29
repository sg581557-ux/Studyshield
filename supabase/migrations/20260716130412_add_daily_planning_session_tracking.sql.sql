/*
# Add daily planning session tracking to ai_plans

1. Purpose
   The AI Planner needs to know whether the user has already completed the daily
   planning flow (goal + study mode + available hours) for today, so it can skip
   the wizard and show today's dashboard directly on subsequent visits. We also
   need to persist the three inputs the user chose so the "Replan Today" flow can
   pre-fill them and the engine can regenerate with the same parameters.

2. Changes to `ai_plans` table
   - `plan_date` (date, not null) — already exists in most schemas but ensure it.
   - `today_goal` (text, nullable) — the free-text goal the user entered for this day.
   - `study_mode` (text, nullable) — the study mode selected (hard_push / balanced / low_energy / recovery / exam_mode).
   - `available_hours` (integer, nullable) — the available study hours the user committed to.

3. Approach
   All additions use `IF NOT EXISTS` via DO blocks so the migration is idempotent.
   No data is lost; existing rows simply have NULL for the new columns.

4. Security
   RLS already enabled on ai_plans from prior migrations. No policy changes needed.
*/

DO $$ BEGIN
  ALTER TABLE ai_plans ADD COLUMN IF NOT EXISTS plan_date date NOT NULL DEFAULT CURRENT_DATE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ai_plans ADD COLUMN IF NOT EXISTS today_goal text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ai_plans ADD COLUMN IF NOT EXISTS study_mode text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ai_plans ADD COLUMN IF NOT EXISTS available_hours integer;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Index for quickly finding today's plan for a user
CREATE INDEX IF NOT EXISTS idx_ai_plans_user_date ON ai_plans(user_id, plan_date DESC);
