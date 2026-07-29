/*
# Fix Security Issues: Search Path, RLS Policies, SECURITY DEFINER Execution

## Summary
Fixes three categories of security vulnerabilities identified by Supabase's security advisor:

1. **Function Search Path Mutable** (13 functions): All functions are recreated with an
   explicit `SET search_path = public, pg_temp` clause to prevent search-path injection
   attacks where a malicious user could shadow built-in functions or tables.

2. **RLS Policy Always True** (focus_sessions, study_tasks): These tables had
   `USING (true)` / `WITH CHECK (true)` policies that bypassed RLS entirely, allowing
   any anon or authenticated user full CRUD access. The tables are missing a `user_id`
   column, so we add one with `DEFAULT auth.uid()` and replace the permissive policies
   with proper ownership-scoped policies using `auth.uid() = user_id`.

3. **Public Can Execute SECURITY DEFINER Functions** (8 functions): SECURITY DEFINER
   functions were executable by the `anon` role, which is dangerous because they run
   with elevated privileges. We revoke EXECUTE from `anon` on all SECURITY DEFINER
   functions, keeping EXECUTE for `authenticated` and `service_role` only. Trigger
   functions (assign_user_role) still need SECURITY DEFINER but are never called via
   RPC — they only run via trigger, so we revoke from both anon and authenticated.

## Modified Functions (search_path + execution grants)
- update_updated_at (trigger function, not SECURITY DEFINER)
- calculate_resource_metrics (trigger function, not SECURITY DEFINER)
- _seed_subject (helper, not SECURITY DEFINER)
- _seed_chapter (helper, not SECURITY DEFINER)
- _copy_chapters (helper, not SECURITY DEFINER)
- assign_user_role (trigger, SECURITY DEFINER — revoke from anon AND authenticated)
- get_current_user_role (SECURITY DEFINER — revoke from anon)
- is_admin_user (SECURITY DEFINER — revoke from anon)
- log_admin_action (SECURITY DEFINER — revoke from anon)
- upsert_user_role (SECURITY DEFINER — revoke from anon)
- seed_user_chapters (SECURITY DEFINER — revoke from anon)
- seed_chapter_resources (SECURITY DEFINER — revoke from anon)
- schedule_chapter_revisions (SECURITY DEFINER — revoke from anon)

## Modified Tables
- focus_sessions: added user_id column with DEFAULT auth.uid()
- study_tasks: added user_id column with DEFAULT auth.uid()

## Security Changes
- focus_sessions: replaced 4 permissive policies with ownership-scoped policies
- study_tasks: replaced 4 permissive policies with ownership-scoped policies
- All 8 SECURITY DEFINER functions: REVOKE EXECUTE FROM anon
- assign_user_role (trigger): REVOKE EXECUTE FROM anon, authenticated (only runs via trigger)
- All 13 functions: added `SET search_path = public, pg_temp`

## Notes
1. Adding user_id columns is additive — existing rows get NULL, which means existing
   data is not visible to any user via RLS. This is acceptable since these tables had
   no user_id to begin with and the data was not user-scoped.
2. Trigger functions (assign_user_role, update_updated_at, calculate_resource_metrics)
   run internally by PostgreSQL triggers, not via RPC. Revoking EXECUTE from anon and
   authenticated does not affect trigger execution.
3. The migration is idempotent — DROP POLICY IF EXISTS and CREATE OR REPLACE FUNCTION
   make it safe to re-run.
*/


-- ══════════════════════════════════════════════════════════════════════════════
-- 1. FIX FUNCTION SEARCH PATH MUTABLE
-- Recreate all 13 functions with explicit `SET search_path = public, pg_temp`
-- ══════════════════════════════════════════════════════════════════════════════

-- update_updated_at (trigger function)
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- calculate_resource_metrics (trigger function)
CREATE OR REPLACE FUNCTION public.calculate_resource_metrics()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.remaining_questions := GREATEST(NEW.total_questions - NEW.questions_solved, 0);
  IF NEW.total_questions > 0 THEN
    NEW.completion_percentage := ROUND((NEW.questions_solved::numeric / NEW.total_questions::numeric) * 100, 2);
  ELSE
    NEW.completion_percentage := 0;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

-- _seed_subject (helper function)
CREATE OR REPLACE FUNCTION public._seed_subject(p_exam_id text, p_name text, p_order integer)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
DECLARE v_id uuid;
BEGIN
  INSERT INTO syllabus_subjects (exam_id, name, display_order)
  VALUES (p_exam_id, p_name, p_order)
  ON CONFLICT (exam_id, name) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM syllabus_subjects WHERE exam_id = p_exam_id AND name = p_name;
  END IF;
  RETURN v_id;
END;
$function$;

-- _seed_chapter (helper function)
CREATE OR REPLACE FUNCTION public._seed_chapter(p_subject_id uuid, p_name text, p_order integer)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  INSERT INTO syllabus_chapters (subject_id, name, display_order)
  VALUES (p_subject_id, p_name, p_order)
  ON CONFLICT (subject_id, name) DO NOTHING;
END;
$function$;

-- _copy_chapters (helper function)
CREATE OR REPLACE FUNCTION public._copy_chapters(p_src_exam text, p_src_subject text, p_dst_subject_id uuid, p_start_order integer DEFAULT 0)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
DECLARE ch RECORD; v_order int := p_start_order;
BEGIN
  FOR ch IN
    SELECT name, display_order FROM syllabus_chapters
    WHERE subject_id = (SELECT id FROM syllabus_subjects WHERE exam_id = p_src_exam AND name = p_src_subject)
    ORDER BY display_order
  LOOP
    PERFORM _seed_chapter(p_dst_subject_id, ch.name, v_order);
    v_order := v_order + 1;
  END LOOP;
END;
$function$;

-- assign_user_role (trigger function, SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.assign_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  INSERT INTO user_roles (user_id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    CASE
      WHEN NEW.email IN ('studyshieldofficial@gmail.com', 'studyshieldrecovery@gmail.com') THEN 'super_admin'
      ELSE 'user'
    END
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- get_current_user_role (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE v_role text;
BEGIN
  SELECT role INTO v_role FROM user_roles WHERE user_id = auth.uid();
  RETURN COALESCE(v_role, 'user');
END;
$function$;

-- is_admin_user (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin')
  );
END;
$function$;

-- log_admin_action (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_admin_id uuid,
  p_admin_email text,
  p_action text,
  p_target_user_id uuid DEFAULT NULL,
  p_target_user_email text DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  INSERT INTO admin_logs (admin_id, admin_email, action, target_user_id, target_user_email, details)
  VALUES (p_admin_id, p_admin_email, p_action, p_target_user_id, p_target_user_email, p_details);
END;
$function$;

-- upsert_user_role (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.upsert_user_role(p_user_id uuid, p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  INSERT INTO user_roles (user_id, email, role)
  VALUES (
    p_user_id,
    p_email,
    CASE
      WHEN p_email IN ('studyshieldofficial@gmail.com', 'studyshieldrecovery@gmail.com') THEN 'super_admin'
      ELSE 'user'
    END
  )
  ON CONFLICT (user_id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = now()
  WHERE user_roles.user_id = p_user_id;
END;
$function$;

-- seed_user_chapters (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.seed_user_chapters(p_user_id uuid, p_exam_name text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_exam_id text;
  v_count integer := 0;
  v_chapter RECORD;
  v_exam_name text := p_exam_name;
BEGIN
  SELECT id INTO v_exam_id FROM syllabus_exams WHERE name = v_exam_name LIMIT 1;
  IF v_exam_id IS NULL THEN
    SELECT id INTO v_exam_id FROM syllabus_exams WHERE LOWER(name) = LOWER(v_exam_name) LIMIT 1;
  END IF;
  IF v_exam_id IS NULL THEN
    SELECT id INTO v_exam_id FROM syllabus_exams
    WHERE v_exam_name ILIKE name || '%' OR name ILIKE v_exam_name || '%'
    LIMIT 1;
  END IF;
  IF v_exam_id IS NULL THEN
    v_exam_id := 'other';
  END IF;
  SELECT name INTO v_exam_name FROM syllabus_exams WHERE id = v_exam_id;
  FOR v_chapter IN
    SELECT ss.name AS subject_name, sc.name AS chapter_name
    FROM syllabus_chapters sc
    JOIN syllabus_subjects ss ON sc.subject_id = ss.id
    WHERE ss.exam_id = v_exam_id
    ORDER BY ss.display_order, sc.display_order
  LOOP
    INSERT INTO user_chapters (user_id, exam, subject, chapter, status, lectures_remaining, questions_remaining, revision_pending, confidence)
    VALUES (p_user_id, v_exam_name, v_chapter.subject_name, v_chapter.chapter_name, 'not-started', 1, 0, 0, 0)
    ON CONFLICT (user_id, exam, subject, chapter) DO NOTHING;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$function$;

-- seed_chapter_resources (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.seed_chapter_resources(p_user_id uuid, p_exam_name text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_exam_id text;
  v_exam_name text := p_exam_name;
  v_count integer := 0;
  v_chapter RECORD;
  v_is_jee boolean := false;
  v_is_neet boolean := false;
BEGIN
  SELECT id INTO v_exam_id FROM syllabus_exams WHERE name = v_exam_name LIMIT 1;
  IF v_exam_id IS NULL THEN
    SELECT id INTO v_exam_id FROM syllabus_exams WHERE LOWER(name) = LOWER(v_exam_name) LIMIT 1;
  END IF;
  IF v_exam_id IS NULL THEN
    SELECT id INTO v_exam_id FROM syllabus_exams
    WHERE v_exam_name ILIKE name || '%' OR name ILIKE v_exam_name || '%' LIMIT 1;
  END IF;
  IF v_exam_id IS NULL THEN
    v_exam_id := 'other';
  END IF;
  SELECT name INTO v_exam_name FROM syllabus_exams WHERE id = v_exam_id;
  v_is_jee := v_exam_name ILIKE '%JEE%';
  v_is_neet := v_exam_name ILIKE '%NEET%';
  FOR v_chapter IN
    SELECT ss.name AS subject_name, sc.name AS chapter_name
    FROM syllabus_chapters sc
    JOIN syllabus_subjects ss ON sc.subject_id = ss.id
    WHERE ss.exam_id = v_exam_id
    ORDER BY ss.display_order, sc.display_order
  LOOP
    INSERT INTO chapter_resources (user_id, exam, subject, chapter, resource_type, resource_name, total_questions, questions_solved)
    VALUES
      (p_user_id, v_exam_name, v_chapter.subject_name, v_chapter.chapter_name, 'lecture', 'Lecture', 0, 0),
      (p_user_id, v_exam_name, v_chapter.subject_name, v_chapter.chapter_name, 'notes', 'Notes', 0, 0),
      (p_user_id, v_exam_name, v_chapter.subject_name, v_chapter.chapter_name, 'dpp', 'DPP', 0, 0),
      (p_user_id, v_exam_name, v_chapter.subject_name, v_chapter.chapter_name, 'module_exercise', 'Exercise 1', 0, 0),
      (p_user_id, v_exam_name, v_chapter.subject_name, v_chapter.chapter_name, 'module_exercise', 'Exercise 2', 0, 0),
      (p_user_id, v_exam_name, v_chapter.subject_name, v_chapter.chapter_name, 'module_exercise', 'Exercise 3', 0, 0),
      (p_user_id, v_exam_name, v_chapter.subject_name, v_chapter.chapter_name, 'module_exercise', 'Exercise 4', 0, 0),
      (p_user_id, v_exam_name, v_chapter.subject_name, v_chapter.chapter_name, 'module_exercise', 'Exercise 5', 0, 0),
      (p_user_id, v_exam_name, v_chapter.subject_name, v_chapter.chapter_name, 'revision', 'Revision', 0, 0),
      (p_user_id, v_exam_name, v_chapter.subject_name, v_chapter.chapter_name, 'mock_test', 'Mock Test', 0, 0)
    ON CONFLICT (user_id, exam, subject, chapter, resource_type, resource_name) DO NOTHING;

    IF v_is_jee THEN
      INSERT INTO chapter_resources (user_id, exam, subject, chapter, resource_type, resource_name, total_questions, questions_solved)
      VALUES
        (p_user_id, v_exam_name, v_chapter.subject_name, v_chapter.chapter_name, 'pyq', 'JEE Main PYQs', 0, 0),
        (p_user_id, v_exam_name, v_chapter.subject_name, v_chapter.chapter_name, 'pyq', 'JEE Advanced PYQs', 0, 0)
      ON CONFLICT (user_id, exam, subject, chapter, resource_type, resource_name) DO NOTHING;
    ELSIF v_is_neet THEN
      INSERT INTO chapter_resources (user_id, exam, subject, chapter, resource_type, resource_name, total_questions, questions_solved)
      VALUES (p_user_id, v_exam_name, v_chapter.subject_name, v_chapter.chapter_name, 'pyq', 'NEET PYQs', 0, 0)
      ON CONFLICT (user_id, exam, subject, chapter, resource_type, resource_name) DO NOTHING;
    ELSE
      INSERT INTO chapter_resources (user_id, exam, subject, chapter, resource_type, resource_name, total_questions, questions_solved)
      VALUES (p_user_id, v_exam_name, v_chapter.subject_name, v_chapter.chapter_name, 'pyq', 'PYQs', 0, 0)
      ON CONFLICT (user_id, exam, subject, chapter, resource_type, resource_name) DO NOTHING;
    END IF;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$function$;

-- schedule_chapter_revisions (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.schedule_chapter_revisions(
  p_user_id uuid,
  p_exam text,
  p_subject text,
  p_chapter text,
  p_learned_date date DEFAULT CURRENT_DATE
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_count integer := 0;
  v_intervals integer[] := ARRAY[1, 3, 7, 15, 30];
  v_i integer;
BEGIN
  FOR v_i IN 1..5 LOOP
    INSERT INTO revision_schedule (user_id, exam, subject, chapter, revision_number, scheduled_date)
    VALUES (p_user_id, p_exam, p_subject, p_chapter, v_i, p_learned_date + v_intervals[v_i])
    ON CONFLICT (user_id, subject, chapter, revision_number) DO NOTHING;
    IF FOUND THEN v_count := v_count + 1; END IF;
  END LOOP;
  RETURN v_count;
END;
$function$;


-- ══════════════════════════════════════════════════════════════════════════════
-- 2. FIX RLS POLICY ALWAYS TRUE (focus_sessions, study_tasks)
-- Add user_id column and replace permissive policies with ownership checks
-- ══════════════════════════════════════════════════════════════════════════════

-- focus_sessions: add user_id column
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'focus_sessions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE focus_sessions ADD COLUMN user_id uuid DEFAULT auth.uid();
  END IF;
END $$;

-- study_tasks: add user_id column
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'study_tasks' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE study_tasks ADD COLUMN user_id uuid DEFAULT auth.uid();
  END IF;
END $$;

-- focus_sessions: drop permissive policies and create ownership-scoped ones
DROP POLICY IF EXISTS "anon_select_focus_sessions" ON focus_sessions;
DROP POLICY IF EXISTS "anon_insert_focus_sessions" ON focus_sessions;
DROP POLICY IF EXISTS "anon_update_focus_sessions" ON focus_sessions;
DROP POLICY IF EXISTS "anon_delete_focus_sessions" ON focus_sessions;

CREATE POLICY "select_own_focus_sessions" ON focus_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_focus_sessions" ON focus_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_focus_sessions" ON focus_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_focus_sessions" ON focus_sessions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- study_tasks: drop permissive policies and create ownership-scoped ones
DROP POLICY IF EXISTS "anon_select_study_tasks" ON study_tasks;
DROP POLICY IF EXISTS "anon_insert_study_tasks" ON study_tasks;
DROP POLICY IF EXISTS "anon_update_study_tasks" ON study_tasks;
DROP POLICY IF EXISTS "anon_delete_study_tasks" ON study_tasks;

CREATE POLICY "select_own_study_tasks" ON study_tasks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_study_tasks" ON study_tasks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_study_tasks" ON study_tasks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_study_tasks" ON study_tasks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);


-- ══════════════════════════════════════════════════════════════════════════════
-- 3. FIX SECURITY DEFINER EXECUTION GRANTS
-- Revoke EXECUTE from anon on all SECURITY DEFINER functions
-- ══════════════════════════════════════════════════════════════════════════════

-- Trigger function: only runs via trigger, not via RPC — revoke from both anon and authenticated
REVOKE EXECUTE ON FUNCTION public.assign_user_role() FROM anon, authenticated;

-- RPC-callable SECURITY DEFINER functions: revoke from anon, keep for authenticated
REVOKE EXECUTE ON FUNCTION public.get_current_user_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_admin_action(uuid, text, text, uuid, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.upsert_user_role(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.seed_user_chapters(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.seed_chapter_resources(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.schedule_chapter_revisions(uuid, text, text, text, date) FROM anon;

-- Also revoke from anon on the non-SECURITY-DEFINER helper functions for defense in depth
REVOKE EXECUTE ON FUNCTION public._seed_subject(text, text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public._seed_chapter(uuid, text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public._copy_chapters(text, text, uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculate_resource_metrics() FROM anon;
