-- ============================================================
-- StudyShield: sync `profiles` table to the app's expected schema
-- Project: htnyxravjtoueqxdyhha (Study Shield)
--
-- WHY: The live database is missing 22 columns that the app writes.
--   1. The 7 habit-calibration columns were added in migration
--      20260803100000_add_habit_profile_columns.sql, which was NEVER
--      pushed to the remote project. The onboarding final save
--      (db.completeOnboarding in src/services/db.ts) writes all 7,
--      so PostgREST aborts with
--        "A field in the save doesn't exist in the profiles table."
--   2. The 15 settings columns are written by src/pages/SettingsPage.tsx
--      but exist in NO migration file — they would fail the first time
--      a user hits "Save All Changes".
--
-- This file is the permanent source of truth for these columns so the
-- database matches the app 1:1. All statements are idempotent
-- (IF NOT EXISTS) — safe to run again.
--
-- Types/defaults mirror the frontend usage exactly:
--   - time strings  -> text ("HH:MM")
--   - enum-like     -> text with the app's default value
--   - prefs         -> jsonb object
--   - lists         -> text[]
--   - counters      -> integer
-- ============================================================

-- ------------------------------------------------------------
-- 1) Habit-calibration columns (AI Planner habit system)
--    Written by db.completeOnboarding() during the final onboarding step.
-- ------------------------------------------------------------

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weekday_study_hours text;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS saturday_study_hours integer;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sunday_study_hours integer;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS session_length_min integer NOT NULL DEFAULT 45;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS break_min integer NOT NULL DEFAULT 10;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS days_off text[] NOT NULL DEFAULT '{}';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS productive_slots text[] NOT NULL DEFAULT '{}';

-- ------------------------------------------------------------
-- 2) Settings columns (written by SettingsPage.tsx "Save All Changes")
--    Existed in NO migration before this file.
-- ------------------------------------------------------------

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS school_start text;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS school_end text;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS revision_frequency text NOT NULL DEFAULT 'daily';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS difficulty_preference text NOT NULL DEFAULT 'mixed';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_planning_style text NOT NULL DEFAULT 'balanced';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reminder_timings text[] NOT NULL DEFAULT '{}';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS focus_goal text NOT NULL DEFAULT 'maintain';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS backlog_strategy text NOT NULL DEFAULT 'balanced';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_question_target integer NOT NULL DEFAULT 20;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_lecture_target integer NOT NULL DEFAULT 2;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weak_subjects text[] NOT NULL DEFAULT '{}';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS strong_subjects text[] NOT NULL DEFAULT '{}';

-- ------------------------------------------------------------
-- 3) gender CHECK constraint no longer matches the app
--    src/pages/Profile.tsx sends 'Male' | 'Female' | 'Other' |
--    'Prefer not to say' (capitalized), but the constraint added in
--    migration 20260715132953 only allows lowercase values — any gender
--    selection fails the whole profile save. Relax it to accept the
--    app's values (both forms) so Profile saves can never break.
-- ------------------------------------------------------------

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_gender_check;

ALTER TABLE profiles ADD CONSTRAINT profiles_gender_check CHECK (
  gender IS NULL
  OR gender IN (
    'male', 'female', 'other', 'prefer_not_to_say',
    'Male', 'Female', 'Other', 'Prefer not to say'
  )
);
