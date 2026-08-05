-- ============================================================
-- StudyShield: add coaching-flow columns for the new onboarding
-- Project: htnyxravjtoueqxdyhha (Study Shield)
--
-- WHY: The redesigned onboarding interview asks HOW the user studies
--      (online / offline / self-study), which coaching they use, and
--      whether classes are LIVE or RECORDED. Live students provide a
--      weekly class schedule (multiple blocks per day); recorded
--      students provide lecture duration / count / preferred time.
--      The AI Planner reads these columns to block live class hours
--      and to auto-schedule recorded lectures.
--
-- Columns added:
--   class_mode        text  'live' | 'recorded' | NULL (self-study)
--   class_schedule    jsonb [{"day":"monday","start":"16:00","end":"19:00"}, ...]
--   lecture_duration  integer  minutes per recorded lecture
--   lectures_per_day  integer  recorded lectures to schedule per day
--
-- All statements are idempotent (IF NOT EXISTS) — safe to run again.
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS class_mode text;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS class_schedule jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lecture_duration integer;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lectures_per_day integer;
