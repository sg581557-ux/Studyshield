/*
# Create focus_sessions and study_tasks tables (single-tenant, no auth)

1. New Tables
- `focus_sessions`
  - id (uuid PK)
  - duration_minutes (int, not null)
  - completed (bool, default false)
  - strict_mode (bool, default false)
  - started_at (timestamptz, default now())
  - completed_at (timestamptz, nullable)
- `study_tasks`
  - id (uuid PK)
  - title (text, not null)
  - done (bool, default false)
  - created_at (timestamptz, default now())
2. Security
- RLS enabled on both tables.
- anon + authenticated CRUD (single-tenant, no sign-in).
3. Indexes
- focus_sessions started_at DESC
- study_tasks created_at DESC
*/

CREATE TABLE IF NOT EXISTS focus_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duration_minutes integer NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  strict_mode boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_focus_sessions" ON focus_sessions;
CREATE POLICY "anon_select_focus_sessions" ON focus_sessions FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_focus_sessions" ON focus_sessions;
CREATE POLICY "anon_insert_focus_sessions" ON focus_sessions FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_focus_sessions" ON focus_sessions;
CREATE POLICY "anon_update_focus_sessions" ON focus_sessions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_focus_sessions" ON focus_sessions;
CREATE POLICY "anon_delete_focus_sessions" ON focus_sessions FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_started_at ON focus_sessions (started_at DESC);

CREATE TABLE IF NOT EXISTS study_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE study_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_study_tasks" ON study_tasks;
CREATE POLICY "anon_select_study_tasks" ON study_tasks FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_study_tasks" ON study_tasks;
CREATE POLICY "anon_insert_study_tasks" ON study_tasks FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_study_tasks" ON study_tasks;
CREATE POLICY "anon_update_study_tasks" ON study_tasks FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_study_tasks" ON study_tasks;
CREATE POLICY "anon_delete_study_tasks" ON study_tasks FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_study_tasks_created_at ON study_tasks (created_at DESC);
