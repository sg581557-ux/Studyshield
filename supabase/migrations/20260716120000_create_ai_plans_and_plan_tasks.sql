--
-- # Create ai_plans and plan_tasks (schema gap fix)
--
-- ## Problem
-- The AI planner (src/lib/aiPlanner.ts, src/services/db.ts, src/services/planner/*)
-- reads and writes `ai_plans` and `plan_tasks`, but NO earlier migration ever
-- created them - the existing migrations only ALTER them:
-- - 20260716130412 adds columns to `ai_plans` (assumes it exists with RLS)
-- - 20260728111526 adds columns to `plan_tasks` (assumes it exists)
--
-- This migration creates both tables so those ALTERs succeed when the full
-- migration set is applied in order. Timestamped before 20260716130412.
--
-- ## Schema notes
-- - `user_id` defaults to auth.uid() so client inserts that omit it succeed.
-- - RLS: authenticated-only, owner-scoped (auth.uid() = user_id) - the same
--   pattern used by recovery_bucket / study_stats / planner_goals.
-- - `plan_id` on plan_tasks is nullable (manual tasks have no plan) and uses
--   ON DELETE SET NULL so deleting a plan (e.g. admin data wipe) keeps tasks.
-- - `scheduled_date` is nullable; the app filters by it (.eq) so NULL rows are
--   simply excluded.
--

-- ============================================================
-- 1. ai_plans table
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  plan_type text NOT NULL DEFAULT 'daily',
  mode text,
  plan_date date NOT NULL DEFAULT CURRENT_DATE,
  today_goal text,
  study_mode text,
  available_hours integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_ai_plans" ON ai_plans;
CREATE POLICY "select_own_ai_plans" ON ai_plans FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_ai_plans" ON ai_plans;
CREATE POLICY "insert_own_ai_plans" ON ai_plans FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_ai_plans" ON ai_plans;
CREATE POLICY "update_own_ai_plans" ON ai_plans FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_ai_plans" ON ai_plans;
CREATE POLICY "delete_own_ai_plans" ON ai_plans FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_plans_user_date ON ai_plans(user_id, plan_date DESC);

-- ============================================================
-- 2. plan_tasks table
-- ============================================================
CREATE TABLE IF NOT EXISTS plan_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES ai_plans(id) ON DELETE SET NULL,
  title text NOT NULL,
  subject text,
  type text NOT NULL DEFAULT 'study',
  estimated_minutes integer NOT NULL DEFAULT 30,
  priority text NOT NULL DEFAULT 'medium',
  completed boolean NOT NULL DEFAULT false,
  scheduled_date date,
  start_time time,
  end_time time,
  chapter text,
  source text,
  tracker_ref jsonb DEFAULT '{}'::jsonb,
  completion_pct integer NOT NULL DEFAULT 0,
  task_status text NOT NULL DEFAULT 'pending',
  missed_count integer NOT NULL DEFAULT 0,
  reschedule_reason text,
  actual_minutes integer,
  priority_score numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE plan_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_plan_tasks" ON plan_tasks;
CREATE POLICY "select_own_plan_tasks" ON plan_tasks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_plan_tasks" ON plan_tasks;
CREATE POLICY "insert_own_plan_tasks" ON plan_tasks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_plan_tasks" ON plan_tasks;
CREATE POLICY "update_own_plan_tasks" ON plan_tasks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_plan_tasks" ON plan_tasks;
CREATE POLICY "delete_own_plan_tasks" ON plan_tasks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_plan_tasks_user_date ON plan_tasks(user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_plan_tasks_user_status ON plan_tasks(user_id, task_status);
