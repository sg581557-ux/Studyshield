/*
# Fix Signed-In Users Can Execute SECURITY DEFINER Functions

## Summary
The Supabase security advisor flagged 7 SECURITY DEFINER functions executable by the
`authenticated` role via PostgREST RPC. Each function is either:
  (a) Safe to run as SECURITY INVOKER because RLS already scopes access to the caller's
      own rows — switching to INVOKER means RLS applies, which is the correct behavior.
  (b) Admin-only and should never be callable by authenticated users via RPC — these
      are revoked from authenticated entirely (only service_role / postgres retain access).

## Function-by-function decisions

### Switch to SECURITY INVOKER (5 functions)
These functions are designed to be called by authenticated users on their own data.
Under INVOKER, RLS policies on the tables they access will enforce ownership checks.

1. `get_current_user_role()` — reads user_roles WHERE user_id = auth.uid().
   RLS: SELECT policy `auth.uid() = user_id` on user_roles. Safe under INVOKER.

2. `is_admin_user()` — reads user_roles WHERE user_id = auth.uid().
   RLS: SELECT policy `auth.uid() = user_id` on user_roles. Safe under INVOKER.

3. `schedule_chapter_revisions(p_user_id, ...)` — inserts into revision_schedule.
   RLS: INSERT policy `WITH CHECK (auth.uid() = user_id)`. Under INVOKER, a user
   can only schedule revisions for themselves (p_user_id must match auth.uid()).

4. `seed_user_chapters(p_user_id, p_exam_name)` — reads syllabus tables (public SELECT
   policy `USING(true)` for authenticated) and inserts into user_chapters.
   RLS: INSERT policy `WITH CHECK (auth.uid() = user_id)`. Under INVOKER, a user
   can only seed chapters for themselves.

5. `seed_chapter_resources(p_user_id, p_exam_name)` — reads syllabus tables (public
   SELECT) and inserts into chapter_resources.
   RLS: INSERT policy `WITH CHECK (auth.uid() = user_id)`. Under INVOKER, a user
   can only seed resources for themselves.

### REVOKE EXECUTE from authenticated (2 functions)
These functions modify tables that are admin-only (RLS policies use `WITH CHECK false`
for authenticated). They must only be called via service_role (edge functions) or
internal triggers, never directly by authenticated users.

6. `log_admin_action(...)` — inserts into admin_logs.
   RLS: INSERT policy `WITH CHECK false` for authenticated. Admin-only.

7. `upsert_user_role(p_user_id, p_email)` — inserts/updates user_roles.
   RLS: INSERT `WITH CHECK false`, UPDATE `USING false WITH CHECK false` for
   authenticated. Admin-only.

## Security Changes
- 5 functions: SECURITY DEFINER → SECURITY INVOKER (RLS now applies)
- 2 functions: REVOKE EXECUTE FROM authenticated (admin-only, service_role only)
- All functions retain `SET search_path = public, pg_temp` from prior migration
- All functions retain REVOKE FROM PUBLIC / anon from prior migration
*/

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Switch user-facing functions to SECURITY INVOKER
-- ══════════════════════════════════════════════════════════════════════════════

-- get_current_user_role: SECURITY INVOKER (RLS scopes to own row)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE v_role text;
BEGIN
  SELECT role INTO v_role FROM user_roles WHERE user_id = auth.uid();
  RETURN COALESCE(v_role, 'user');
END;
$function$;

-- is_admin_user: SECURITY INVOKER (RLS scopes to own row)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
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

-- schedule_chapter_revisions: SECURITY INVOKER (RLS enforces p_user_id = auth.uid())
CREATE OR REPLACE FUNCTION public.schedule_chapter_revisions(
  p_user_id uuid,
  p_exam text,
  p_subject text,
  p_chapter text,
  p_learned_date date DEFAULT CURRENT_DATE
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
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

-- seed_user_chapters: SECURITY INVOKER (RLS enforces p_user_id = auth.uid())
CREATE OR REPLACE FUNCTION public.seed_user_chapters(p_user_id uuid, p_exam_name text)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
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

-- seed_chapter_resources: SECURITY INVOKER (RLS enforces p_user_id = auth.uid())
CREATE OR REPLACE FUNCTION public.seed_chapter_resources(p_user_id uuid, p_exam_name text)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
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


-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Revoke EXECUTE from authenticated on admin-only functions
-- ══════════════════════════════════════════════════════════════════════════════

REVOKE EXECUTE ON FUNCTION public.log_admin_action(uuid, text, text, uuid, text, jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.upsert_user_role(uuid, text) FROM authenticated;
