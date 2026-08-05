/*
# Academic Preferences — Settings page (post-onboarding editing)

## Purpose
Make every onboarding question editable from Settings ("Academic Preferences").
All changes are purely ADDITIVE — existing rows, columns and values are
untouched, so no user data is lost. Backward compatible: every new column has
a sensible default or is nullable, and the app reads them defensively.

## New profiles columns
- school_holidays (text[])           — school holidays (weekday names)
- night_owl_mode (boolean)           — Night Owl study mode toggle
- max_daily_study_hours (numeric)    — AI Planner ceiling per day
- min_daily_study_hours (numeric)    — AI Planner floor per day
- practice_revision_ratio (integer)  — practice % of the practice+revision pool
- priority_weights (jsonb)           — {backlog, lecture, practice, mock} % (sum 100)
- test_duration_min (integer)        — preferred mock test duration
- preferred_test_day (text)          — preferred weekday for tests ("saturday"…)
- mock_analysis_prefs (jsonb)        — {auto_review, show_weak_chapters} booleans
- accent_color (text)                — accent palette key ("blue" | "violet" | …)
- time_format (text)                 — "12h" | "24h"
- date_format (text)                 — "dmy" | "mdy" | "ymd"

## New backlog_items columns
- pending_tests (integer)            — pending mock tests for a chapter

## Existing columns reused (no changes)
full_name, display_name, school_class/class, stream, board, school_name,
target_exam, target_year, school_days, school_start, school_end,
coaching_mode, coaching_name, class_mode, class_schedule, lectures_per_day,
lecture_duration, daily_goal_hours, productive_time, sleep_time, wake_up_time,
break_min, session_length_min, revision_time, subjects, days_off,
ai_planning_style, tests_per_week, notification_prefs, preferred_language, theme
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS school_holidays text[] NOT NULL DEFAULT '{}';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS night_owl_mode boolean NOT NULL DEFAULT false;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS max_daily_study_hours numeric;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS min_daily_study_hours numeric;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS practice_revision_ratio integer NOT NULL DEFAULT 75;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS priority_weights jsonb NOT NULL DEFAULT '{"backlog":30,"lecture":30,"practice":30,"mock":10}'::jsonb;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS test_duration_min integer NOT NULL DEFAULT 120;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_test_day text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS mock_analysis_prefs jsonb NOT NULL DEFAULT '{"auto_review":true,"show_weak_chapters":true}'::jsonb;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS accent_color text NOT NULL DEFAULT 'blue';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS time_format text NOT NULL DEFAULT '12h';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS date_format text NOT NULL DEFAULT 'dmy';

ALTER TABLE backlog_items
  ADD COLUMN IF NOT EXISTS pending_tests integer NOT NULL DEFAULT 0;
