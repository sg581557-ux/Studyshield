-- ============================================================
-- Fix onboarding 22P02 "Invalid value type sent to database"
-- Project: StudyShield
--
-- WHY: Production profiles has mismatched types vs app:
--   - target_exam: text[] in schema v3 (20260714213817, 20260714212352)
--     but app sends text string ("jee", "other") via db.completeOnboarding.
--     String into text[] → 22P02 malformed array literal, 100% repro.
--   - exam_year: int in schema v3 but app sends string "2027"
--     via Onboarding wizard → 22P02 invalid input syntax for type integer.
--   Without this, every new registration fails at the final "Complete Setup".
--
-- All statements are idempotent (DO $$ + information_schema checks) — safe to re-run.
-- Existing data is preserved via USING casts.
-- ============================================================

-- 1. target_exam: text[] -> text (keep first element; empty array -> NULL)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='target_exam' AND data_type='ARRAY'
  ) THEN
    ALTER TABLE profiles ALTER COLUMN target_exam TYPE text USING (
      CASE
        WHEN target_exam IS NOT NULL AND array_length(target_exam, 1) IS NOT NULL THEN target_exam[1]
        WHEN target_exam::text = '{}' THEN NULL
        ELSE target_exam::text
      END
    );
  END IF;
END $$;

-- 2. exam_year: integer -> text (app stores string "2027"; Postgres text accepts int cast)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='exam_year' AND data_type='integer'
  ) THEN
    ALTER TABLE profiles ALTER COLUMN exam_year TYPE text USING exam_year::text;
  END IF;
  -- Also handle numeric -> text if some installs used numeric
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='exam_year' AND data_type='numeric'
  ) THEN
    ALTER TABLE profiles ALTER COLUMN exam_year TYPE text USING exam_year::text;
  END IF;
END $$;

-- 3. Defensive: ensure target_exam has no legacy array default lingering
-- (If column is already text, ensure default is sane)
DO $$
BEGIN
  -- Drop any array default like '{}'::text[] that would fail on text column
  BEGIN
    ALTER TABLE profiles ALTER COLUMN target_exam DROP DEFAULT;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

-- 4. Ensure age / tests_per_week / saturday/sunday / session_length_min / break_min
-- are integer/numeric where app sends numbers — these are already correct in
-- most installs but add IF NOT EXISTS guards for fresh DBs that missed a migration.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tests_per_week integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS saturday_study_hours integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sunday_study_hours integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS session_length_min integer NOT NULL DEFAULT 45;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS break_min integer NOT NULL DEFAULT 10;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS desired_sleep_hours numeric;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_goal_hours numeric NOT NULL DEFAULT 4;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weekday_study_hours text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS class_schedule jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subjects text[] NOT NULL DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS academic_goals text[] NOT NULL DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS school_days text[] NOT NULL DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS study_days text[] NOT NULL DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS days_off text[] NOT NULL DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS productive_slots text[] NOT NULL DEFAULT '{}';

-- 5. Backlog defensive: ensure overall_progress is numeric and backlog_types is text[]
ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS overall_progress numeric NOT NULL DEFAULT 0;
ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS backlog_types text[] NOT NULL DEFAULT '{}';
ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS pending_lectures integer NOT NULL DEFAULT 0;
ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS pending_dpps integer NOT NULL DEFAULT 0;
ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS pending_pyqs integer NOT NULL DEFAULT 0;
ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS revision_pending integer NOT NULL DEFAULT 0;
ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS revision_level integer NOT NULL DEFAULT 0;
ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS confidence integer NOT NULL DEFAULT 3;
ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS lecture_status text;
