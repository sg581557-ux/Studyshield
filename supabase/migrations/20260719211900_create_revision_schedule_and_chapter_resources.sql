-- ============================================================================
-- Create revision_schedule + chapter_resources (schema gap fix)
--
-- Dependency-graph analysis of the migration set found tables that migrations
-- INSERT/UPDATE but whose CREATE TABLE exists in NO migration:
--
--   * revision_schedule  - written by schedule_chapter_revisions() and by the
--     top-level UPDATE in 20260719213403_unify_jee_user_data.sql. Without
--     this table, `supabase db push` fails with:
--       ERROR: relation "revision_schedule" does not exist (SQLSTATE 42P01)
--   * chapter_resources  - written by seed_chapter_resources() (SECURITY
--     INVOKER; body validated lazily, so it did not abort migrations, but the
--     function fails at runtime).
--
-- Both follow the user_chapters pattern (owner-scoped RLS, auth.uid() default,
-- 4 CRUD policies for authenticated, DROP POLICY guards for idempotency).
-- This file must stay timestamp-sorted BEFORE 20260719213403_unify_jee_user_data.sql.
-- ============================================================================

CREATE TABLE IF NOT EXISTS revision_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  exam text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  chapter text NOT NULL DEFAULT '',
  revision_number int NOT NULL DEFAULT 1,
  scheduled_date date NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, subject, chapter, revision_number)
);

ALTER TABLE revision_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_revisions" ON revision_schedule;
CREATE POLICY "select_own_revisions" ON revision_schedule FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_revisions" ON revision_schedule;
CREATE POLICY "insert_own_revisions" ON revision_schedule FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_revisions" ON revision_schedule;
CREATE POLICY "update_own_revisions" ON revision_schedule FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_revisions" ON revision_schedule;
CREATE POLICY "delete_own_revisions" ON revision_schedule FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS chapter_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  exam text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  chapter text NOT NULL DEFAULT '',
  resource_type text NOT NULL DEFAULT '',
  resource_name text NOT NULL DEFAULT '',
  total_questions int NOT NULL DEFAULT 0,
  questions_solved int NOT NULL DEFAULT 0,
  remaining_questions int NOT NULL DEFAULT 0,
  completion_percentage numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, exam, subject, chapter, resource_type, resource_name)
);

ALTER TABLE chapter_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_chapter_resources" ON chapter_resources;
CREATE POLICY "select_own_chapter_resources" ON chapter_resources FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_chapter_resources" ON chapter_resources;
CREATE POLICY "insert_own_chapter_resources" ON chapter_resources FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_chapter_resources" ON chapter_resources;
CREATE POLICY "update_own_chapter_resources" ON chapter_resources FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_chapter_resources" ON chapter_resources;
CREATE POLICY "delete_own_chapter_resources" ON chapter_resources FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
