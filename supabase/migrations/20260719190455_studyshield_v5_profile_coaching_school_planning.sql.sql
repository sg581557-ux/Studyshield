/*
# StudyShield v5: Profile coaching/school/planning + formula library + daily plan inputs

## Summary
Upgrades the profiles table with structured coaching and school configuration,
adds a new `formula_library` table with rich formula metadata (variables, units,
shortcuts, common mistakes, PYQ importance, difficulty), and a `daily_plan_inputs`
table that records the user's answers to the daily AI Planner questions
(school day, hours, energy level, exam tomorrow).

## 1. profiles — new columns
All added with IF NOT EXISTS so the migration is safe to re-run.
- `coaching_enabled` boolean default false
- `coaching_name` text
- `coaching_is_live` boolean default true
- `coaching_days` text[] (weekdays the user has live classes, e.g. {Mon,Tue})
- `coaching_start` text (HH:MM, live class window start)
- `coaching_end` text (HH:MM, live class window end)
- `lecture_duration_min` integer default 120 (2 hours)
- `revision_time` text (preferred revision time: morning/afternoon/evening/night)
- `attends_school` boolean default false
- `energy_level` text default 'normal' (low/normal/high — last used daily value)
- `exam_tomorrow` boolean default false (last used daily value)
- `school_board` text
- `school_class` text
- `target_year` already exists; reused.
- `password_changed_at` timestamptz (for change-password tracking)
- `email_verified_at` timestamptz (mirror of auth.users email_confirmed_at for quick UI reads)

## 2. New table: formula_library
A shared (read-only to users) catalog of formulas scoped by exam and subject.
Designed so the Formula Vault can later be fully driven from Supabase instead
of hardcoded data. Columns:
- `id` uuid primary key
- `exam_id` text (matches syllabus_exams.id, e.g. 'jee-main')
- `subject` text
- `chapter` text
- `name` text
- `expression` text
- `variables` jsonb (array of {symbol, meaning, unit})
- `unit` text
- `explanation` text
- `shortcut` text
- `common_mistakes` jsonb (array of strings)
- `pyq_importance` text
- `difficulty` text (easy/medium/hard)
- `created_at` timestamptz default now()

RLS: SELECT TO anon, authenticated (public read — formula catalog is shared
reference data, not user-owned). No insert/update/delete from the client —
formulas are seeded server-side only.

## 3. New table: formula_bookmarks
User-owned bookmarks pointing at formula_library rows.
- `id` uuid primary key
- `user_id` uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
- `formula_id` uuid NOT NULL REFERENCES formula_library(id) ON DELETE CASCADE
- `created_at` timestamptz default now()
- UNIQUE(user_id, formula_id)
RLS: owner-scoped CRUD.

## 4. New table: formula_views
Tracks recently-viewed and frequently-used formulas per user.
- `id` uuid primary key
- `user_id` uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
- `formula_id` uuid NOT NULL REFERENCES formula_library(id) ON DELETE CASCADE
- `viewed_at` timestamptz default now()
RLS: owner-scoped CRUD.

## 5. New table: daily_plan_inputs
Records the user's answers to the daily AI Planner questions. Each row = one
planning session for one date.
- `id` uuid primary key
- `user_id` uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
- `plan_date` date NOT NULL
- `was_school_day` boolean default false
- `study_hours` integer NOT NULL (hard limit in hours)
- `energy_level` text (low/normal/high)
- `exam_tomorrow` boolean default false
- `created_at` timestamptz default now()
- UNIQUE(user_id, plan_date)
RLS: owner-scoped CRUD.

## 6. New table: school_chapter_tracking
Tracks which chapter is currently being taught in school for each subject.
Separate from backlog tracking.
- `id` uuid primary key
- `user_id` uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
- `exam_id` text
- `subject` text
- `chapter` text
- `is_active` boolean default true (currently being taught)
- `created_at` timestamptz default now()
- UNIQUE(user_id, subject)
RLS: owner-scoped CRUD.

## 7. Security
- RLS enabled on all new tables.
- formula_library: public read (shared reference data).
- formula_bookmarks, formula_views, daily_plan_inputs, school_chapter_tracking:
  owner-scoped CRUD via auth.uid() = user_id, with DEFAULT auth.uid() on user_id.
- No changes to existing table policies.

## Notes
- This migration is idempotent (IF NOT EXISTS on all columns and tables;
  policies dropped before re-create).
- No data is deleted or transformed.
- The existing `profiles.coaching_type` column is left as-is; the new
  `coaching_is_live` boolean is the canonical live/recorded flag going forward.
*/

-- 1. profiles new columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='coaching_enabled') THEN
    ALTER TABLE profiles ADD COLUMN coaching_enabled boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='coaching_name') THEN
    ALTER TABLE profiles ADD COLUMN coaching_name text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='coaching_is_live') THEN
    ALTER TABLE profiles ADD COLUMN coaching_is_live boolean NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='coaching_days') THEN
    ALTER TABLE profiles ADD COLUMN coaching_days text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='coaching_start') THEN
    ALTER TABLE profiles ADD COLUMN coaching_start text DEFAULT '09:00';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='coaching_end') THEN
    ALTER TABLE profiles ADD COLUMN coaching_end text DEFAULT '12:00';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='lecture_duration_min') THEN
    ALTER TABLE profiles ADD COLUMN lecture_duration_min integer NOT NULL DEFAULT 120;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='revision_time') THEN
    ALTER TABLE profiles ADD COLUMN revision_time text DEFAULT 'evening';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='attends_school') THEN
    ALTER TABLE profiles ADD COLUMN attends_school boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='energy_level') THEN
    ALTER TABLE profiles ADD COLUMN energy_level text DEFAULT 'normal';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='exam_tomorrow') THEN
    ALTER TABLE profiles ADD COLUMN exam_tomorrow boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='school_board') THEN
    ALTER TABLE profiles ADD COLUMN school_board text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='school_class') THEN
    ALTER TABLE profiles ADD COLUMN school_class text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='password_changed_at') THEN
    ALTER TABLE profiles ADD COLUMN password_changed_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='email_verified_at') THEN
    ALTER TABLE profiles ADD COLUMN email_verified_at timestamptz;
  END IF;
END $$;

-- 2. formula_library (shared reference data)
CREATE TABLE IF NOT EXISTS formula_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id text NOT NULL,
  subject text NOT NULL,
  chapter text NOT NULL,
  name text NOT NULL,
  expression text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  unit text NOT NULL DEFAULT '',
  explanation text NOT NULL DEFAULT '',
  shortcut text NOT NULL DEFAULT '',
  common_mistakes jsonb NOT NULL DEFAULT '[]'::jsonb,
  pyq_importance text NOT NULL DEFAULT '',
  difficulty text NOT NULL DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE formula_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_formula_library" ON formula_library;
CREATE POLICY "read_formula_library" ON formula_library FOR SELECT
  TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_formula_library_exam_subject ON formula_library(exam_id, subject);

-- 3. formula_bookmarks (user-owned)
CREATE TABLE IF NOT EXISTS formula_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  formula_id uuid NOT NULL REFERENCES formula_library(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, formula_id)
);
ALTER TABLE formula_bookmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_bookmarks" ON formula_bookmarks;
CREATE POLICY "select_own_bookmarks" ON formula_bookmarks FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_bookmarks" ON formula_bookmarks;
CREATE POLICY "insert_own_bookmarks" ON formula_bookmarks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_bookmarks" ON formula_bookmarks;
CREATE POLICY "delete_own_bookmarks" ON formula_bookmarks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. formula_views (user-owned)
CREATE TABLE IF NOT EXISTS formula_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  formula_id uuid NOT NULL REFERENCES formula_library(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE formula_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_formula_views" ON formula_views;
CREATE POLICY "select_own_formula_views" ON formula_views FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_formula_views" ON formula_views;
CREATE POLICY "insert_own_formula_views" ON formula_views FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_formula_views" ON formula_views;
CREATE POLICY "delete_own_formula_views" ON formula_views FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_formula_views_user ON formula_views(user_id, viewed_at DESC);

-- 5. daily_plan_inputs (user-owned)
CREATE TABLE IF NOT EXISTS daily_plan_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date date NOT NULL,
  was_school_day boolean NOT NULL DEFAULT false,
  study_hours integer NOT NULL,
  energy_level text NOT NULL DEFAULT 'normal',
  exam_tomorrow boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, plan_date)
);
ALTER TABLE daily_plan_inputs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_plan_inputs" ON daily_plan_inputs;
CREATE POLICY "select_own_plan_inputs" ON daily_plan_inputs FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_plan_inputs" ON daily_plan_inputs;
CREATE POLICY "insert_own_plan_inputs" ON daily_plan_inputs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_plan_inputs" ON daily_plan_inputs;
CREATE POLICY "update_own_plan_inputs" ON daily_plan_inputs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_plan_inputs" ON daily_plan_inputs;
CREATE POLICY "delete_own_plan_inputs" ON daily_plan_inputs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 6. school_chapter_tracking (user-owned)
CREATE TABLE IF NOT EXISTS school_chapter_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id text NOT NULL DEFAULT '',
  subject text NOT NULL,
  chapter text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, subject)
);
ALTER TABLE school_chapter_tracking ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_school_chapters" ON school_chapter_tracking;
CREATE POLICY "select_own_school_chapters" ON school_chapter_tracking FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_school_chapters" ON school_chapter_tracking;
CREATE POLICY "insert_own_school_chapters" ON school_chapter_tracking FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_school_chapters" ON school_chapter_tracking;
CREATE POLICY "update_own_school_chapters" ON school_chapter_tracking FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_school_chapters" ON school_chapter_tracking;
CREATE POLICY "delete_own_school_chapters" ON school_chapter_tracking FOR DELETE TO authenticated USING (auth.uid() = user_id);
