-- Habit-calibration profile columns (AI Planner habit system).
--
-- Captured during onboarding (see OnboardingInput in src/lib/types.ts) and
-- written by db.completeOnboarding(). The planner uses them to size daily
-- plans (weekday/weekend hours), structure sessions (length + breaks), and
-- place hard tasks into the user's productive time slots.
--
-- All new fields are optional/empty by default so existing rows are valid.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weekday_study_hours text;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS saturday_study_hours integer;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sunday_study_hours integer;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS session_length_min integer NOT NULL DEFAULT 45;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS break_min integer NOT NULL DEFAULT 10;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS days_off text[] NOT NULL DEFAULT '{}';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS productive_slots text[] NOT NULL DEFAULT '{}';
