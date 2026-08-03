-- ============================================================
-- StudyShield PHASE 2 — remaining migrations (from abort point)
-- Project: htnyxravjtoueqxdyhha
-- Covers: profiles missing columns, syllabus, formulas, admin
-- tables, security fixes, ai_plans + plan_tasks gap fix, planner
-- v2, mentor tables, mock tests, signup trigger, onboarding v2.
-- All CREATE POLICY / CREATE TRIGGER are drop-guarded: this
-- script is safe to run once (and can be re-run harmlessly).
-- HOW TO RUN: Dashboard -> SQL Editor -> paste -> Run.
-- ============================================================

-- ############################################################
-- ## 20260715132854_create_admin_dashboard_tables.sql
-- ############################################################
/*
# Create admin dashboard support tables

## Purpose
Tables to power the Developer Dashboard: feature analytics, study analytics,
bug reports, feedback, announcements, admin action logs, notifications,
and user activity tracking.

## New Tables (7)
1. feature_usage â€” tracks feature usage per user per day
2. bug_reports â€” user-submitted bug reports with status
3. feedback â€” user feedback with rating, category, searchable
4. announcements â€” admin-created push/in-app announcements with targeting
5. admin_logs â€” audit trail for all admin actions
6. user_notifications â€” in-app notifications for users
7. user_activity â€” tracks online status, last active, device info

## Security (RLS)
- feature_usage, bug_reports, feedback: users can INSERT/SELECT their own
- announcements: all authenticated can SELECT; only admins can INSERT/UPDATE/DELETE
- admin_logs: only admins can SELECT; no direct INSERT (edge function via service role)
- user_notifications: users can SELECT/UPDATE/DELETE their own
- user_activity: users can INSERT/UPDATE their own

## Realtime
All 7 tables added to supabase_realtime publication for live dashboard updates.
*/

-- ============================================================
-- 1. feature_usage
-- ============================================================
CREATE TABLE IF NOT EXISTS feature_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name text NOT NULL CHECK (feature_name IN (
    'pomodoro_timer', 'study_timer', 'formula_vault', 'module_tracker',
    'revision_planner', 'ai_mentor', 'mock_tests', 'website_blocker',
    'android_app_blocker', 'notes', 'pyq_practice', 'planner'
  )),
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  usage_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_usage_unique
  ON feature_usage(user_id, feature_name, usage_date);
CREATE INDEX IF NOT EXISTS idx_feature_usage_feature ON feature_usage(feature_name);
CREATE INDEX IF NOT EXISTS idx_feature_usage_date ON feature_usage(usage_date);

ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_feature_usage" ON feature_usage;
CREATE POLICY "select_own_feature_usage" ON feature_usage FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_feature_usage" ON feature_usage;
CREATE POLICY "insert_own_feature_usage" ON feature_usage FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_feature_usage" ON feature_usage;
CREATE POLICY "update_own_feature_usage" ON feature_usage FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 2. bug_reports
-- ============================================================
CREATE TABLE IF NOT EXISTS bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  description text NOT NULL,
  screenshot_url text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created ON bug_reports(created_at DESC);

ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_bug_reports" ON bug_reports;
CREATE POLICY "select_own_bug_reports" ON bug_reports FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_bug_reports" ON bug_reports;
CREATE POLICY "insert_own_bug_reports" ON bug_reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 3. feedback
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  message text NOT NULL,
  category text DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback(rating);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_feedback" ON feedback;
CREATE POLICY "select_own_feedback" ON feedback FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_feedback" ON feedback;
CREATE POLICY "insert_own_feedback" ON feedback FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 4. announcements
-- ============================================================
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'in_app' CHECK (type IN ('push', 'in_app')),
  target_audience text NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'premium', 'exam', 'class')),
  target_value text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(created_at DESC);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_announcements" ON announcements;
CREATE POLICY "select_announcements" ON announcements FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_announcements_admin" ON announcements;
CREATE POLICY "insert_announcements_admin" ON announcements FOR INSERT
  TO authenticated WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS "update_announcements_admin" ON announcements;
CREATE POLICY "update_announcements_admin" ON announcements FOR UPDATE
  TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS "delete_announcements_admin" ON announcements;
CREATE POLICY "delete_announcements_admin" ON announcements FOR DELETE
  TO authenticated USING (is_admin_user());

-- ============================================================
-- 5. admin_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_email text NOT NULL,
  action text NOT NULL CHECK (action IN (
    'login', 'logout', 'password_reset', 'role_change',
    'ban_user', 'unban_user', 'delete_user', 'reset_progress',
    'grant_premium', 'remove_premium', 'send_announcement',
    'resolve_bug', 'close_bug'
  )),
  target_user_id uuid,
  target_user_email text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at DESC);

ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_admin_logs" ON admin_logs;
CREATE POLICY "select_admin_logs" ON admin_logs FOR SELECT
  TO authenticated USING (is_admin_user());

DROP POLICY IF EXISTS "insert_admin_logs" ON admin_logs;
CREATE POLICY "insert_admin_logs" ON admin_logs FOR INSERT
  TO authenticated WITH CHECK (false);

-- ============================================================
-- 6. user_notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'announcement')),
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread ON user_notifications(user_id, read);

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON user_notifications;
CREATE POLICY "select_own_notifications" ON user_notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON user_notifications;
CREATE POLICY "insert_own_notifications" ON user_notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON user_notifications;
CREATE POLICY "update_own_notifications" ON user_notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON user_notifications;
CREATE POLICY "delete_own_notifications" ON user_notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 7. user_activity
-- ============================================================
CREATE TABLE IF NOT EXISTS user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online boolean NOT NULL DEFAULT false,
  last_active timestamptz NOT NULL DEFAULT now(),
  device_info jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_online ON user_activity(is_online);
CREATE INDEX IF NOT EXISTS idx_user_activity_last_active ON user_activity(last_active DESC);

ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_activity" ON user_activity;
CREATE POLICY "select_own_activity" ON user_activity FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_activity" ON user_activity;
CREATE POLICY "insert_own_activity" ON user_activity FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_activity" ON user_activity;
CREATE POLICY "update_own_activity" ON user_activity FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 8. Helper function: log_admin_action
-- ============================================================
CREATE OR REPLACE FUNCTION log_admin_action(
  p_admin_id uuid,
  p_admin_email text,
  p_action text,
  p_target_user_id uuid DEFAULT NULL,
  p_target_user_email text DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO admin_logs (admin_id, admin_email, action, target_user_id, target_user_email, details)
  VALUES (p_admin_id, p_admin_email, p_action, p_target_user_id, p_target_user_email, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 9. Enable realtime on all tables
-- ============================================================
ALTER TABLE user_roles REPLICA IDENTITY FULL;
ALTER TABLE feature_usage REPLICA IDENTITY FULL;
ALTER TABLE bug_reports REPLICA IDENTITY FULL;
ALTER TABLE feedback REPLICA IDENTITY FULL;
ALTER TABLE announcements REPLICA IDENTITY FULL;
ALTER TABLE admin_logs REPLICA IDENTITY FULL;
ALTER TABLE user_activity REPLICA IDENTITY FULL;
ALTER TABLE user_notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'user_roles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_roles;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'feature_usage') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE feature_usage;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'bug_reports') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bug_reports;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'feedback') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE feedback;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'announcements') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'admin_logs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE admin_logs;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'user_activity') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_activity;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'user_notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;
  END IF;
END $$;

-- ============================================================
-- 10. Grant permissions
-- ============================================================
GRANT SELECT ON announcements TO authenticated;
GRANT SELECT, INSERT ON bug_reports TO authenticated;
GRANT SELECT, INSERT ON feedback TO authenticated;
GRANT SELECT, INSERT, UPDATE ON feature_usage TO authenticated;
GRANT SELECT, UPDATE, DELETE ON user_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_activity TO authenticated;
GRANT SELECT ON admin_logs TO authenticated;
GRANT EXECUTE ON FUNCTION log_admin_action(uuid, text, text, uuid, text, jsonb) TO authenticated;


-- ############################################################
-- ## 20260715132953_add_enhanced_profile_columns.sql
-- ############################################################
/*
# Add enhanced profile columns and admin user management fields

## Purpose
Add columns needed by the premium Profile page (dob, gender, dream_career, etc.)
and admin user management fields (is_premium, is_banned, banned_at, banned_reason).

## New columns on profiles table (17)

Profile enhancement columns:
- date_of_birth   date       â€” user's date of birth
- gender          text       â€” male / female / other / prefer_not_to_say
- dream_career    text       â€” target career
- weekly_goal_days integer   â€” days per week the user aims to study (1-7)
- longest_streak  integer    â€” user's longest study streak
- revision_count  integer    â€” total revisions completed
- mock_tests_count integer   â€” total mock tests taken
- achievements    jsonb      â€” array of achievement objects
- motivation_quote text      â€” user's personal motivation quote

Admin management columns:
- is_premium      boolean    â€” whether user has premium access
- is_banned       boolean    â€” whether user is banned
- banned_at       timestamptz â€” when the user was banned
- banned_reason   text       â€” reason for ban
- last_active     timestamptz â€” last activity timestamp
- device_info     jsonb      â€” device/browser info for admin dashboard
- reset_at        timestamptz â€” when progress was last reset by admin

## Security
No RLS policy changes needed â€” existing policies cover new columns.
is_premium and is_banned are only writable by admins via the edge function
(service role bypasses RLS). Users can update their own profile fields but
not these admin-controlled fields (enforced in the edge function, not RLS,
since RLS can't distinguish individual columns).

## Important Notes
1. All columns are nullable with safe defaults â€” existing rows remain valid.
2. is_premium defaults to false, is_banned defaults to false.
3. longest_streak, revision_count, mock_tests_count default to 0.
*/

DO $$
BEGIN
  -- Profile enhancement columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'date_of_birth') THEN
    ALTER TABLE profiles ADD COLUMN date_of_birth date;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'gender') THEN
    ALTER TABLE profiles ADD COLUMN gender text CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'dream_career') THEN
    ALTER TABLE profiles ADD COLUMN dream_career text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'weekly_goal_days') THEN
    ALTER TABLE profiles ADD COLUMN weekly_goal_days integer NOT NULL DEFAULT 5;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'longest_streak') THEN
    ALTER TABLE profiles ADD COLUMN longest_streak integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'revision_count') THEN
    ALTER TABLE profiles ADD COLUMN revision_count integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'mock_tests_count') THEN
    ALTER TABLE profiles ADD COLUMN mock_tests_count integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'achievements') THEN
    ALTER TABLE profiles ADD COLUMN achievements jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'motivation_quote') THEN
    ALTER TABLE profiles ADD COLUMN motivation_quote text;
  END IF;

  -- Admin management columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_premium') THEN
    ALTER TABLE profiles ADD COLUMN is_premium boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_banned') THEN
    ALTER TABLE profiles ADD COLUMN is_banned boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'banned_at') THEN
    ALTER TABLE profiles ADD COLUMN banned_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'banned_reason') THEN
    ALTER TABLE profiles ADD COLUMN banned_reason text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_active') THEN
    ALTER TABLE profiles ADD COLUMN last_active timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'device_info') THEN
    ALTER TABLE profiles ADD COLUMN device_info jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'reset_at') THEN
    ALTER TABLE profiles ADD COLUMN reset_at timestamptz;
  END IF;

  -- Enable realtime on profiles
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
  END IF;
END $$;


-- ############################################################
-- ## 20260715140056_create_syllabus_tables.sql
-- ############################################################
/*
# Create syllabus tables and seed with complete exam data

## Purpose
Store the complete syllabus hierarchy (Exam â†’ Subject â†’ Chapter) in the database
so the Module Tracker and AI Planner can fetch from the DB instead of hardcoded arrays.

## New Tables (3)

### 1. syllabus_exams
- id (text PK, e.g. 'jee-main')
- name (text, e.g. 'JEE Main')
- category (text, e.g. 'Engineering')

### 2. syllabus_subjects
- id (uuid PK)
- exam_id (text FK â†’ syllabus_exams.id)
- name (text, e.g. 'Physics')
- display_order (int, for sorting)

### 3. syllabus_chapters
- id (uuid PK)
- subject_id (uuid FK â†’ syllabus_subjects.id)
- name (text, e.g. 'Units and Measurements')
- display_order (int, for sorting)

## RLS
- All three tables are readable by all authenticated users (shared syllabus data).
- No INSERT/UPDATE/DELETE via RLS â€” only the service role can modify syllabus data.

## Seeding
All exams, subjects, and chapters from the TypeScript examData.ts file are inserted.
This includes JEE Main, JEE Advanced, NEET, UPSC, CA, SSC, Banking, CAT, and more.

## Important Notes
1. Uses ON CONFLICT DO NOTHING so re-running is safe.
2. The display_order preserves the order of subjects and chapters as defined in examData.ts.
3. user_chapters (existing table) will store per-user progress keyed by exam/subject/chapter names.
*/

-- ============================================================
-- 1. syllabus_exams
-- ============================================================
CREATE TABLE IF NOT EXISTS syllabus_exams (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General'
);

ALTER TABLE syllabus_exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_syllabus_exams" ON syllabus_exams;
CREATE POLICY "select_syllabus_exams" ON syllabus_exams FOR SELECT
  TO authenticated USING (true);

-- ============================================================
-- 2. syllabus_subjects
-- ============================================================
CREATE TABLE IF NOT EXISTS syllabus_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id text NOT NULL REFERENCES syllabus_exams(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_syllabus_subjects_exam ON syllabus_subjects(exam_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_syllabus_subjects_unique ON syllabus_subjects(exam_id, name);

ALTER TABLE syllabus_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_syllabus_subjects" ON syllabus_subjects;
CREATE POLICY "select_syllabus_subjects" ON syllabus_subjects FOR SELECT
  TO authenticated USING (true);

-- ============================================================
-- 3. syllabus_chapters
-- ============================================================
CREATE TABLE IF NOT EXISTS syllabus_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES syllabus_subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_syllabus_chapters_subject ON syllabus_chapters(subject_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_syllabus_chapters_unique ON syllabus_chapters(subject_id, name);

ALTER TABLE syllabus_chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_syllabus_chapters" ON syllabus_chapters;
CREATE POLICY "select_syllabus_chapters" ON syllabus_chapters FOR SELECT
  TO authenticated USING (true);

-- ============================================================
-- 4. SEED: Exams
-- ============================================================
INSERT INTO syllabus_exams (id, name, category) VALUES
  ('jee-main', 'JEE Main', 'Engineering'),
  ('jee-advanced', 'JEE Advanced', 'Engineering'),
  ('neet-ug', 'NEET UG', 'Medical'),
  ('upsc-cse', 'UPSC CSE', 'Civil Services'),
  ('ca-foundation', 'CA Foundation', 'Commerce'),
  ('ca-intermediate', 'CA Intermediate', 'Commerce'),
  ('ca-final', 'CA Final', 'Commerce'),
  ('ssc-cgl', 'SSC CGL', 'Government Jobs'),
  ('ssc-chsl', 'SSC CHSL', 'Government Jobs'),
  ('banking-exams', 'Banking Exams', 'Banking'),
  ('cat', 'CAT', 'Management'),
  ('clat', 'CLAT', 'Law'),
  ('nda', 'NDA', 'Defence'),
  ('cds', 'CDS', 'Defence'),
  ('gate', 'GATE', 'Engineering'),
  ('cuet-ug', 'CUET UG', 'Entrance'),
  ('cuet-pg', 'CUET PG', 'Entrance'),
  ('bitsat', 'BITSAT', 'Engineering'),
  ('wbjee', 'WBJEE', 'Engineering'),
  ('mht-cet', 'MHT CET', 'Engineering'),
  ('comedk', 'COMEDK', 'Engineering'),
  ('viteee', 'VITEEE', 'Engineering'),
  ('srmjeee', 'SRMJEEE', 'Engineering'),
  ('kiitee', 'KIITEE', 'Engineering'),
  ('neet-ug-aiims', 'AIIMS (legacy)', 'Medical'),
  ('cs', 'CS', 'Commerce'),
  ('cma', 'CMA', 'Commerce'),
  ('olympiads', 'Olympiads', 'School'),
  ('railway-exams', 'Railway Exams', 'Government Jobs'),
  ('state-psc', 'State PSC', 'Civil Services'),
  ('other', 'Other', 'General')
ON CONFLICT (id) DO NOTHING;


-- ############################################################
-- ## 20260715140411_seed_syllabus_part1.sql
-- ############################################################
/*
# Seed syllabus subjects and chapters â€” Part 1 (JEE + NEET + Engineering)

Inserts all subjects and chapters for JEE Main, JEE Advanced, NEET, BITSAT, WBJEE, MHT CET, COMEDK, VITEEE, SRMJEEE, KIITEE, AIIMS.

Uses helper functions to reduce repetition.
*/

CREATE OR REPLACE FUNCTION _seed_subject(p_exam_id text, p_name text, p_order int)
RETURNS uuid AS $$
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
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _seed_chapter(p_subject_id uuid, p_name text, p_order int)
RETURNS void AS $$
BEGIN
  INSERT INTO syllabus_chapters (subject_id, name, display_order)
  VALUES (p_subject_id, p_name, p_order)
  ON CONFLICT (subject_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Helper: copy all chapters from one subject to another
CREATE OR REPLACE FUNCTION _copy_chapters(p_src_exam text, p_src_subject text, p_dst_subject_id uuid, p_start_order int DEFAULT 0)
RETURNS void AS $$
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
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  v_physics uuid; v_chem uuid; v_maths uuid; v_bio uuid; v_gk uuid; v_eng uuid; v_lr uuid;
  v_exam_id text;
BEGIN
  -- ============ JEE MAIN ============
  v_physics := _seed_subject('jee-main', 'Physics', 0);
  v_chem := _seed_subject('jee-main', 'Chemistry', 1);
  v_maths := _seed_subject('jee-main', 'Mathematics', 2);

  PERFORM _seed_chapter(v_physics, 'Units and Measurements', 0);
  PERFORM _seed_chapter(v_physics, 'Kinematics', 1);
  PERFORM _seed_chapter(v_physics, 'Laws of Motion', 2);
  PERFORM _seed_chapter(v_physics, 'Work, Energy and Power', 3);
  PERFORM _seed_chapter(v_physics, 'Rotational Motion', 4);
  PERFORM _seed_chapter(v_physics, 'Gravitation', 5);
  PERFORM _seed_chapter(v_physics, 'Properties of Solids and Liquids', 6);
  PERFORM _seed_chapter(v_physics, 'Thermodynamics', 7);
  PERFORM _seed_chapter(v_physics, 'Kinetic Theory of Gases', 8);
  PERFORM _seed_chapter(v_physics, 'Oscillations and Waves', 9);
  PERFORM _seed_chapter(v_physics, 'Electrostatics', 10);
  PERFORM _seed_chapter(v_physics, 'Current Electricity', 11);
  PERFORM _seed_chapter(v_physics, 'Magnetic Effects of Current and Magnetism', 12);
  PERFORM _seed_chapter(v_physics, 'Electromagnetic Induction and Alternating Currents', 13);
  PERFORM _seed_chapter(v_physics, 'Electromagnetic Waves', 14);
  PERFORM _seed_chapter(v_physics, 'Optics', 15);
  PERFORM _seed_chapter(v_physics, 'Dual Nature of Matter and Radiation', 16);
  PERFORM _seed_chapter(v_physics, 'Atoms and Nuclei', 17);
  PERFORM _seed_chapter(v_physics, 'Electronic Devices', 18);
  PERFORM _seed_chapter(v_physics, 'Communication Systems', 19);

  PERFORM _seed_chapter(v_chem, 'Some Basic Concepts of Chemistry', 0);
  PERFORM _seed_chapter(v_chem, 'Atomic Structure', 1);
  PERFORM _seed_chapter(v_chem, 'Classification of Elements and Periodicity', 2);
  PERFORM _seed_chapter(v_chem, 'Chemical Bonding and Molecular Structure', 3);
  PERFORM _seed_chapter(v_chem, 'States of Matter', 4);
  PERFORM _seed_chapter(v_chem, 'Thermodynamics', 5);
  PERFORM _seed_chapter(v_chem, 'Equilibrium', 6);
  PERFORM _seed_chapter(v_chem, 'Redox Reactions', 7);
  PERFORM _seed_chapter(v_chem, 'Hydrogen', 8);
  PERFORM _seed_chapter(v_chem, 'The s-Block Elements', 9);
  PERFORM _seed_chapter(v_chem, 'The p-Block Elements (Group 13 & 14)', 10);
  PERFORM _seed_chapter(v_chem, 'Organic Chemistry â€” Some Basic Principles', 11);
  PERFORM _seed_chapter(v_chem, 'Hydrocarbons', 12);
  PERFORM _seed_chapter(v_chem, 'Environmental Chemistry', 13);
  PERFORM _seed_chapter(v_chem, 'The Solid State', 14);
  PERFORM _seed_chapter(v_chem, 'Solutions', 15);
  PERFORM _seed_chapter(v_chem, 'Electrochemistry', 16);
  PERFORM _seed_chapter(v_chem, 'Chemical Kinetics', 17);
  PERFORM _seed_chapter(v_chem, 'Surface Chemistry', 18);
  PERFORM _seed_chapter(v_chem, 'The p-Block Elements (Group 15-18)', 19);
  PERFORM _seed_chapter(v_chem, 'The d- and f-Block Elements', 20);
  PERFORM _seed_chapter(v_chem, 'Coordination Compounds', 21);
  PERFORM _seed_chapter(v_chem, 'Haloalkanes and Haloarenes', 22);
  PERFORM _seed_chapter(v_chem, 'Alcohols, Phenols and Ethers', 23);
  PERFORM _seed_chapter(v_chem, 'Aldehydes, Ketones and Carboxylic Acids', 24);
  PERFORM _seed_chapter(v_chem, 'Amines', 25);
  PERFORM _seed_chapter(v_chem, 'Biomolecules', 26);
  PERFORM _seed_chapter(v_chem, 'Polymers', 27);
  PERFORM _seed_chapter(v_chem, 'Chemistry in Everyday Life', 28);

  PERFORM _seed_chapter(v_maths, 'Sets, Relations and Functions', 0);
  PERFORM _seed_chapter(v_maths, 'Complex Numbers and Quadratic Equations', 1);
  PERFORM _seed_chapter(v_maths, 'Matrices and Determinants', 2);
  PERFORM _seed_chapter(v_maths, 'Permutations and Combinations', 3);
  PERFORM _seed_chapter(v_maths, 'Mathematical Induction', 4);
  PERFORM _seed_chapter(v_maths, 'Binomial Theorem and Its Simple Applications', 5);
  PERFORM _seed_chapter(v_maths, 'Sequences and Series', 6);
  PERFORM _seed_chapter(v_maths, 'Limit, Continuity and Differentiability', 7);
  PERFORM _seed_chapter(v_maths, 'Applications of Derivatives', 8);
  PERFORM _seed_chapter(v_maths, 'Integral Calculus', 9);
  PERFORM _seed_chapter(v_maths, 'Applications of Integrals', 10);
  PERFORM _seed_chapter(v_maths, 'Differential Equations', 11);
  PERFORM _seed_chapter(v_maths, 'Coordinate Geometry â€” Straight Lines', 12);
  PERFORM _seed_chapter(v_maths, 'Coordinate Geometry â€” Circles', 13);
  PERFORM _seed_chapter(v_maths, 'Coordinate Geometry â€” Conic Sections', 14);
  PERFORM _seed_chapter(v_maths, 'Three-Dimensional Geometry', 15);
  PERFORM _seed_chapter(v_maths, 'Vector Algebra', 16);
  PERFORM _seed_chapter(v_maths, 'Statistics and Probability', 17);
  PERFORM _seed_chapter(v_maths, 'Trigonometric Functions and Identities', 18);
  PERFORM _seed_chapter(v_maths, 'Inverse Trigonometric Functions', 19);
  PERFORM _seed_chapter(v_maths, 'Mathematical Reasoning', 20);

  -- ============ JEE ADVANCED (extends JEE Main) ============
  v_physics := _seed_subject('jee-advanced', 'Physics', 0);
  v_chem := _seed_subject('jee-advanced', 'Chemistry', 1);
  v_maths := _seed_subject('jee-advanced', 'Mathematics', 2);
  PERFORM _copy_chapters('jee-main', 'Physics', v_physics);
  PERFORM _copy_chapters('jee-main', 'Chemistry', v_chem);
  PERFORM _copy_chapters('jee-main', 'Mathematics', v_maths);
  -- JEE Advanced extra chapters
  PERFORM _seed_chapter(v_physics, 'General Physics (Units, Dimensions, Experimental Skills)', 20);
  PERFORM _seed_chapter(v_physics, 'Practical Physics (Error Analysis, Experiments)', 21);
  PERFORM _seed_chapter(v_chem, 'Practical Chemistry (Salt Analysis, Volumetric Analysis)', 29);
  PERFORM _seed_chapter(v_chem, 'Qualitative Organic Analysis', 30);
  PERFORM _seed_chapter(v_maths, 'Calculus of Several Variables', 21);
  PERFORM _seed_chapter(v_maths, 'Probability Distributions', 22);
  PERFORM _seed_chapter(v_maths, 'Numerical Methods', 23);

  -- ============ NEET UG ============
  v_physics := _seed_subject('neet-ug', 'Physics', 0);
  v_chem := _seed_subject('neet-ug', 'Chemistry', 1);
  v_bio := _seed_subject('neet-ug', 'Botany', 2);
  DECLARE v_zoo uuid;
  BEGIN
    v_zoo := _seed_subject('neet-ug', 'Zoology', 3);

    PERFORM _seed_chapter(v_physics, 'Physical World and Measurement', 0);
    PERFORM _seed_chapter(v_physics, 'Kinematics', 1);
    PERFORM _seed_chapter(v_physics, 'Laws of Motion', 2);
    PERFORM _seed_chapter(v_physics, 'Work, Energy and Power', 3);
    PERFORM _seed_chapter(v_physics, 'Rotational Motion', 4);
    PERFORM _seed_chapter(v_physics, 'Gravitation', 5);
    PERFORM _seed_chapter(v_physics, 'Properties of Bulk Matter', 6);
    PERFORM _seed_chapter(v_physics, 'Thermodynamics', 7);
    PERFORM _seed_chapter(v_physics, 'Kinetic Theory of Gases', 8);
    PERFORM _seed_chapter(v_physics, 'Oscillations and Waves', 9);
    PERFORM _seed_chapter(v_physics, 'Electrostatics', 10);
    PERFORM _seed_chapter(v_physics, 'Current Electricity', 11);
    PERFORM _seed_chapter(v_physics, 'Magnetic Effects of Current and Magnetism', 12);
    PERFORM _seed_chapter(v_physics, 'Electromagnetic Induction and Alternating Currents', 13);
    PERFORM _seed_chapter(v_physics, 'Electromagnetic Waves', 14);
    PERFORM _seed_chapter(v_physics, 'Ray Optics and Optical Instruments', 15);
    PERFORM _seed_chapter(v_physics, 'Wave Optics', 16);
    PERFORM _seed_chapter(v_physics, 'Dual Nature of Matter and Radiation', 17);
    PERFORM _seed_chapter(v_physics, 'Atoms and Nuclei', 18);
    PERFORM _seed_chapter(v_physics, 'Semiconductor Electronics', 19);

    -- Chemistry (same as JEE Main with some renamed)
    PERFORM _seed_chapter(v_chem, 'Some Basic Concepts of Chemistry', 0);
    PERFORM _seed_chapter(v_chem, 'Structure of Atom', 1);
    PERFORM _seed_chapter(v_chem, 'Classification of Elements and Periodicity', 2);
    PERFORM _seed_chapter(v_chem, 'Chemical Bonding and Molecular Structure', 3);
    PERFORM _seed_chapter(v_chem, 'States of Matter', 4);
    PERFORM _seed_chapter(v_chem, 'Thermodynamics', 5);
    PERFORM _seed_chapter(v_chem, 'Equilibrium', 6);
    PERFORM _seed_chapter(v_chem, 'Redox Reactions', 7);
    PERFORM _seed_chapter(v_chem, 'Hydrogen', 8);
    PERFORM _seed_chapter(v_chem, 's-Block Elements', 9);
    PERFORM _seed_chapter(v_chem, 'p-Block Elements', 10);
    PERFORM _seed_chapter(v_chem, 'Organic Chemistry â€” Basic Principles', 11);
    PERFORM _seed_chapter(v_chem, 'Hydrocarbons', 12);
    PERFORM _seed_chapter(v_chem, 'Environmental Chemistry', 13);
    PERFORM _seed_chapter(v_chem, 'Solid State', 14);
    PERFORM _seed_chapter(v_chem, 'Solutions', 15);
    PERFORM _seed_chapter(v_chem, 'Electrochemistry', 16);
    PERFORM _seed_chapter(v_chem, 'Chemical Kinetics', 17);
    PERFORM _seed_chapter(v_chem, 'Surface Chemistry', 18);
    PERFORM _seed_chapter(v_chem, 'p-Block Elements (Group 15-18)', 19);
    PERFORM _seed_chapter(v_chem, 'd- and f-Block Elements', 20);
    PERFORM _seed_chapter(v_chem, 'Coordination Compounds', 21);
    PERFORM _seed_chapter(v_chem, 'Haloalkanes and Haloarenes', 22);
    PERFORM _seed_chapter(v_chem, 'Alcohols, Phenols and Ethers', 23);
    PERFORM _seed_chapter(v_chem, 'Aldehydes, Ketones and Carboxylic Acids', 24);
    PERFORM _seed_chapter(v_chem, 'Amines', 25);
    PERFORM _seed_chapter(v_chem, 'Biomolecules', 26);
    PERFORM _seed_chapter(v_chem, 'Polymers', 27);
    PERFORM _seed_chapter(v_chem, 'Chemistry in Everyday Life', 28);

    -- Botany
    PERFORM _seed_chapter(v_bio, 'The Living World', 0);
    PERFORM _seed_chapter(v_bio, 'Biological Classification', 1);
    PERFORM _seed_chapter(v_bio, 'Plant Kingdom', 2);
    PERFORM _seed_chapter(v_bio, 'Morphology of Flowering Plants', 3);
    PERFORM _seed_chapter(v_bio, 'Anatomy of Flowering Plants', 4);
    PERFORM _seed_chapter(v_bio, 'Cell â€” The Unit of Life', 5);
    PERFORM _seed_chapter(v_bio, 'Cell Cycle and Cell Division', 6);
    PERFORM _seed_chapter(v_bio, 'Transport in Plants', 7);
    PERFORM _seed_chapter(v_bio, 'Mineral Nutrition', 8);
    PERFORM _seed_chapter(v_bio, 'Photosynthesis in Higher Plants', 9);
    PERFORM _seed_chapter(v_bio, 'Respiration in Plants', 10);
    PERFORM _seed_chapter(v_bio, 'Plant Growth and Development', 11);
    PERFORM _seed_chapter(v_bio, 'Reproduction in Organisms', 12);
    PERFORM _seed_chapter(v_bio, 'Sexual Reproduction in Flowering Plants', 13);
    PERFORM _seed_chapter(v_bio, 'Principles of Inheritance and Variation', 14);
    PERFORM _seed_chapter(v_bio, 'Molecular Basis of Inheritance', 15);
    PERFORM _seed_chapter(v_bio, 'Strategies for Enhancement in Food Production', 16);
    PERFORM _seed_chapter(v_bio, 'Microbes in Human Welfare', 17);
    PERFORM _seed_chapter(v_bio, 'Biotechnology â€” Principles and Processes', 18);
    PERFORM _seed_chapter(v_bio, 'Biotechnology and Its Applications', 19);
    PERFORM _seed_chapter(v_bio, 'Organisms and Populations', 20);
    PERFORM _seed_chapter(v_bio, 'Ecosystem', 21);
    PERFORM _seed_chapter(v_bio, 'Biodiversity and Conservation', 22);
    PERFORM _seed_chapter(v_bio, 'Environmental Issues', 23);

    -- Zoology
    PERFORM _seed_chapter(v_zoo, 'Animal Kingdom', 0);
    PERFORM _seed_chapter(v_zoo, 'Structural Organisation in Animals', 1);
    PERFORM _seed_chapter(v_zoo, 'Digestion and Absorption', 2);
    PERFORM _seed_chapter(v_zoo, 'Breathing and Exchange of Gases', 3);
    PERFORM _seed_chapter(v_zoo, 'Body Fluids and Circulation', 4);
    PERFORM _seed_chapter(v_zoo, 'Excretory Products and Their Elimination', 5);
    PERFORM _seed_chapter(v_zoo, 'Locomotion and Movement', 6);
    PERFORM _seed_chapter(v_zoo, 'Neural Control and Coordination', 7);
    PERFORM _seed_chapter(v_zoo, 'Chemical Coordination and Integration', 8);
    PERFORM _seed_chapter(v_zoo, 'Human Reproduction', 9);
    PERFORM _seed_chapter(v_zoo, 'Reproductive Health', 10);
    PERFORM _seed_chapter(v_zoo, 'Evolution', 11);
    PERFORM _seed_chapter(v_zoo, 'Human Health and Disease', 12);
    PERFORM _seed_chapter(v_zoo, 'Strategies for Enhancement in Food Production', 13);
    PERFORM _seed_chapter(v_zoo, 'Microbes in Human Welfare', 14);
    PERFORM _seed_chapter(v_zoo, 'Biotechnology and Its Applications', 15);
    PERFORM _seed_chapter(v_zoo, 'Organisms and Populations', 16);
    PERFORM _seed_chapter(v_zoo, 'Ecosystem', 17);
    PERFORM _seed_chapter(v_zoo, 'Biodiversity and Conservation', 18);
    PERFORM _seed_chapter(v_zoo, 'Environmental Issues', 19);
  END;

  -- ============ BITSAT ============
  v_physics := _seed_subject('bitsat', 'Physics', 0);
  v_chem := _seed_subject('bitsat', 'Chemistry', 1);
  v_maths := _seed_subject('bitsat', 'Mathematics', 2);
  v_eng := _seed_subject('bitsat', 'English', 3);
  v_lr := _seed_subject('bitsat', 'Logical Reasoning', 4);
  PERFORM _copy_chapters('jee-main', 'Physics', v_physics);
  PERFORM _copy_chapters('neet-ug', 'Chemistry', v_chem);
  PERFORM _copy_chapters('jee-main', 'Mathematics', v_maths);
  PERFORM _seed_chapter(v_eng, 'Reading Comprehension', 0);
  PERFORM _seed_chapter(v_eng, 'Grammar', 1);
  PERFORM _seed_chapter(v_eng, 'Vocabulary', 2);
  PERFORM _seed_chapter(v_lr, 'Series', 0);
  PERFORM _seed_chapter(v_lr, 'Analogy', 1);
  PERFORM _seed_chapter(v_lr, 'Classification', 2);
  PERFORM _seed_chapter(v_lr, 'Coding-Decoding', 3);
  PERFORM _seed_chapter(v_lr, 'Blood Relations', 4);
  PERFORM _seed_chapter(v_lr, 'Direction Sense', 5);

  -- ============ WBJEE, MHT CET, COMEDK, VITEEE, KIITEE (same as JEE Main P/C/M) ============
  FOREACH v_exam_id IN ARRAY ARRAY['wbjee','mht-cet','comedk','viteee','kiitee'] LOOP
    v_physics := _seed_subject(v_exam_id, 'Physics', 0);
    v_chem := _seed_subject(v_exam_id, 'Chemistry', 1);
    v_maths := _seed_subject(v_exam_id, 'Mathematics', 2);
    PERFORM _copy_chapters('jee-main', 'Physics', v_physics);
    PERFORM _copy_chapters('neet-ug', 'Chemistry', v_chem);
    PERFORM _copy_chapters('jee-main', 'Mathematics', v_maths);
  END LOOP;

  -- SRMJEEE (has English)
  v_physics := _seed_subject('srmjeee', 'Physics', 0);
  v_chem := _seed_subject('srmjeee', 'Chemistry', 1);
  v_maths := _seed_subject('srmjeee', 'Mathematics', 2);
  v_eng := _seed_subject('srmjeee', 'English', 3);
  PERFORM _copy_chapters('jee-main', 'Physics', v_physics);
  PERFORM _copy_chapters('neet-ug', 'Chemistry', v_chem);
  PERFORM _copy_chapters('jee-main', 'Mathematics', v_maths);
  PERFORM _seed_chapter(v_eng, 'Reading Comprehension', 0);
  PERFORM _seed_chapter(v_eng, 'Grammar', 1);

  -- ============ AIIMS (legacy) ============
  v_physics := _seed_subject('neet-ug-aiims', 'Physics', 0);
  v_chem := _seed_subject('neet-ug-aiims', 'Chemistry', 1);
  v_bio := _seed_subject('neet-ug-aiims', 'Biology', 2);
  v_gk := _seed_subject('neet-ug-aiims', 'General Knowledge', 3);
  PERFORM _copy_chapters('neet-ug', 'Physics', v_physics);
  PERFORM _copy_chapters('neet-ug', 'Chemistry', v_chem);
  PERFORM _copy_chapters('neet-ug', 'Botany', v_bio, 0);
  PERFORM _copy_chapters('neet-ug', 'Zoology', v_bio, 24);
  PERFORM _seed_chapter(v_gk, 'Current Affairs', 0);
  PERFORM _seed_chapter(v_gk, 'General Science', 1);
  PERFORM _seed_chapter(v_gk, 'Static GK', 2);
END $$;


-- ############################################################
-- ## 20260715140805_seed_syllabus_part2.sql
-- ############################################################
/*
# Seed syllabus â€” Part 2 (UPSC, CA, SSC, Banking, CAT, CLAT, NDA, CDS, GATE, CUET, Olympiads, Railway, State PSC, Other, CS, CMA)
*/

DO $$
DECLARE
  v_sub uuid; v_sub2 uuid; v_sub3 uuid; v_sub4 uuid; v_sub5 uuid;
BEGIN
  -- ============ UPSC CSE ============
  v_sub := _seed_subject('upsc-cse', 'History', 0);
  PERFORM _seed_chapter(v_sub, 'Ancient Indian History', 0);
  PERFORM _seed_chapter(v_sub, 'Medieval Indian History', 1);
  PERFORM _seed_chapter(v_sub, 'Modern Indian History', 2);
  PERFORM _seed_chapter(v_sub, 'Indian National Movement', 3);
  PERFORM _seed_chapter(v_sub, 'World History', 4);
  PERFORM _seed_chapter(v_sub, 'Post-Independence Consolidation', 5);
  PERFORM _seed_chapter(v_sub, 'Art and Architecture', 6);
  PERFORM _seed_chapter(v_sub, 'Literature and Culture', 7);

  v_sub := _seed_subject('upsc-cse', 'Geography', 0);
  PERFORM _seed_chapter(v_sub, 'Geomorphology', 0);
  PERFORM _seed_chapter(v_sub, 'Climatology', 1);
  PERFORM _seed_chapter(v_sub, 'Oceanography', 2);
  PERFORM _seed_chapter(v_sub, 'Biogeography', 3);
  PERFORM _seed_chapter(v_sub, 'Indian Geography â€” Physical', 4);
  PERFORM _seed_chapter(v_sub, 'Indian Geography â€” Economic', 5);
  PERFORM _seed_chapter(v_sub, 'World Geography', 6);
  PERFORM _seed_chapter(v_sub, 'Agriculture and Irrigation', 7);
  PERFORM _seed_chapter(v_sub, 'Minerals and Industries', 8);
  PERFORM _seed_chapter(v_sub, 'Transport and Communication', 9);

  v_sub := _seed_subject('upsc-cse', 'Polity', 0);
  PERFORM _seed_chapter(v_sub, 'Indian Constitution â€” Historical Underpinnings', 0);
  PERFORM _seed_chapter(v_sub, 'Union and State Executive', 1);
  PERFORM _seed_chapter(v_sub, 'Parliament and State Legislatures', 2);
  PERFORM _seed_chapter(v_sub, 'Judiciary', 3);
  PERFORM _seed_chapter(v_sub, 'Federalism and Local Government', 4);
  PERFORM _seed_chapter(v_sub, 'Constitutional Bodies', 5);
  PERFORM _seed_chapter(v_sub, 'Statutory and Non-Statutory Bodies', 6);
  PERFORM _seed_chapter(v_sub, 'Fundamental Rights and DPSP', 7);
  PERFORM _seed_chapter(v_sub, 'Electoral System and Political Parties', 8);
  PERFORM _seed_chapter(v_sub, 'Constitutional Amendments', 9);

  v_sub := _seed_subject('upsc-cse', 'Economics', 0);
  PERFORM _seed_chapter(v_sub, 'Basic Concepts of Economics', 0);
  PERFORM _seed_chapter(v_sub, 'National Income and Accounting', 1);
  PERFORM _seed_chapter(v_sub, 'Money and Banking', 2);
  PERFORM _seed_chapter(v_sub, 'Inflation', 3);
  PERFORM _seed_chapter(v_sub, 'Public Finance', 4);
  PERFORM _seed_chapter(v_sub, 'Fiscal Policy', 5);
  PERFORM _seed_chapter(v_sub, 'Monetary Policy', 6);
  PERFORM _seed_chapter(v_sub, 'Balance of Payments', 7);
  PERFORM _seed_chapter(v_sub, 'International Trade and Organisations', 8);
  PERFORM _seed_chapter(v_sub, 'Indian Economy â€” Planning and Reforms', 9);

  v_sub := _seed_subject('upsc-cse', 'Science & Technology', 0);
  PERFORM _seed_chapter(v_sub, 'Space Technology', 0);
  PERFORM _seed_chapter(v_sub, 'Defence Technology', 1);
  PERFORM _seed_chapter(v_sub, 'Information Technology', 2);
  PERFORM _seed_chapter(v_sub, 'Biotechnology', 3);
  PERFORM _seed_chapter(v_sub, 'Nanotechnology', 4);
  PERFORM _seed_chapter(v_sub, 'Energy and Power', 5);
  PERFORM _seed_chapter(v_sub, 'Health and Medicine', 6);
  PERFORM _seed_chapter(v_sub, 'Robotics and AI', 7);

  v_sub := _seed_subject('upsc-cse', 'Environment', 0);
  PERFORM _seed_chapter(v_sub, 'Ecology and Ecosystem', 0);
  PERFORM _seed_chapter(v_sub, 'Biodiversity', 1);
  PERFORM _seed_chapter(v_sub, 'Conservation Issues', 2);
  PERFORM _seed_chapter(v_sub, 'Environmental Pollution', 3);
  PERFORM _seed_chapter(v_sub, 'Climate Change', 4);
  PERFORM _seed_chapter(v_sub, 'Environmental Laws and Policies', 5);
  PERFORM _seed_chapter(v_sub, 'Disaster Management', 6);

  v_sub := _seed_subject('upsc-cse', 'Current Affairs', 0);
  PERFORM _seed_chapter(v_sub, 'National Affairs', 0);
  PERFORM _seed_chapter(v_sub, 'International Affairs', 1);
  PERFORM _seed_chapter(v_sub, 'Economic Survey and Budget', 2);
  PERFORM _seed_chapter(v_sub, 'Government Schemes and Programmes', 3);
  PERFORM _seed_chapter(v_sub, 'Awards and Honours', 4);
  PERFORM _seed_chapter(v_sub, 'Sports and Games', 5);
  PERFORM _seed_chapter(v_sub, 'Science and Tech Updates', 6);
  PERFORM _seed_chapter(v_sub, 'Persons and Places in News', 7);

  v_sub := _seed_subject('upsc-cse', 'Ethics', 0);
  PERFORM _seed_chapter(v_sub, 'Ethics and Human Interface', 0);
  PERFORM _seed_chapter(v_sub, 'Attitude', 1);
  PERFORM _seed_chapter(v_sub, 'Aptitude and Foundational Values', 2);
  PERFORM _seed_chapter(v_sub, 'Emotional Intelligence', 3);
  PERFORM _seed_chapter(v_sub, 'Contributions of Moral Thinkers', 4);
  PERFORM _seed_chapter(v_sub, 'Ethics in Public Administration', 5);
  PERFORM _seed_chapter(v_sub, 'Ethics in Private Relationships', 6);
  PERFORM _seed_chapter(v_sub, 'Case Studies on Ethics', 7);

  -- ============ CA Foundation ============
  v_sub := _seed_subject('ca-foundation', 'Accounting', 0);
  PERFORM _seed_chapter(v_sub, 'Theoretical Framework', 0);
  PERFORM _seed_chapter(v_sub, 'Accounting Process', 1);
  PERFORM _seed_chapter(v_sub, 'Bank Reconciliation Statement', 2);
  PERFORM _seed_chapter(v_sub, 'Depreciation Accounting', 3);
  PERFORM _seed_chapter(v_sub, 'Accounting for Special Transactions', 4);
  PERFORM _seed_chapter(v_sub, 'Preparation of Final Accounts', 5);
  PERFORM _seed_chapter(v_sub, 'Accounting for Partnership Firms', 6);
  PERFORM _seed_chapter(v_sub, 'Financial Statements of Not-for-Profit Organisations', 7);
  PERFORM _seed_chapter(v_sub, 'Introduction to Company Accounts', 8);

  v_sub := _seed_subject('ca-foundation', 'Business Laws', 0);
  PERFORM _seed_chapter(v_sub, 'Indian Regulatory Framework', 0);
  PERFORM _seed_chapter(v_sub, 'The Indian Contract Act, 1872', 1);
  PERFORM _seed_chapter(v_sub, 'The Sale of Goods Act, 1930', 2);
  PERFORM _seed_chapter(v_sub, 'The Indian Partnership Act, 1932', 3);
  PERFORM _seed_chapter(v_sub, 'The Limited Liability Partnership Act, 2008', 4);
  PERFORM _seed_chapter(v_sub, 'The Companies Act, 2013', 5);
  PERFORM _seed_chapter(v_sub, 'The Negotiable Instruments Act, 1881', 6);
  PERFORM _seed_chapter(v_sub, 'The General Clauses Act, 1897', 7);
  PERFORM _seed_chapter(v_sub, 'Interpretation of Statutes', 8);

  v_sub := _seed_subject('ca-foundation', 'Mathematics', 0);
  PERFORM _seed_chapter(v_sub, 'Ratio and Proportion', 0);
  PERFORM _seed_chapter(v_sub, 'Time Value of Money', 1);
  PERFORM _seed_chapter(v_sub, 'Sequence and Series', 2);
  PERFORM _seed_chapter(v_sub, 'Sets, Relations and Functions', 3);
  PERFORM _seed_chapter(v_sub, 'Limits and Continuity', 4);
  PERFORM _seed_chapter(v_sub, 'Differentiation and Integration', 5);
  PERFORM _seed_chapter(v_sub, 'Permutations and Combinations', 6);
  PERFORM _seed_chapter(v_sub, 'Statistical Description of Data', 7);
  PERFORM _seed_chapter(v_sub, 'Measures of Central Tendency and Dispersion', 8);
  PERFORM _seed_chapter(v_sub, 'Probability', 9);
  PERFORM _seed_chapter(v_sub, 'Theoretical Distributions', 10);

  v_sub := _seed_subject('ca-foundation', 'Business Economics', 0);
  PERFORM _seed_chapter(v_sub, 'Nature and Scope of Economics', 0);
  PERFORM _seed_chapter(v_sub, 'Demand and Supply', 1);
  PERFORM _seed_chapter(v_sub, 'Theory of Consumer Behaviour', 2);
  PERFORM _seed_chapter(v_sub, 'Theory of Production and Cost', 3);
  PERFORM _seed_chapter(v_sub, 'Market Structures', 4);
  PERFORM _seed_chapter(v_sub, 'National Income', 5);
  PERFORM _seed_chapter(v_sub, 'Theory of Income Determination', 6);
  PERFORM _seed_chapter(v_sub, 'Business Cycles', 7);
  PERFORM _seed_chapter(v_sub, 'Public Finance', 8);
  PERFORM _seed_chapter(v_sub, 'International Trade', 9);

  -- ============ CA Intermediate ============
  v_sub := _seed_subject('ca-intermediate', 'Advanced Accounting', 0);
  PERFORM _seed_chapter(v_sub, 'Framework for Preparation and Presentation of Financial Statements', 0);
  PERFORM _seed_chapter(v_sub, 'Accounting Standards', 1);
  PERFORM _seed_chapter(v_sub, 'Company Accounts', 2);
  PERFORM _seed_chapter(v_sub, 'Amalgamation of Companies', 3);
  PERFORM _seed_chapter(v_sub, 'Internal Reconstruction', 4);
  PERFORM _seed_chapter(v_sub, 'Consolidated Financial Statements', 5);
  PERFORM _seed_chapter(v_sub, 'Accounts of Banking Companies', 6);
  PERFORM _seed_chapter(v_sub, 'Accounts of Insurance Companies', 7);
  PERFORM _seed_chapter(v_sub, 'Branch Accounts', 8);
  PERFORM _seed_chapter(v_sub, 'Departmental Accounts', 9);
  PERFORM _seed_chapter(v_sub, 'Dissolution of Partnership Firms', 10);

  v_sub := _seed_subject('ca-intermediate', 'Corporate Laws', 0);
  PERFORM _seed_chapter(v_sub, 'Company Formation and Conversion', 0);
  PERFORM _seed_chapter(v_sub, 'Memorandum and Articles of Association', 1);
  PERFORM _seed_chapter(v_sub, 'Share Capital and Debentures', 2);
  PERFORM _seed_chapter(v_sub, 'Acceptance of Deposits', 3);
  PERFORM _seed_chapter(v_sub, 'Registration of Charges', 4);
  PERFORM _seed_chapter(v_sub, 'Management and Administration', 5);
  PERFORM _seed_chapter(v_sub, 'Declaration and Payment of Dividend', 6);
  PERFORM _seed_chapter(v_sub, 'Accounts and Audit', 7);
  PERFORM _seed_chapter(v_sub, 'Majority Rule and Minority Protection', 8);
  PERFORM _seed_chapter(v_sub, 'Oppression and Mismanagement', 9);
  PERFORM _seed_chapter(v_sub, 'Compromises, Arrangements and Amalgamations', 10);
  PERFORM _seed_chapter(v_sub, 'Winding Up', 11);

  v_sub := _seed_subject('ca-intermediate', 'Cost & Management Accounting', 0);
  PERFORM _seed_chapter(v_sub, 'Cost Accounting Standards', 0);
  PERFORM _seed_chapter(v_sub, 'Introduction to Cost Accounting', 1);
  PERFORM _seed_chapter(v_sub, 'Elements of Cost', 2);
  PERFORM _seed_chapter(v_sub, 'Cost Book-keeping', 3);
  PERFORM _seed_chapter(v_sub, 'Costing Methods', 4);
  PERFORM _seed_chapter(v_sub, 'Cost System', 5);
  PERFORM _seed_chapter(v_sub, 'Standard Costing', 6);
  PERFORM _seed_chapter(v_sub, 'Variance Analysis', 7);
  PERFORM _seed_chapter(v_sub, 'Budgetary Control', 8);
  PERFORM _seed_chapter(v_sub, 'Marginal Costing and CVP Analysis', 9);
  PERFORM _seed_chapter(v_sub, 'Introduction to Management Accounting', 10);
  PERFORM _seed_chapter(v_sub, 'Ratio Analysis', 11);
  PERFORM _seed_chapter(v_sub, 'Cash Flow Statement', 12);
  PERFORM _seed_chapter(v_sub, 'Cost Management', 13);

  v_sub := _seed_subject('ca-intermediate', 'Taxation', 0);
  PERFORM _seed_chapter(v_sub, 'Basic Concepts of Income Tax', 0);
  PERFORM _seed_chapter(v_sub, 'Residential Status and Incidence of Tax', 1);
  PERFORM _seed_chapter(v_sub, 'Income under the Head Salaries', 2);
  PERFORM _seed_chapter(v_sub, 'Income from House Property', 3);
  PERFORM _seed_chapter(v_sub, 'Profits and Gains of Business or Profession', 4);
  PERFORM _seed_chapter(v_sub, 'Capital Gains', 5);
  PERFORM _seed_chapter(v_sub, 'Income from Other Sources', 6);
  PERFORM _seed_chapter(v_sub, 'Income of Other Persons Included in Assessee Total Income', 7);
  PERFORM _seed_chapter(v_sub, 'Set Off and Carry Forward of Losses', 8);
  PERFORM _seed_chapter(v_sub, 'Deductions from Gross Total Income', 9);
  PERFORM _seed_chapter(v_sub, 'Computation of Total Income and Tax Payable', 10);
  PERFORM _seed_chapter(v_sub, 'Goods and Services Tax (GST) â€” Basics', 11);
  PERFORM _seed_chapter(v_sub, 'GST â€” Levy and Collection', 12);
  PERFORM _seed_chapter(v_sub, 'GST â€” Input Tax Credit', 13);
  PERFORM _seed_chapter(v_sub, 'GST â€” Returns and Payment', 14);

  -- ============ CA Final ============
  v_sub := _seed_subject('ca-final', 'Financial Reporting', 0);
  PERFORM _seed_chapter(v_sub, 'Framework for Preparation and Presentation of Financial Statements', 0);
  PERFORM _seed_chapter(v_sub, 'Accounting Standards', 1);
  PERFORM _seed_chapter(v_sub, 'Indian Accounting Standards (Ind AS)', 2);
  PERFORM _seed_chapter(v_sub, 'Consolidated Financial Statements', 3);
  PERFORM _seed_chapter(v_sub, 'Business Combinations and Amalgamations', 4);
  PERFORM _seed_chapter(v_sub, 'Corporate Restructuring', 5);
  PERFORM _seed_chapter(v_sub, 'Consolidated Financial Statements of Holding and Subsidiary', 6);
  PERFORM _seed_chapter(v_sub, 'Associates and Joint Ventures', 7);
  PERFORM _seed_chapter(v_sub, 'Foreign Currency Transactions and Translations', 8);
  PERFORM _seed_chapter(v_sub, 'Financial Reporting under Government and Not-for-Profit Entities', 9);
  PERFORM _seed_chapter(v_sub, 'Accounting for Financial Instruments', 10);
  PERFORM _seed_chapter(v_sub, 'Share-Based Payments', 11);

  v_sub := _seed_subject('ca-final', 'Strategic Financial Management', 0);
  PERFORM _seed_chapter(v_sub, 'Financial Management â€” An Introduction', 0);
  PERFORM _seed_chapter(v_sub, 'Financial Policy and Corporate Strategy', 1);
  PERFORM _seed_chapter(v_sub, 'Capital Budgeting', 2);
  PERFORM _seed_chapter(v_sub, 'Lease Financing', 3);
  PERFORM _seed_chapter(v_sub, 'Dividend Decisions', 4);
  PERFORM _seed_chapter(v_sub, 'Capital Structure Theories', 5);
  PERFORM _seed_chapter(v_sub, 'Cost of Capital', 6);
  PERFORM _seed_chapter(v_sub, 'Valuation of Bonds and Shares', 7);
  PERFORM _seed_chapter(v_sub, 'Working Capital Management', 8);
  PERFORM _seed_chapter(v_sub, 'Risk Management', 9);
  PERFORM _seed_chapter(v_sub, 'International Financial Management', 10);
  PERFORM _seed_chapter(v_sub, 'Portfolio Management', 11);
  PERFORM _seed_chapter(v_sub, 'Mutual Funds', 12);
  PERFORM _seed_chapter(v_sub, 'Securitisation', 13);

  v_sub := _seed_subject('ca-final', 'Advanced Auditing', 0);
  PERFORM _seed_chapter(v_sub, 'Auditing Concepts and Standards', 0);
  PERFORM _seed_chapter(v_sub, 'Audit Strategy, Planning and Execution', 1);
  PERFORM _seed_chapter(v_sub, 'Risk Assessment and Internal Control', 2);
  PERFORM _seed_chapter(v_sub, 'Audit of Financial Statements', 3);
  PERFORM _seed_chapter(v_sub, 'Audit of Consolidated Financial Statements', 4);
  PERFORM _seed_chapter(v_sub, 'Audit Reports', 5);
  PERFORM _seed_chapter(v_sub, 'Audit of Banks', 6);
  PERFORM _seed_chapter(v_sub, 'Audit of Insurance Companies', 7);
  PERFORM _seed_chapter(v_sub, 'Audit of Non-Banking Financial Companies', 8);
  PERFORM _seed_chapter(v_sub, 'Audit of Public Sector Undertakings', 9);
  PERFORM _seed_chapter(v_sub, 'Due Diligence', 10);
  PERFORM _seed_chapter(v_sub, 'Internal Audit', 11);
  PERFORM _seed_chapter(v_sub, 'Forensic Audit', 12);
  PERFORM _seed_chapter(v_sub, 'Quality Control and Peer Review', 13);

  v_sub := _seed_subject('ca-final', 'Direct Tax Laws', 0);
  PERFORM _seed_chapter(v_sub, 'Basic Concepts of Income Tax', 0);
  PERFORM _seed_chapter(v_sub, 'Residential Status and Scope of Total Income', 1);
  PERFORM _seed_chapter(v_sub, 'Income Computation under Various Heads', 2);
  PERFORM _seed_chapter(v_sub, 'Special Provisions for Computation of Income', 3);
  PERFORM _seed_chapter(v_sub, 'Income of Other Persons Included in Assessee Total Income', 4);
  PERFORM _seed_chapter(v_sub, 'Set Off and Carry Forward of Losses', 5);
  PERFORM _seed_chapter(v_sub, 'Deductions from Gross Total Income', 6);
  PERFORM _seed_chapter(v_sub, 'Computation of Total Income and Tax Liability', 7);
  PERFORM _seed_chapter(v_sub, 'Assessment of Companies', 8);
  PERFORM _seed_chapter(v_sub, 'Assessment of Trusts, Political Parties, etc.', 9);
  PERFORM _seed_chapter(v_sub, 'Minimum Alternate Tax (MAT)', 10);
  PERFORM _seed_chapter(v_sub, 'International Taxation', 11);
  PERFORM _seed_chapter(v_sub, 'Transfer Pricing', 12);
  PERFORM _seed_chapter(v_sub, 'Advance Rulings and Dispute Resolution', 13);
  PERFORM _seed_chapter(v_sub, 'Indirect Taxes â€” GST Overview', 14);

  -- ============ SSC CGL ============
  v_sub := _seed_subject('ssc-cgl', 'Quantitative Aptitude', 0);
  PERFORM _seed_chapter(v_sub, 'Number System', 0);
  PERFORM _seed_chapter(v_sub, 'Percentage', 1);
  PERFORM _seed_chapter(v_sub, 'Ratio and Proportion', 2);
  PERFORM _seed_chapter(v_sub, 'Average', 3);
  PERFORM _seed_chapter(v_sub, 'Profit, Loss and Discount', 4);
  PERFORM _seed_chapter(v_sub, 'Simple and Compound Interest', 5);
  PERFORM _seed_chapter(v_sub, 'Time and Work', 6);
  PERFORM _seed_chapter(v_sub, 'Time, Speed and Distance', 7);
  PERFORM _seed_chapter(v_sub, 'Algebra', 8);
  PERFORM _seed_chapter(v_sub, 'Geometry', 9);
  PERFORM _seed_chapter(v_sub, 'Mensuration', 10);
  PERFORM _seed_chapter(v_sub, 'Trigonometry', 11);
  PERFORM _seed_chapter(v_sub, 'Data Interpretation', 12);
  PERFORM _seed_chapter(v_sub, 'Statistics', 13);

  v_sub := _seed_subject('ssc-cgl', 'General Intelligence & Reasoning', 0);
  PERFORM _seed_chapter(v_sub, 'Analogy', 0);
  PERFORM _seed_chapter(v_sub, 'Classification', 1);
  PERFORM _seed_chapter(v_sub, 'Series', 2);
  PERFORM _seed_chapter(v_sub, 'Coding-Decoding', 3);
  PERFORM _seed_chapter(v_sub, 'Blood Relations', 4);
  PERFORM _seed_chapter(v_sub, 'Direction and Distance', 5);
  PERFORM _seed_chapter(v_sub, 'Ranking and Order', 6);
  PERFORM _seed_chapter(v_sub, 'Syllogism', 7);
  PERFORM _seed_chapter(v_sub, 'Venn Diagrams', 8);
  PERFORM _seed_chapter(v_sub, 'Paper Folding and Cutting', 9);
  PERFORM _seed_chapter(v_sub, 'Embedded Figures', 10);
  PERFORM _seed_chapter(v_sub, 'Cube and Dice', 11);
  PERFORM _seed_chapter(v_sub, 'Mirror and Water Images', 12);
  PERFORM _seed_chapter(v_sub, 'Non-Verbal Reasoning', 13);

  v_sub := _seed_subject('ssc-cgl', 'English Language', 0);
  PERFORM _seed_chapter(v_sub, 'Reading Comprehension', 0);
  PERFORM _seed_chapter(v_sub, 'Cloze Test', 1);
  PERFORM _seed_chapter(v_sub, 'Spotting Errors', 2);
  PERFORM _seed_chapter(v_sub, 'Sentence Improvement', 3);
  PERFORM _seed_chapter(v_sub, 'Fill in the Blanks', 4);
  PERFORM _seed_chapter(v_sub, 'Synonyms and Antonyms', 5);
  PERFORM _seed_chapter(v_sub, 'One-Word Substitution', 6);
  PERFORM _seed_chapter(v_sub, 'Idioms and Phrases', 7);
  PERFORM _seed_chapter(v_sub, 'Spelling', 8);
  PERFORM _seed_chapter(v_sub, 'Active and Passive Voice', 9);
  PERFORM _seed_chapter(v_sub, 'Direct and Indirect Speech', 10);
  PERFORM _seed_chapter(v_sub, 'Sentence Rearrangement', 11);

  v_sub := _seed_subject('ssc-cgl', 'General Awareness', 0);
  PERFORM _seed_chapter(v_sub, 'History of India', 0);
  PERFORM _seed_chapter(v_sub, 'Geography of India', 1);
  PERFORM _seed_chapter(v_sub, 'Indian Polity and Constitution', 2);
  PERFORM _seed_chapter(v_sub, 'Indian Economy', 3);
  PERFORM _seed_chapter(v_sub, 'General Science', 4);
  PERFORM _seed_chapter(v_sub, 'Environmental Science', 5);
  PERFORM _seed_chapter(v_sub, 'Current Affairs', 6);
  PERFORM _seed_chapter(v_sub, 'Awards and Honours', 7);
  PERFORM _seed_chapter(v_sub, 'Books and Authors', 8);
  PERFORM _seed_chapter(v_sub, 'Important Days', 9);
  PERFORM _seed_chapter(v_sub, 'Sports', 10);
  PERFORM _seed_chapter(v_sub, 'Scientific Research', 11);

  -- ============ SSC CHSL (subset of CGL) ============
  v_sub := _seed_subject('ssc-chsl', 'Quantitative Aptitude', 0);
  PERFORM _copy_chapters('ssc-cgl', 'Quantitative Aptitude', v_sub);
  v_sub := _seed_subject('ssc-chsl', 'General Intelligence & Reasoning', 0);
  PERFORM _seed_chapter(v_sub, 'Analogy', 0);
  PERFORM _seed_chapter(v_sub, 'Classification', 1);
  PERFORM _seed_chapter(v_sub, 'Series', 2);
  PERFORM _seed_chapter(v_sub, 'Coding-Decoding', 3);
  PERFORM _seed_chapter(v_sub, 'Blood Relations', 4);
  PERFORM _seed_chapter(v_sub, 'Direction and Distance', 5);
  PERFORM _seed_chapter(v_sub, 'Ranking and Order', 6);
  PERFORM _seed_chapter(v_sub, 'Syllogism', 7);
  PERFORM _seed_chapter(v_sub, 'Venn Diagrams', 8);
  PERFORM _seed_chapter(v_sub, 'Non-Verbal Reasoning', 9);
  v_sub := _seed_subject('ssc-chsl', 'English Language', 0);
  PERFORM _seed_chapter(v_sub, 'Reading Comprehension', 0);
  PERFORM _seed_chapter(v_sub, 'Spotting Errors', 1);
  PERFORM _seed_chapter(v_sub, 'Sentence Improvement', 2);
  PERFORM _seed_chapter(v_sub, 'Fill in the Blanks', 3);
  PERFORM _seed_chapter(v_sub, 'Synonyms and Antonyms', 4);
  PERFORM _seed_chapter(v_sub, 'One-Word Substitution', 5);
  PERFORM _seed_chapter(v_sub, 'Idioms and Phrases', 6);
  PERFORM _seed_chapter(v_sub, 'Spelling', 7);
  PERFORM _seed_chapter(v_sub, 'Active and Passive Voice', 8);
  PERFORM _seed_chapter(v_sub, 'Direct and Indirect Speech', 9);
  v_sub := _seed_subject('ssc-chsl', 'General Awareness', 0);
  PERFORM _seed_chapter(v_sub, 'History of India', 0);
  PERFORM _seed_chapter(v_sub, 'Geography of India', 1);
  PERFORM _seed_chapter(v_sub, 'Indian Polity and Constitution', 2);
  PERFORM _seed_chapter(v_sub, 'Indian Economy', 3);
  PERFORM _seed_chapter(v_sub, 'General Science', 4);
  PERFORM _seed_chapter(v_sub, 'Current Affairs', 5);
  PERFORM _seed_chapter(v_sub, 'Awards and Honours', 6);
  PERFORM _seed_chapter(v_sub, 'Sports', 7);

  -- ============ Banking Exams ============
  v_sub := _seed_subject('banking-exams', 'Quantitative Aptitude', 0);
  PERFORM _seed_chapter(v_sub, 'Number Series', 0);
  PERFORM _seed_chapter(v_sub, 'Simplification and Approximation', 1);
  PERFORM _seed_chapter(v_sub, 'Percentage', 2);
  PERFORM _seed_chapter(v_sub, 'Ratio and Proportion', 3);
  PERFORM _seed_chapter(v_sub, 'Average', 4);
  PERFORM _seed_chapter(v_sub, 'Profit, Loss and Discount', 5);
  PERFORM _seed_chapter(v_sub, 'Simple and Compound Interest', 6);
  PERFORM _seed_chapter(v_sub, 'Time and Work', 7);
  PERFORM _seed_chapter(v_sub, 'Time, Speed and Distance', 8);
  PERFORM _seed_chapter(v_sub, 'Quadratic Equations', 9);
  PERFORM _seed_chapter(v_sub, 'Data Interpretation', 10);
  PERFORM _seed_chapter(v_sub, 'Data Sufficiency', 11);
  PERFORM _seed_chapter(v_sub, 'Permutation and Combination', 12);
  PERFORM _seed_chapter(v_sub, 'Probability', 13);
  PERFORM _seed_chapter(v_sub, 'Mensuration', 14);

  v_sub := _seed_subject('banking-exams', 'Reasoning Ability', 0);
  PERFORM _seed_chapter(v_sub, 'Inequalities', 0);
  PERFORM _seed_chapter(v_sub, 'Syllogism', 1);
  PERFORM _seed_chapter(v_sub, 'Coding-Decoding', 2);
  PERFORM _seed_chapter(v_sub, 'Blood Relations', 3);
  PERFORM _seed_chapter(v_sub, 'Direction and Distance', 4);
  PERFORM _seed_chapter(v_sub, 'Seating Arrangement', 5);
  PERFORM _seed_chapter(v_sub, 'Puzzles', 6);
  PERFORM _seed_chapter(v_sub, 'Input-Output', 7);
  PERFORM _seed_chapter(v_sub, 'Series', 8);
  PERFORM _seed_chapter(v_sub, 'Analogy', 9);
  PERFORM _seed_chapter(v_sub, 'Classification', 10);
  PERFORM _seed_chapter(v_sub, 'Statement and Assumptions', 11);
  PERFORM _seed_chapter(v_sub, 'Statement and Conclusions', 12);
  PERFORM _seed_chapter(v_sub, 'Course of Action', 13);
  PERFORM _seed_chapter(v_sub, 'Non-Verbal Reasoning', 14);

  v_sub := _seed_subject('banking-exams', 'English Language', 0);
  PERFORM _seed_chapter(v_sub, 'Reading Comprehension', 0);
  PERFORM _seed_chapter(v_sub, 'Cloze Test', 1);
  PERFORM _seed_chapter(v_sub, 'Spotting Errors', 2);
  PERFORM _seed_chapter(v_sub, 'Sentence Improvement', 3);
  PERFORM _seed_chapter(v_sub, 'Fill in the Blanks', 4);
  PERFORM _seed_chapter(v_sub, 'Para Jumbles', 5);
  PERFORM _seed_chapter(v_sub, 'Synonyms and Antonyms', 6);
  PERFORM _seed_chapter(v_sub, 'Idioms and Phrases', 7);
  PERFORM _seed_chapter(v_sub, 'Spelling', 8);
  PERFORM _seed_chapter(v_sub, 'Active and Passive Voice', 9);
  PERFORM _seed_chapter(v_sub, 'Direct and Indirect Speech', 10);
  PERFORM _seed_chapter(v_sub, 'Vocabulary', 11);

  v_sub := _seed_subject('banking-exams', 'Banking Awareness', 0);
  PERFORM _seed_chapter(v_sub, 'History of Banking in India', 0);
  PERFORM _seed_chapter(v_sub, 'Structure of Indian Banking System', 1);
  PERFORM _seed_chapter(v_sub, 'Reserve Bank of India', 2);
  PERFORM _seed_chapter(v_sub, 'Monetary Policy', 3);
  PERFORM _seed_chapter(v_sub, 'Banking Products and Services', 4);
  PERFORM _seed_chapter(v_sub, 'Types of Accounts', 5);
  PERFORM _seed_chapter(v_sub, 'Cheques and Drafts', 6);
  PERFORM _seed_chapter(v_sub, 'Loans and Advances', 7);
  PERFORM _seed_chapter(v_sub, 'Non-Performing Assets', 8);
  PERFORM _seed_chapter(v_sub, 'Financial Inclusion', 9);
  PERFORM _seed_chapter(v_sub, 'Banking Reforms', 10);
  PERFORM _seed_chapter(v_sub, 'Digital Banking', 11);
  PERFORM _seed_chapter(v_sub, 'Payment Systems', 12);
  PERFORM _seed_chapter(v_sub, 'Insurance Sector', 13);
  PERFORM _seed_chapter(v_sub, 'Financial Markets', 14);

  v_sub := _seed_subject('banking-exams', 'Computer Awareness', 0);
  PERFORM _seed_chapter(v_sub, 'Computer Fundamentals', 0);
  PERFORM _seed_chapter(v_sub, 'Operating Systems', 1);
  PERFORM _seed_chapter(v_sub, 'MS Office', 2);
  PERFORM _seed_chapter(v_sub, 'Computer Networks', 3);
  PERFORM _seed_chapter(v_sub, 'Internet and Email', 4);
  PERFORM _seed_chapter(v_sub, 'Database Management Systems', 5);
  PERFORM _seed_chapter(v_sub, 'Computer Security and Viruses', 6);
  PERFORM _seed_chapter(v_sub, 'E-Banking', 7);
  PERFORM _seed_chapter(v_sub, 'Programming Basics', 8);
  PERFORM _seed_chapter(v_sub, 'Hardware and Software', 9);

  -- ============ CAT ============
  v_sub := _seed_subject('cat', 'Quantitative Aptitude', 0);
  PERFORM _seed_chapter(v_sub, 'Number Systems', 0);
  PERFORM _seed_chapter(v_sub, 'Percentage', 1);
  PERFORM _seed_chapter(v_sub, 'Profit, Loss and Discount', 2);
  PERFORM _seed_chapter(v_sub, 'Ratio and Proportion', 3);
  PERFORM _seed_chapter(v_sub, 'Averages', 4);
  PERFORM _seed_chapter(v_sub, 'Time and Work', 5);
  PERFORM _seed_chapter(v_sub, 'Time, Speed and Distance', 6);
  PERFORM _seed_chapter(v_sub, 'Simple and Compound Interest', 7);
  PERFORM _seed_chapter(v_sub, 'Algebra', 8);
  PERFORM _seed_chapter(v_sub, 'Geometry', 9);
  PERFORM _seed_chapter(v_sub, 'Mensuration', 10);
  PERFORM _seed_chapter(v_sub, 'Trigonometry', 11);
  PERFORM _seed_chapter(v_sub, 'Permutation and Combination', 12);
  PERFORM _seed_chapter(v_sub, 'Probability', 13);
  PERFORM _seed_chapter(v_sub, 'Set Theory', 14);
  PERFORM _seed_chapter(v_sub, 'Logarithms', 15);
  PERFORM _seed_chapter(v_sub, 'Progressions and Series', 16);

  v_sub := _seed_subject('cat', 'Logical Reasoning & Data Interpretation', 0);
  PERFORM _seed_chapter(v_sub, 'Tables', 0);
  PERFORM _seed_chapter(v_sub, 'Bar Graphs', 1);
  PERFORM _seed_chapter(v_sub, 'Line Charts', 2);
  PERFORM _seed_chapter(v_sub, 'Pie Charts', 3);
  PERFORM _seed_chapter(v_sub, 'Caselets', 4);
  PERFORM _seed_chapter(v_sub, 'Logical Puzzles', 5);
  PERFORM _seed_chapter(v_sub, 'Seating Arrangement', 6);
  PERFORM _seed_chapter(v_sub, 'Blood Relations', 7);
  PERFORM _seed_chapter(v_sub, 'Syllogisms', 8);
  PERFORM _seed_chapter(v_sub, 'Venn Diagrams', 9);
  PERFORM _seed_chapter(v_sub, 'Games and Tournaments', 10);
  PERFORM _seed_chapter(v_sub, 'Selections and Distributions', 11);
  PERFORM _seed_chapter(v_sub, 'Routes and Networks', 12);
  PERFORM _seed_chapter(v_sub, 'Cubes and Dice', 13);
  PERFORM _seed_chapter(v_sub, 'Binary Logic', 14);

  v_sub := _seed_subject('cat', 'Verbal Ability & Reading Comprehension', 0);
  PERFORM _seed_chapter(v_sub, 'Reading Comprehension', 0);
  PERFORM _seed_chapter(v_sub, 'Para Jumbles', 1);
  PERFORM _seed_chapter(v_sub, 'Para Summary', 2);
  PERFORM _seed_chapter(v_sub, 'Sentence Completion', 3);
  PERFORM _seed_chapter(v_sub, 'Vocabulary', 4);
  PERFORM _seed_chapter(v_sub, 'Grammar', 5);
  PERFORM _seed_chapter(v_sub, 'Critical Reasoning', 6);
  PERFORM _seed_chapter(v_sub, 'Inferences and Assumptions', 7);
  PERFORM _seed_chapter(v_sub, 'Fact, Inference and Judgement', 8);
  PERFORM _seed_chapter(v_sub, 'Odd Sentence Out', 9);

  -- ============ CLAT ============
  v_sub := _seed_subject('clat', 'Legal Reasoning', 0);
  PERFORM _seed_chapter(v_sub, 'Constitutional Law', 0);
  PERFORM _seed_chapter(v_sub, 'Jurisprudence', 1);
  PERFORM _seed_chapter(v_sub, 'Law of Torts', 2);
  PERFORM _seed_chapter(v_sub, 'Criminal Law', 3);
  PERFORM _seed_chapter(v_sub, 'Contract Law', 4);
  PERFORM _seed_chapter(v_sub, 'Family Law', 5);
  PERFORM _seed_chapter(v_sub, 'Public International Law', 6);
  PERFORM _seed_chapter(v_sub, 'Property Law', 7);
  PERFORM _seed_chapter(v_sub, 'Intellectual Property Law', 8);
  PERFORM _seed_chapter(v_sub, 'Legal Maxims', 9);
  PERFORM _seed_chapter(v_sub, 'Legal Current Affairs', 10);

  v_sub := _seed_subject('clat', 'English Language', 0);
  PERFORM _seed_chapter(v_sub, 'Reading Comprehension', 0);
  PERFORM _seed_chapter(v_sub, 'Vocabulary', 1);
  PERFORM _seed_chapter(v_sub, 'Grammar', 2);
  PERFORM _seed_chapter(v_sub, 'Sentence Correction', 3);
  PERFORM _seed_chapter(v_sub, 'Fill in the Blanks', 4);
  PERFORM _seed_chapter(v_sub, 'Synonyms and Antonyms', 5);
  PERFORM _seed_chapter(v_sub, 'Idioms and Phrases', 6);
  PERFORM _seed_chapter(v_sub, 'Spelling', 7);
  PERFORM _seed_chapter(v_sub, 'Inference and Conclusion', 8);

  v_sub := _seed_subject('clat', 'Current Affairs & General Knowledge', 0);
  PERFORM _seed_chapter(v_sub, 'Indian History', 0);
  PERFORM _seed_chapter(v_sub, 'World History', 1);
  PERFORM _seed_chapter(v_sub, 'Indian Polity and Governance', 2);
  PERFORM _seed_chapter(v_sub, 'Indian Economy', 3);
  PERFORM _seed_chapter(v_sub, 'Geography', 4);
  PERFORM _seed_chapter(v_sub, 'General Science', 5);
  PERFORM _seed_chapter(v_sub, 'Static General Knowledge', 6);
  PERFORM _seed_chapter(v_sub, 'Current Affairs â€” National', 7);
  PERFORM _seed_chapter(v_sub, 'Current Affairs â€” International', 8);
  PERFORM _seed_chapter(v_sub, 'Awards and Honours', 9);
  PERFORM _seed_chapter(v_sub, 'Sports', 10);

  v_sub := _seed_subject('clat', 'Quantitative Techniques', 0);
  PERFORM _seed_chapter(v_sub, 'Percentage', 0);
  PERFORM _seed_chapter(v_sub, 'Ratio and Proportion', 1);
  PERFORM _seed_chapter(v_sub, 'Average', 2);
  PERFORM _seed_chapter(v_sub, 'Profit, Loss and Discount', 3);
  PERFORM _seed_chapter(v_sub, 'Time and Work', 4);
  PERFORM _seed_chapter(v_sub, 'Time, Speed and Distance', 5);
  PERFORM _seed_chapter(v_sub, 'Simple and Compound Interest', 6);
  PERFORM _seed_chapter(v_sub, 'Data Interpretation', 7);
  PERFORM _seed_chapter(v_sub, 'Mensuration', 8);
  PERFORM _seed_chapter(v_sub, 'Algebra', 9);

  v_sub := _seed_subject('clat', 'Logical Reasoning', 0);
  PERFORM _seed_chapter(v_sub, 'Analytical Reasoning', 0);
  PERFORM _seed_chapter(v_sub, 'Logical Reasoning', 1);
  PERFORM _seed_chapter(v_sub, 'Series', 2);
  PERFORM _seed_chapter(v_sub, 'Analogy', 3);
  PERFORM _seed_chapter(v_sub, 'Classification', 4);
  PERFORM _seed_chapter(v_sub, 'Coding-Decoding', 5);
  PERFORM _seed_chapter(v_sub, 'Blood Relations', 6);
  PERFORM _seed_chapter(v_sub, 'Direction and Distance', 7);
  PERFORM _seed_chapter(v_sub, 'Syllogism', 8);
  PERFORM _seed_chapter(v_sub, 'Critical Reasoning', 9);

  -- ============ NDA ============
  v_sub := _seed_subject('nda', 'Mathematics', 0);
  PERFORM _seed_chapter(v_sub, 'Algebra', 0);
  PERFORM _seed_chapter(v_sub, 'Matrices and Determinants', 1);
  PERFORM _seed_chapter(v_sub, 'Trigonometry', 2);
  PERFORM _seed_chapter(v_sub, 'Analytical Geometry â€” 2D', 3);
  PERFORM _seed_chapter(v_sub, 'Analytical Geometry â€” 3D', 4);
  PERFORM _seed_chapter(v_sub, 'Differential Calculus', 5);
  PERFORM _seed_chapter(v_sub, 'Integral Calculus and Differential Equations', 6);
  PERFORM _seed_chapter(v_sub, 'Vector Algebra', 7);
  PERFORM _seed_chapter(v_sub, 'Statistics and Probability', 8);

  v_sub := _seed_subject('nda', 'Physics', 0);
  PERFORM _seed_chapter(v_sub, 'Physical Properties and Measurements', 0);
  PERFORM _seed_chapter(v_sub, 'Motion, Forces and Energy', 1);
  PERFORM _seed_chapter(v_sub, 'Work, Power and Energy', 2);
  PERFORM _seed_chapter(v_sub, 'Gravitation', 3);
  PERFORM _seed_chapter(v_sub, 'Properties of Matter', 4);
  PERFORM _seed_chapter(v_sub, 'Heat', 5);
  PERFORM _seed_chapter(v_sub, 'Sound and Wave Motion', 6);
  PERFORM _seed_chapter(v_sub, 'Light', 7);
  PERFORM _seed_chapter(v_sub, 'Magnetism and Electricity', 8);
  PERFORM _seed_chapter(v_sub, 'Modern Physics', 9);

  v_sub := _seed_subject('nda', 'Chemistry', 0);
  PERFORM _seed_chapter(v_sub, 'Atomic Structure', 0);
  PERFORM _seed_chapter(v_sub, 'Chemical Bonding', 1);
  PERFORM _seed_chapter(v_sub, 'States of Matter', 2);
  PERFORM _seed_chapter(v_sub, 'Periodic Table', 3);
  PERFORM _seed_chapter(v_sub, 'Acids, Bases and Salts', 4);
  PERFORM _seed_chapter(v_sub, 'Carbon and Its Compounds', 5);
  PERFORM _seed_chapter(v_sub, 'Metals and Non-Metals', 6);
  PERFORM _seed_chapter(v_sub, 'Oxidation and Reduction', 7);
  PERFORM _seed_chapter(v_sub, 'Organic Chemistry Basics', 8);

  v_sub := _seed_subject('nda', 'General Studies', 0);
  PERFORM _seed_chapter(v_sub, 'History of India', 0);
  PERFORM _seed_chapter(v_sub, 'Geography of India', 1);
  PERFORM _seed_chapter(v_sub, 'Indian Polity', 2);
  PERFORM _seed_chapter(v_sub, 'Indian Economy', 3);
  PERFORM _seed_chapter(v_sub, 'General Science', 4);
  PERFORM _seed_chapter(v_sub, 'Current Affairs', 5);
  PERFORM _seed_chapter(v_sub, 'World Affairs', 6);
  PERFORM _seed_chapter(v_sub, 'Environmental Science', 7);

  v_sub := _seed_subject('nda', 'English', 0);
  PERFORM _seed_chapter(v_sub, 'Grammar and Usage', 0);
  PERFORM _seed_chapter(v_sub, 'Vocabulary', 1);
  PERFORM _seed_chapter(v_sub, 'Comprehension', 2);
  PERFORM _seed_chapter(v_sub, 'Synonyms and Antonyms', 3);
  PERFORM _seed_chapter(v_sub, 'Sentence Improvement', 4);
  PERFORM _seed_chapter(v_sub, 'Spotting Errors', 5);
  PERFORM _seed_chapter(v_sub, 'Idioms and Phrases', 6);

  -- ============ CDS ============
  v_sub := _seed_subject('cds', 'English', 0);
  PERFORM _seed_chapter(v_sub, 'Reading Comprehension', 0);
  PERFORM _seed_chapter(v_sub, 'Grammar and Usage', 1);
  PERFORM _seed_chapter(v_sub, 'Vocabulary', 2);
  PERFORM _seed_chapter(v_sub, 'Synonyms and Antonyms', 3);
  PERFORM _seed_chapter(v_sub, 'Sentence Improvement', 4);
  PERFORM _seed_chapter(v_sub, 'Spotting Errors', 5);
  PERFORM _seed_chapter(v_sub, 'Fill in the Blanks', 6);
  PERFORM _seed_chapter(v_sub, 'Idioms and Phrases', 7);
  v_sub := _seed_subject('cds', 'General Knowledge', 0);
  PERFORM _seed_chapter(v_sub, 'History of India', 0);
  PERFORM _seed_chapter(v_sub, 'Geography of India', 1);
  PERFORM _seed_chapter(v_sub, 'Indian Polity', 2);
  PERFORM _seed_chapter(v_sub, 'Indian Economy', 3);
  PERFORM _seed_chapter(v_sub, 'General Science', 4);
  PERFORM _seed_chapter(v_sub, 'Current Affairs', 5);
  PERFORM _seed_chapter(v_sub, 'Defence and Military Affairs', 6);
  PERFORM _seed_chapter(v_sub, 'Environmental Science', 7);
  v_sub := _seed_subject('cds', 'Mathematics', 0);
  PERFORM _seed_chapter(v_sub, 'Arithmetic', 0);
  PERFORM _seed_chapter(v_sub, 'Algebra', 1);
  PERFORM _seed_chapter(v_sub, 'Trigonometry', 2);
  PERFORM _seed_chapter(v_sub, 'Geometry', 3);
  PERFORM _seed_chapter(v_sub, 'Mensuration', 4);
  PERFORM _seed_chapter(v_sub, 'Statistics', 5);

  -- ============ GATE ============
  v_sub := _seed_subject('gate', 'Engineering Mathematics', 0);
  PERFORM _seed_chapter(v_sub, 'Linear Algebra', 0);
  PERFORM _seed_chapter(v_sub, 'Calculus', 1);
  PERFORM _seed_chapter(v_sub, 'Differential Equations', 2);
  PERFORM _seed_chapter(v_sub, 'Complex Variables', 3);
  PERFORM _seed_chapter(v_sub, 'Probability and Statistics', 4);
  PERFORM _seed_chapter(v_sub, 'Numerical Methods', 5);
  PERFORM _seed_chapter(v_sub, 'Transform Theory', 6);
  v_sub := _seed_subject('gate', 'General Aptitude', 0);
  PERFORM _seed_chapter(v_sub, 'Verbal Aptitude', 0);
  PERFORM _seed_chapter(v_sub, 'Quantitative Aptitude', 1);
  PERFORM _seed_chapter(v_sub, 'Analytical Aptitude', 2);
  PERFORM _seed_chapter(v_sub, 'Spatial Aptitude', 3);
  v_sub := _seed_subject('gate', 'Core Technical', 0);
  PERFORM _seed_chapter(v_sub, 'Engineering Mathematics', 0);
  PERFORM _seed_chapter(v_sub, 'Core Discipline â€” Part I', 1);
  PERFORM _seed_chapter(v_sub, 'Core Discipline â€” Part II', 2);
  PERFORM _seed_chapter(v_sub, 'Core Discipline â€” Part III', 3);
  PERFORM _seed_chapter(v_sub, 'Core Discipline â€” Part IV', 4);
  PERFORM _seed_chapter(v_sub, 'Engineering Practices', 5);

  -- ============ CUET UG ============
  v_sub := _seed_subject('cuet-ug', 'Mathematics', 0);
  PERFORM _seed_chapter(v_sub, 'Algebra', 0);
  PERFORM _seed_chapter(v_sub, 'Calculus', 1);
  PERFORM _seed_chapter(v_sub, 'Vectors and 3D Geometry', 2);
  PERFORM _seed_chapter(v_sub, 'Probability', 3);
  PERFORM _seed_chapter(v_sub, 'Linear Programming', 4);
  PERFORM _seed_chapter(v_sub, 'Statistics', 5);
  v_sub := _seed_subject('cuet-ug', 'Physics', 0);
  PERFORM _seed_chapter(v_sub, 'Electrostatics', 0);
  PERFORM _seed_chapter(v_sub, 'Current Electricity', 1);
  PERFORM _seed_chapter(v_sub, 'Magnetic Effects of Current', 2);
  PERFORM _seed_chapter(v_sub, 'Electromagnetic Induction', 3);
  PERFORM _seed_chapter(v_sub, 'Optics', 4);
  PERFORM _seed_chapter(v_sub, 'Modern Physics', 5);
  v_sub := _seed_subject('cuet-ug', 'Chemistry', 0);
  PERFORM _seed_chapter(v_sub, 'Atomic Structure', 0);
  PERFORM _seed_chapter(v_sub, 'Chemical Bonding', 1);
  PERFORM _seed_chapter(v_sub, 'States of Matter', 2);
  PERFORM _seed_chapter(v_sub, 'Thermodynamics', 3);
  PERFORM _seed_chapter(v_sub, 'Equilibrium', 4);
  PERFORM _seed_chapter(v_sub, 'Organic Chemistry Basics', 5);
  PERFORM _seed_chapter(v_sub, 'Coordination Compounds', 6);
  v_sub := _seed_subject('cuet-ug', 'Biology', 0);
  PERFORM _seed_chapter(v_sub, 'Cell Biology', 0);
  PERFORM _seed_chapter(v_sub, 'Genetics and Evolution', 1);
  PERFORM _seed_chapter(v_sub, 'Human Physiology', 2);
  PERFORM _seed_chapter(v_sub, 'Plant Physiology', 3);
  PERFORM _seed_chapter(v_sub, 'Ecology and Environment', 4);
  PERFORM _seed_chapter(v_sub, 'Biotechnology', 5);
  v_sub := _seed_subject('cuet-ug', 'English', 0);
  PERFORM _seed_chapter(v_sub, 'Reading Comprehension', 0);
  PERFORM _seed_chapter(v_sub, 'Grammar', 1);
  PERFORM _seed_chapter(v_sub, 'Vocabulary', 2);
  PERFORM _seed_chapter(v_sub, 'Verbal Ability', 3);
  PERFORM _seed_chapter(v_sub, 'Literary Aptitude', 4);
  v_sub := _seed_subject('cuet-ug', 'General Awareness', 0);
  PERFORM _seed_chapter(v_sub, 'Current Affairs', 0);
  PERFORM _seed_chapter(v_sub, 'General Knowledge', 1);
  PERFORM _seed_chapter(v_sub, 'Indian Polity', 2);
  PERFORM _seed_chapter(v_sub, 'Indian Economy', 3);
  PERFORM _seed_chapter(v_sub, 'Geography', 4);
  PERFORM _seed_chapter(v_sub, 'History', 5);
  PERFORM _seed_chapter(v_sub, 'General Science', 6);

  -- ============ CUET PG ============
  v_sub := _seed_subject('cuet-pg', 'Domain Knowledge', 0);
  PERFORM _seed_chapter(v_sub, 'Domain Core â€” Part I', 0);
  PERFORM _seed_chapter(v_sub, 'Domain Core â€” Part II', 1);
  PERFORM _seed_chapter(v_sub, 'Domain Core â€” Part III', 2);
  PERFORM _seed_chapter(v_sub, 'Domain Electives', 3);
  PERFORM _seed_chapter(v_sub, 'Domain Applications', 4);
  v_sub := _seed_subject('cuet-pg', 'General Aptitude', 0);
  PERFORM _seed_chapter(v_sub, 'Verbal Ability', 0);
  PERFORM _seed_chapter(v_sub, 'Quantitative Reasoning', 1);
  PERFORM _seed_chapter(v_sub, 'Logical Reasoning', 2);
  PERFORM _seed_chapter(v_sub, 'Data Interpretation', 3);
  PERFORM _seed_chapter(v_sub, 'General Knowledge', 4);

  -- ============ Olympiads ============
  v_sub := _seed_subject('olympiads', 'Mathematics', 0);
  PERFORM _seed_chapter(v_sub, 'Algebra', 0);
  PERFORM _seed_chapter(v_sub, 'Geometry', 1);
  PERFORM _seed_chapter(v_sub, 'Number Theory', 2);
  PERFORM _seed_chapter(v_sub, 'Combinatorics', 3);
  PERFORM _seed_chapter(v_sub, 'Trigonometry', 4);
  PERFORM _seed_chapter(v_sub, 'Calculus', 5);
  PERFORM _seed_chapter(v_sub, 'Probability', 6);
  v_sub := _seed_subject('olympiads', 'Physics', 0);
  PERFORM _seed_chapter(v_sub, 'Mechanics', 0);
  PERFORM _seed_chapter(v_sub, 'Thermodynamics', 1);
  PERFORM _seed_chapter(v_sub, 'Electromagnetism', 2);
  PERFORM _seed_chapter(v_sub, 'Optics', 3);
  PERFORM _seed_chapter(v_sub, 'Modern Physics', 4);
  PERFORM _seed_chapter(v_sub, 'Waves and Oscillations', 5);
  v_sub := _seed_subject('olympiads', 'Chemistry', 0);
  PERFORM _seed_chapter(v_sub, 'Physical Chemistry', 0);
  PERFORM _seed_chapter(v_sub, 'Inorganic Chemistry', 1);
  PERFORM _seed_chapter(v_sub, 'Organic Chemistry', 2);
  PERFORM _seed_chapter(v_sub, 'Analytical Chemistry', 3);
  v_sub := _seed_subject('olympiads', 'Biology', 0);
  PERFORM _seed_chapter(v_sub, 'Cell Biology', 0);
  PERFORM _seed_chapter(v_sub, 'Genetics', 1);
  PERFORM _seed_chapter(v_sub, 'Physiology', 2);
  PERFORM _seed_chapter(v_sub, 'Ecology', 3);
  PERFORM _seed_chapter(v_sub, 'Evolution', 4);
  PERFORM _seed_chapter(v_sub, 'Plant and Animal Anatomy', 5);

  -- ============ Railway Exams ============
  v_sub := _seed_subject('railway-exams', 'Mathematics', 0);
  PERFORM _seed_chapter(v_sub, 'Number System', 0);
  PERFORM _seed_chapter(v_sub, 'Percentage', 1);
  PERFORM _seed_chapter(v_sub, 'Ratio and Proportion', 2);
  PERFORM _seed_chapter(v_sub, 'Average', 3);
  PERFORM _seed_chapter(v_sub, 'Profit, Loss and Discount', 4);
  PERFORM _seed_chapter(v_sub, 'Simple and Compound Interest', 5);
  PERFORM _seed_chapter(v_sub, 'Time and Work', 6);
  PERFORM _seed_chapter(v_sub, 'Time, Speed and Distance', 7);
  PERFORM _seed_chapter(v_sub, 'Algebra', 8);
  PERFORM _seed_chapter(v_sub, 'Geometry', 9);
  PERFORM _seed_chapter(v_sub, 'Mensuration', 10);
  PERFORM _seed_chapter(v_sub, 'Trigonometry', 11);
  PERFORM _seed_chapter(v_sub, 'Data Interpretation', 12);
  v_sub := _seed_subject('railway-exams', 'Reasoning', 0);
  PERFORM _seed_chapter(v_sub, 'Analogy', 0);
  PERFORM _seed_chapter(v_sub, 'Classification', 1);
  PERFORM _seed_chapter(v_sub, 'Series', 2);
  PERFORM _seed_chapter(v_sub, 'Coding-Decoding', 3);
  PERFORM _seed_chapter(v_sub, 'Blood Relations', 4);
  PERFORM _seed_chapter(v_sub, 'Direction and Distance', 5);
  PERFORM _seed_chapter(v_sub, 'Syllogism', 6);
  PERFORM _seed_chapter(v_sub, 'Venn Diagrams', 7);
  PERFORM _seed_chapter(v_sub, 'Non-Verbal Reasoning', 8);
  v_sub := _seed_subject('railway-exams', 'General Science', 0);
  PERFORM _seed_chapter(v_sub, 'Physics', 0);
  PERFORM _seed_chapter(v_sub, 'Chemistry', 1);
  PERFORM _seed_chapter(v_sub, 'Biology', 2);
  PERFORM _seed_chapter(v_sub, 'Environmental Science', 3);
  v_sub := _seed_subject('railway-exams', 'General Awareness', 0);
  PERFORM _seed_chapter(v_sub, 'History of India', 0);
  PERFORM _seed_chapter(v_sub, 'Geography of India', 1);
  PERFORM _seed_chapter(v_sub, 'Indian Polity', 2);
  PERFORM _seed_chapter(v_sub, 'Indian Economy', 3);
  PERFORM _seed_chapter(v_sub, 'Current Affairs', 4);
  PERFORM _seed_chapter(v_sub, 'Railway Budget and Policies', 5);
  PERFORM _seed_chapter(v_sub, 'Sports and Culture', 6);
  PERFORM _seed_chapter(v_sub, 'Books and Authors', 7);

  -- ============ State PSC ============
  v_sub := _seed_subject('state-psc', 'History', 0);
  PERFORM _seed_chapter(v_sub, 'Ancient Indian History', 0);
  PERFORM _seed_chapter(v_sub, 'Medieval Indian History', 1);
  PERFORM _seed_chapter(v_sub, 'Modern Indian History', 2);
  PERFORM _seed_chapter(v_sub, 'State History', 3);
  PERFORM _seed_chapter(v_sub, 'Indian National Movement', 4);
  v_sub := _seed_subject('state-psc', 'Geography', 0);
  PERFORM _seed_chapter(v_sub, 'Physical Geography', 0);
  PERFORM _seed_chapter(v_sub, 'Indian Geography', 1);
  PERFORM _seed_chapter(v_sub, 'State Geography', 2);
  PERFORM _seed_chapter(v_sub, 'World Geography', 3);
  PERFORM _seed_chapter(v_sub, 'Economic Geography', 4);
  v_sub := _seed_subject('state-psc', 'Polity', 0);
  PERFORM _seed_chapter(v_sub, 'Indian Constitution', 0);
  PERFORM _seed_chapter(v_sub, 'Union and State Government', 1);
  PERFORM _seed_chapter(v_sub, 'Local Self Government', 2);
  PERFORM _seed_chapter(v_sub, 'Constitutional Bodies', 3);
  PERFORM _seed_chapter(v_sub, 'State Legislature and Administration', 4);
  v_sub := _seed_subject('state-psc', 'Economics', 0);
  PERFORM _seed_chapter(v_sub, 'Basic Economics', 0);
  PERFORM _seed_chapter(v_sub, 'Indian Economy', 1);
  PERFORM _seed_chapter(v_sub, 'State Economy', 2);
  PERFORM _seed_chapter(v_sub, 'Public Finance', 3);
  PERFORM _seed_chapter(v_sub, 'Banking and Monetary Policy', 4);
  v_sub := _seed_subject('state-psc', 'Science', 0);
  PERFORM _seed_chapter(v_sub, 'Physics', 0);
  PERFORM _seed_chapter(v_sub, 'Chemistry', 1);
  PERFORM _seed_chapter(v_sub, 'Biology', 2);
  PERFORM _seed_chapter(v_sub, 'Science and Technology', 3);
  v_sub := _seed_subject('state-psc', 'Current Affairs', 0);
  PERFORM _seed_chapter(v_sub, 'National Affairs', 0);
  PERFORM _seed_chapter(v_sub, 'State Affairs', 1);
  PERFORM _seed_chapter(v_sub, 'International Affairs', 2);
  PERFORM _seed_chapter(v_sub, 'Government Schemes', 3);
  PERFORM _seed_chapter(v_sub, 'Sports and Awards', 4);

  -- ============ CS ============
  v_sub := _seed_subject('cs', 'Computer Science', 0);
  PERFORM _seed_chapter(v_sub, 'C Programming', 0);
  PERFORM _seed_chapter(v_sub, 'Data Structures', 1);
  PERFORM _seed_chapter(v_sub, 'Algorithms', 2);
  PERFORM _seed_chapter(v_sub, 'DBMS', 3);
  PERFORM _seed_chapter(v_sub, 'Operating Systems', 4);
  PERFORM _seed_chapter(v_sub, 'Computer Networks', 5);
  PERFORM _seed_chapter(v_sub, 'Theory of Computation', 6);
  PERFORM _seed_chapter(v_sub, 'Digital Logic', 7);
  v_sub := _seed_subject('cs', 'Engineering Mathematics', 0);
  PERFORM _copy_chapters('jee-main', 'Mathematics', v_sub);
  v_sub := _seed_subject('cs', 'General Aptitude', 0);
  PERFORM _seed_chapter(v_sub, 'Verbal Reasoning', 0);
  PERFORM _seed_chapter(v_sub, 'Numerical Ability', 1);
  PERFORM _seed_chapter(v_sub, 'Analytical Reasoning', 2);
  PERFORM _seed_chapter(v_sub, 'Spatial Reasoning', 3);

  -- ============ CMA ============
  v_sub := _seed_subject('cma', 'Cost Accounting', 0);
  PERFORM _copy_chapters('ca-foundation', 'Accounting', v_sub);
  v_sub := _seed_subject('cma', 'Financial Management', 0);
  PERFORM _seed_chapter(v_sub, 'Capital Budgeting', 0);
  PERFORM _seed_chapter(v_sub, 'Cost of Capital', 1);
  PERFORM _seed_chapter(v_sub, 'Working Capital Management', 2);
  PERFORM _seed_chapter(v_sub, 'Capital Structure', 3);
  PERFORM _seed_chapter(v_sub, 'Dividend Decisions', 4);
  v_sub := _seed_subject('cma', 'Strategic Management', 0);
  PERFORM _seed_chapter(v_sub, 'Strategic Analysis', 0);
  PERFORM _seed_chapter(v_sub, 'Strategic Planning', 1);
  PERFORM _seed_chapter(v_sub, 'Strategic Implementation', 2);
  PERFORM _seed_chapter(v_sub, 'Strategic Control', 3);
  v_sub := _seed_subject('cma', 'Taxation', 0);
  PERFORM _seed_chapter(v_sub, 'Direct Tax', 0);
  PERFORM _seed_chapter(v_sub, 'Indirect Tax', 1);
  PERFORM _seed_chapter(v_sub, 'GST', 2);

  -- ============ Other ============
  v_sub := _seed_subject('other', 'General Studies', 0);
  PERFORM _seed_chapter(v_sub, 'Indian History', 0);
  PERFORM _seed_chapter(v_sub, 'Geography', 1);
  PERFORM _seed_chapter(v_sub, 'Indian Polity', 2);
  PERFORM _seed_chapter(v_sub, 'Indian Economy', 3);
  PERFORM _seed_chapter(v_sub, 'General Science', 4);
  PERFORM _seed_chapter(v_sub, 'Current Affairs', 5);
  PERFORM _seed_chapter(v_sub, 'Environmental Studies', 6);
  PERFORM _seed_chapter(v_sub, 'Quantitative Aptitude', 7);
  PERFORM _seed_chapter(v_sub, 'Logical Reasoning', 8);
  PERFORM _seed_chapter(v_sub, 'English Language', 9);
END $$;


-- ############################################################
-- ## 20260715140835_create_seed_user_chapters_function.sql
-- ############################################################
/*
# Create auto-population function for user_chapters

## Purpose
When a user completes onboarding (or signs up), automatically create
user_chapters progress records for every chapter in their target exam's syllabus.
This ensures users never see an empty Module Tracker.

## Changes
1. Creates `seed_user_chapters(p_user_id, p_exam_name)` function that:
   - Maps the exam name (e.g. "JEE Main") to the syllabus_exams id (e.g. "jee-main")
   - Fetches all subjects + chapters for that exam from the syllabus tables
   - Inserts user_chapters rows for each chapter with status='not-started'
   - Uses ON CONFLICT DO NOTHING so re-running is safe
2. Grants EXECUTE to authenticated users

## RLS
No policy changes â€” user_chapters already has RLS policies from the original schema.
The function runs as SECURITY DEFINER so it can insert rows regardless of RLS,
but it only inserts for the calling user (p_user_id = auth.uid()).

## Important Notes
1. The function maps exam names to syllabus_exams ids using a lookup table.
2. If the exam name doesn't match any known exam, it defaults to 'other'.
3. The function is idempotent â€” calling it multiple times for the same user+exam
   won't create duplicate rows (ON CONFLICT DO NOTHING on the unique constraint).
4. We also add a unique constraint on (user_id, exam, subject, chapter) to prevent duplicates.
*/

-- Add unique constraint to user_chapters to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_chapters_unique 
  ON user_chapters(user_id, exam, subject, chapter);

-- Create the seed function
CREATE OR REPLACE FUNCTION seed_user_chapters(p_user_id uuid, p_exam_name text)
RETURNS integer AS $$
DECLARE
  v_exam_id text;
  v_count integer := 0;
  v_chapter RECORD;
  v_exam_name text := p_exam_name;
BEGIN
  -- Map exam name to syllabus_exams id
  -- Try exact name match first, then case-insensitive
  SELECT id INTO v_exam_id FROM syllabus_exams WHERE name = v_exam_name LIMIT 1;
  
  IF v_exam_id IS NULL THEN
    -- Try case-insensitive match
    SELECT id INTO v_exam_id FROM syllabus_exams WHERE LOWER(name) = LOWER(v_exam_name) LIMIT 1;
  END IF;
  
  IF v_exam_id IS NULL THEN
    -- Try partial match (e.g. "JEE Main 2025" â†’ "JEE Main")
    SELECT id INTO v_exam_id FROM syllabus_exams 
    WHERE v_exam_name ILIKE name || '%' OR name ILIKE v_exam_name || '%'
    LIMIT 1;
  END IF;
  
  IF v_exam_id IS NULL THEN
    -- Default to 'other' if no match
    v_exam_id := 'other';
  END IF;
  
  -- Get the exam name from syllabus_exams for consistent naming
  SELECT name INTO v_exam_name FROM syllabus_exams WHERE id = v_exam_id;
  
  -- Insert user_chapters for all chapters in this exam
  FOR v_chapter IN
    SELECT 
      ss.name AS subject_name,
      sc.name AS chapter_name
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION seed_user_chapters(uuid, text) TO authenticated;


-- ############################################################
-- ## 20260715200130_fix_security_issues.sql
-- ############################################################
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
   RPC â€” they only run via trigger, so we revoke from both anon and authenticated.

## Modified Functions (search_path + execution grants)
- update_updated_at (trigger function, not SECURITY DEFINER)
- calculate_resource_metrics (trigger function, not SECURITY DEFINER)
- _seed_subject (helper, not SECURITY DEFINER)
- _seed_chapter (helper, not SECURITY DEFINER)
- _copy_chapters (helper, not SECURITY DEFINER)
- assign_user_role (trigger, SECURITY DEFINER â€” revoke from anon AND authenticated)
- get_current_user_role (SECURITY DEFINER â€” revoke from anon)
- is_admin_user (SECURITY DEFINER â€” revoke from anon)
- log_admin_action (SECURITY DEFINER â€” revoke from anon)
- upsert_user_role (SECURITY DEFINER â€” revoke from anon)
- seed_user_chapters (SECURITY DEFINER â€” revoke from anon)
- seed_chapter_resources (SECURITY DEFINER â€” revoke from anon)
- schedule_chapter_revisions (SECURITY DEFINER â€” revoke from anon)

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
1. Adding user_id columns is additive â€” existing rows get NULL, which means existing
   data is not visible to any user via RLS. This is acceptable since these tables had
   no user_id to begin with and the data was not user-scoped.
2. Trigger functions (assign_user_role, update_updated_at, calculate_resource_metrics)
   run internally by PostgreSQL triggers, not via RPC. Revoking EXECUTE from anon and
   authenticated does not affect trigger execution.
3. The migration is idempotent â€” DROP POLICY IF EXISTS and CREATE OR REPLACE FUNCTION
   make it safe to re-run.
*/


-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 1. FIX FUNCTION SEARCH PATH MUTABLE
-- Recreate all 13 functions with explicit `SET search_path = public, pg_temp`
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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


-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 2. FIX RLS POLICY ALWAYS TRUE (focus_sessions, study_tasks)
-- Add user_id column and replace permissive policies with ownership checks
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

DROP POLICY IF EXISTS "select_own_focus_sessions" ON focus_sessions;
CREATE POLICY "select_own_focus_sessions" ON focus_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_focus_sessions" ON focus_sessions;
CREATE POLICY "insert_own_focus_sessions" ON focus_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_focus_sessions" ON focus_sessions;
CREATE POLICY "update_own_focus_sessions" ON focus_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_focus_sessions" ON focus_sessions;
CREATE POLICY "delete_own_focus_sessions" ON focus_sessions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- study_tasks: drop permissive policies and create ownership-scoped ones
DROP POLICY IF EXISTS "anon_select_study_tasks" ON study_tasks;
DROP POLICY IF EXISTS "anon_insert_study_tasks" ON study_tasks;
DROP POLICY IF EXISTS "anon_update_study_tasks" ON study_tasks;
DROP POLICY IF EXISTS "anon_delete_study_tasks" ON study_tasks;

DROP POLICY IF EXISTS "select_own_study_tasks" ON study_tasks;
CREATE POLICY "select_own_study_tasks" ON study_tasks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_study_tasks" ON study_tasks;
CREATE POLICY "insert_own_study_tasks" ON study_tasks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_study_tasks" ON study_tasks;
CREATE POLICY "update_own_study_tasks" ON study_tasks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_study_tasks" ON study_tasks;
CREATE POLICY "delete_own_study_tasks" ON study_tasks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);


-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 3. FIX SECURITY DEFINER EXECUTION GRANTS
-- Revoke EXECUTE from anon on all SECURITY DEFINER functions
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- Trigger function: only runs via trigger, not via RPC â€” revoke from both anon and authenticated
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



-- ############################################################
-- ## 20260715200445_fix_security_definer_public_grants.sql
-- ############################################################
/*
# Fix SECURITY DEFINER Public Execute Grants + Enforce NOT NULL on user_id

## Summary
Follow-up to the previous security migration. The initial REVOKE EXECUTE FROM anon
removed the explicit `anon` grant, but a broader `PUBLIC` grant (PostgreSQL oid 0)
still exists on all 8 SECURITY DEFINER functions. Since `anon` inherits from `PUBLIC`,
this effectively still allows anon to execute these functions.

## Changes
1. Revoke EXECUTE FROM PUBLIC on all 8 SECURITY DEFINER functions.
   - For trigger function `assign_user_role`: also already revoked from authenticated
     (confirmed). Only postgres and service_role retain execute.
   - For RPC-callable functions: revoke from PUBLIC, keep grants for authenticated
     and service_role.
2. Set `user_id` columns to NOT NULL on `focus_sessions` and `study_tasks`.
   Both tables are currently empty (0 rows), so this is safe. Combined with
   `DEFAULT auth.uid()`, this enforces that every future row is owner-scoped.
3. Also revoke EXECUTE FROM PUBLIC on the 5 non-SECURITY-DEFINER helper/trigger
   functions for defense in depth.
*/

-- Revoke PUBLIC execute on all SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.assign_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_current_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_admin_action(uuid, text, text, uuid, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.upsert_user_role(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_user_chapters(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_chapter_resources(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.schedule_chapter_revisions(uuid, text, text, text, date) FROM PUBLIC;

-- Revoke PUBLIC execute on non-SECURITY-DEFINER helper/trigger functions (defense in depth)
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_resource_metrics() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._seed_subject(text, text, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._seed_chapter(uuid, text, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._copy_chapters(text, text, uuid, integer) FROM PUBLIC;

-- Set user_id columns to NOT NULL (tables are empty, safe to do)
ALTER TABLE focus_sessions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE study_tasks ALTER COLUMN user_id SET NOT NULL;



-- ############################################################
-- ## 20260715200928_fix_security_definer_authenticated_execute.sql
-- ############################################################
/*
# Fix Signed-In Users Can Execute SECURITY DEFINER Functions

## Summary
The Supabase security advisor flagged 7 SECURITY DEFINER functions executable by the
`authenticated` role via PostgREST RPC. Each function is either:
  (a) Safe to run as SECURITY INVOKER because RLS already scopes access to the caller's
      own rows â€” switching to INVOKER means RLS applies, which is the correct behavior.
  (b) Admin-only and should never be callable by authenticated users via RPC â€” these
      are revoked from authenticated entirely (only service_role / postgres retain access).

## Function-by-function decisions

### Switch to SECURITY INVOKER (5 functions)
These functions are designed to be called by authenticated users on their own data.
Under INVOKER, RLS policies on the tables they access will enforce ownership checks.

1. `get_current_user_role()` â€” reads user_roles WHERE user_id = auth.uid().
   RLS: SELECT policy `auth.uid() = user_id` on user_roles. Safe under INVOKER.

2. `is_admin_user()` â€” reads user_roles WHERE user_id = auth.uid().
   RLS: SELECT policy `auth.uid() = user_id` on user_roles. Safe under INVOKER.

3. `schedule_chapter_revisions(p_user_id, ...)` â€” inserts into revision_schedule.
   RLS: INSERT policy `WITH CHECK (auth.uid() = user_id)`. Under INVOKER, a user
   can only schedule revisions for themselves (p_user_id must match auth.uid()).

4. `seed_user_chapters(p_user_id, p_exam_name)` â€” reads syllabus tables (public SELECT
   policy `USING(true)` for authenticated) and inserts into user_chapters.
   RLS: INSERT policy `WITH CHECK (auth.uid() = user_id)`. Under INVOKER, a user
   can only seed chapters for themselves.

5. `seed_chapter_resources(p_user_id, p_exam_name)` â€” reads syllabus tables (public
   SELECT) and inserts into chapter_resources.
   RLS: INSERT policy `WITH CHECK (auth.uid() = user_id)`. Under INVOKER, a user
   can only seed resources for themselves.

### REVOKE EXECUTE from authenticated (2 functions)
These functions modify tables that are admin-only (RLS policies use `WITH CHECK false`
for authenticated). They must only be called via service_role (edge functions) or
internal triggers, never directly by authenticated users.

6. `log_admin_action(...)` â€” inserts into admin_logs.
   RLS: INSERT policy `WITH CHECK false` for authenticated. Admin-only.

7. `upsert_user_role(p_user_id, p_email)` â€” inserts/updates user_roles.
   RLS: INSERT `WITH CHECK false`, UPDATE `USING false WITH CHECK false` for
   authenticated. Admin-only.

## Security Changes
- 5 functions: SECURITY DEFINER â†’ SECURITY INVOKER (RLS now applies)
- 2 functions: REVOKE EXECUTE FROM authenticated (admin-only, service_role only)
- All functions retain `SET search_path = public, pg_temp` from prior migration
- All functions retain REVOKE FROM PUBLIC / anon from prior migration
*/

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 1. Switch user-facing functions to SECURITY INVOKER
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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


-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 2. Revoke EXECUTE from authenticated on admin-only functions
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

REVOKE EXECUTE ON FUNCTION public.log_admin_action(uuid, text, text, uuid, text, jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.upsert_user_role(uuid, text) FROM authenticated;



-- ############################################################
-- ## 20260716090622_upgrade_backlog_items_chapter_based.sql.sql
-- ############################################################
/*
# Upgrade Backlog Tracker to Chapter-Based System

## Overview
Transforms the backlog_items table from a simple title/priority/due_date model
into a chapter-based system where each backlog is tied to a subject + chapter
from the user's exam syllabus, with multiple backlog types (Lecture, DPP, Module,
PYQ, etc.) and their individual progress tracked in a JSONB column.

## New Columns Added to `backlog_items`
1. `subject` (text, nullable) â€” Subject name (e.g. "Physics")
2. `chapter` (text, nullable) â€” Chapter name (e.g. "Kinematics")
3. `exam_id` (text, nullable) â€” The exam ID from onboarding (e.g. "jee-main")
4. `backlog_data` (jsonb, nullable) â€” Array of backlog type progress objects:
   [{"type": "lecture", "total": 7, "completed": 3},
    {"type": "module", "total": 120, "completed": 42}]
   Each object has: type (string), total (number), completed (number),
   and optionally status (string for notes), revision_rounds (number for revision).
5. `overall_progress` (numeric, default 0) â€” Calculated overall completion percentage

## Modified Columns
- `title` is now auto-generated as "{subject} - {chapter}" by the frontend.
  The column itself is unchanged (still text NOT NULL).

## Security
- RLS is already enabled on backlog_items. No policy changes needed â€”
  existing user_id-based policies cover the new columns.
- Existing data is preserved. Old backlogs without the new columns will
  have NULL values for subject/chapter/backlog_data, which the UI handles
  gracefully.

## Notes
1. No existing columns are dropped or renamed.
2. No data is lost â€” all existing rows keep their current values.
3. The new columns are all nullable so old rows remain valid.
4. Indexes added for common query patterns (subject, chapter, exam_id).
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'backlog_items' AND column_name = 'subject') THEN
    ALTER TABLE backlog_items ADD COLUMN subject text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'backlog_items' AND column_name = 'chapter') THEN
    ALTER TABLE backlog_items ADD COLUMN chapter text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'backlog_items' AND column_name = 'exam_id') THEN
    ALTER TABLE backlog_items ADD COLUMN exam_id text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'backlog_items' AND column_name = 'backlog_data') THEN
    ALTER TABLE backlog_items ADD COLUMN backlog_data jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'backlog_items' AND column_name = 'overall_progress') THEN
    ALTER TABLE backlog_items ADD COLUMN overall_progress numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_backlog_items_subject ON backlog_items(subject);
CREATE INDEX IF NOT EXISTS idx_backlog_items_chapter ON backlog_items(chapter);
CREATE INDEX IF NOT EXISTS idx_backlog_items_exam_id ON backlog_items(exam_id);
CREATE INDEX IF NOT EXISTS idx_backlog_items_user_status ON backlog_items(user_id, status);



-- ############################################################
-- ## 20260716120000_create_ai_plans_and_plan_tasks.sql
-- ############################################################
/*
# Create ai_plans and plan_tasks (schema gap fix)

## Problem
The AI planner (src/lib/aiPlanner.ts, src/services/db.ts, src/services/planner/*)
reads and writes `ai_plans` and `plan_tasks`, but NO earlier migration ever
created them â€” the existing migrations only ALTER them:
- 20260716130412 adds columns to `ai_plans` (assumes it exists with RLS)
- 20260728111526 adds columns to `plan_tasks` (assumes it exists)

This migration creates both tables so those ALTERs succeed when the full
migration set is applied in order. Timestamped before 20260716130412.

## Schema notes
- `user_id` defaults to auth.uid() so client inserts that omit it succeed.
- RLS: authenticated-only, owner-scoped (auth.uid() = user_id) â€” the same
  pattern used by recovery_bucket / study_stats / planner_goals.
- `plan_id` on plan_tasks is nullable (manual tasks have no plan) and uses
  ON DELETE SET NULL so deleting a plan (e.g. admin data wipe) keeps tasks.
- `scheduled_date` is nullable; the app filters by it (.eq) so NULL rows are
  simply excluded.
*/

-- ============================================================
-- 1. ai_plans table
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  plan_type text NOT NULL DEFAULT 'daily',
  mode text,
  plan_date date NOT NULL DEFAULT CURRENT_DATE,
  today_goal text,
  study_mode text,
  available_hours integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_ai_plans" ON ai_plans;
CREATE POLICY "select_own_ai_plans" ON ai_plans FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_ai_plans" ON ai_plans;
CREATE POLICY "insert_own_ai_plans" ON ai_plans FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_ai_plans" ON ai_plans;
CREATE POLICY "update_own_ai_plans" ON ai_plans FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_ai_plans" ON ai_plans;
CREATE POLICY "delete_own_ai_plans" ON ai_plans FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_plans_user_date ON ai_plans(user_id, plan_date DESC);

-- ============================================================
-- 2. plan_tasks table
-- ============================================================
CREATE TABLE IF NOT EXISTS plan_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES ai_plans(id) ON DELETE SET NULL,
  title text NOT NULL,
  subject text,
  type text NOT NULL DEFAULT 'study',
  estimated_minutes integer NOT NULL DEFAULT 30,
  priority text NOT NULL DEFAULT 'medium',
  completed boolean NOT NULL DEFAULT false,
  scheduled_date date,
  start_time time,
  end_time time,
  chapter text,
  source text,
  tracker_ref jsonb DEFAULT '{}'::jsonb,
  completion_pct integer NOT NULL DEFAULT 0,
  task_status text NOT NULL DEFAULT 'pending',
  missed_count integer NOT NULL DEFAULT 0,
  reschedule_reason text,
  actual_minutes integer,
  priority_score numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE plan_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_plan_tasks" ON plan_tasks;
CREATE POLICY "select_own_plan_tasks" ON plan_tasks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_plan_tasks" ON plan_tasks;
CREATE POLICY "insert_own_plan_tasks" ON plan_tasks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_plan_tasks" ON plan_tasks;
CREATE POLICY "update_own_plan_tasks" ON plan_tasks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_plan_tasks" ON plan_tasks;
CREATE POLICY "delete_own_plan_tasks" ON plan_tasks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_plan_tasks_user_date ON plan_tasks(user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_plan_tasks_user_status ON plan_tasks(user_id, task_status);



-- ############################################################
-- ## 20260716130412_add_daily_planning_session_tracking.sql.sql
-- ############################################################
/*
# Add daily planning session tracking to ai_plans

1. Purpose
   The AI Planner needs to know whether the user has already completed the daily
   planning flow (goal + study mode + available hours) for today, so it can skip
   the wizard and show today's dashboard directly on subsequent visits. We also
   need to persist the three inputs the user chose so the "Replan Today" flow can
   pre-fill them and the engine can regenerate with the same parameters.

2. Changes to `ai_plans` table
   - `plan_date` (date, not null) â€” already exists in most schemas but ensure it.
   - `today_goal` (text, nullable) â€” the free-text goal the user entered for this day.
   - `study_mode` (text, nullable) â€” the study mode selected (hard_push / balanced / low_energy / recovery / exam_mode).
   - `available_hours` (integer, nullable) â€” the available study hours the user committed to.

3. Approach
   All additions use `IF NOT EXISTS` via DO blocks so the migration is idempotent.
   No data is lost; existing rows simply have NULL for the new columns.

4. Security
   RLS already enabled on ai_plans from prior migrations. No policy changes needed.
*/

DO $$ BEGIN
  ALTER TABLE ai_plans ADD COLUMN IF NOT EXISTS plan_date date NOT NULL DEFAULT CURRENT_DATE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ai_plans ADD COLUMN IF NOT EXISTS today_goal text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ai_plans ADD COLUMN IF NOT EXISTS study_mode text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ai_plans ADD COLUMN IF NOT EXISTS available_hours integer;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Index for quickly finding today's plan for a user
CREATE INDEX IF NOT EXISTS idx_ai_plans_user_date ON ai_plans(user_id, plan_date DESC);



-- ############################################################
-- ## 20260719190455_studyshield_v5_profile_coaching_school_planning.sql.sql
-- ############################################################
/*
# StudyShield v5: Profile coaching/school/planning + formula library + daily plan inputs

## Summary
Upgrades the profiles table with structured coaching and school configuration,
adds a new `formula_library` table with rich formula metadata (variables, units,
shortcuts, common mistakes, PYQ importance, difficulty), and a `daily_plan_inputs`
table that records the user's answers to the daily AI Planner questions
(school day, hours, energy level, exam tomorrow).

## 1. profiles â€” new columns
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
- `energy_level` text default 'normal' (low/normal/high â€” last used daily value)
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

RLS: SELECT TO anon, authenticated (public read â€” formula catalog is shared
reference data, not user-owned). No insert/update/delete from the client â€”
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



-- ############################################################
-- ## 20260719190622_seed_formula_library_v5.sql.sql
-- ############################################################
/*
# Seed formula library â€” JEE, NEET, Commerce

## Summary
Populates the `formula_library` table with curated formulas containing the full
metadata requested: variables (with units), unit, explanation, shortcut trick,
common mistakes, PYQ importance, difficulty, chapter, subject.

## Coverage
- JEE Main (exam_id='jee-main'): Physics, Chemistry, Mathematics â€” 16 formulas
- NEET UG (exam_id='neet-ug'): Physics, Chemistry, Biology â€” 8 formulas
- Commerce: mapped to 'ca-foundation' exam_id (Accounts, Economics, Business Studies) â€” 6 formulas

## Idempotency
Uses ON CONFLICT DO NOTHING keyed on (exam_id, subject, name) so re-running the
seed does not create duplicates. A unique index is added to enforce this.

## Security
No policy changes â€” formula_library remains public read. This is a data-only
seed migration.
*/

CREATE UNIQUE INDEX IF NOT EXISTS idx_formula_library_exam_subject_name
  ON formula_library(exam_id, subject, name);

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty)
VALUES
-- ========== JEE PHYSICS ==========
('jee-main','Physics','Kinematics','Equations of Motion','v = u + at; s = ut + Â½atÂ²; vÂ² = uÂ² + 2as',
  '[{"symbol":"v","meaning":"final velocity","unit":"m/s"},{"symbol":"u","meaning":"initial velocity","unit":"m/s"},{"symbol":"a","meaning":"acceleration","unit":"m/sÂ²"},{"symbol":"t","meaning":"time","unit":"s"},{"symbol":"s","meaning":"displacement","unit":"m"}]',
  'm/s, m',
  'Three kinematic equations describe motion under constant acceleration. The first gives velocity-time, the second displacement-time, the third velocity-displacement (no time).',
  'For free fall, replace a with g and take downward as positive to avoid sign confusion.',
  '["Using vÂ² = uÂ² + 2as when acceleration is not constant","Forgetting that s is displacement not distance","Mixing sign conventions for upward/downward motion"]',
  'Appears in ~2 questions every JEE Main. High frequency in kinematics and projectile problems.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('jee-main','Physics','Kinematics','Projectile Range','R = (uÂ² sin 2Î¸) / g',
  '[{"symbol":"R","meaning":"horizontal range","unit":"m"},{"symbol":"u","meaning":"initial speed","unit":"m/s"},{"symbol":"Î¸","meaning":"launch angle","unit":"rad"},{"symbol":"g","meaning":"acceleration due to gravity","unit":"m/sÂ²"}]',
  'm','Maximum range occurs at Î¸ = 45Â°. Complementary angles (Î¸ and 90Â°âˆ’Î¸) give the same range.',
  'Rmax = uÂ²/g at Î¸ = 45Â°. For complementary angles R is identical â€” saves calculation.',
  '["Using sin Î¸ instead of sin 2Î¸","Forgetting that Rmax needs Î¸ = 45Â° not 90Â°"]',
  'Projectile motion is a JEE staple; range formula appears every year.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('jee-main','Physics','Laws of Motion','Newton Second Law','F = ma = dp/dt',
  '[{"symbol":"F","meaning":"net force","unit":"N"},{"symbol":"m","meaning":"mass","unit":"kg"},{"symbol":"a","meaning":"acceleration","unit":"m/sÂ²"},{"symbol":"p","meaning":"momentum","unit":"kgÂ·m/s"}]',
  'N','Force equals rate of change of momentum. For constant mass this reduces to F = ma.',
  'Impulse-momentum: FÂ·Î”t = Î”p. Use this for collision problems instead of computing a.',
  '["Using F = ma when mass changes (rocket problem)","Not taking the net force â€” summing only some forces"]',
  'Foundational; appears in friction, pulley, and collision problems.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('jee-main','Physics','Work Energy and Power','Work-Energy Theorem','W = Î”KE = Â½m(vÂ² âˆ’ uÂ²)',
  '[{"symbol":"W","meaning":"net work done","unit":"J"},{"symbol":"m","meaning":"mass","unit":"kg"},{"symbol":"v","meaning":"final velocity","unit":"m/s"},{"symbol":"u","meaning":"initial velocity","unit":"m/s"}]',
  'J','Net work done on a body equals its change in kinetic energy. Sign of W tells you if energy is added or removed.',
  'When friction is involved, W_friction = âˆ’fÂ·d directly gives energy lost â€” skip computing intermediate velocities.',
  '["Using distance instead of displacement for W","Forgetting that W is the net work not work by one force"]',
  'Frequent in combined mechanics-energy problems.','medium')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('jee-main','Physics','Gravitation','Gravitational Force','F = GÂ·mâ‚mâ‚‚ / rÂ²',
  '[{"symbol":"F","meaning":"gravitational force","unit":"N"},{"symbol":"G","meaning":"gravitational constant","unit":"NÂ·mÂ²/kgÂ²"},{"symbol":"mâ‚, mâ‚‚","meaning":"masses","unit":"kg"},{"symbol":"r","meaning":"distance between centers","unit":"m"}]',
  'N','Inverse-square law. Field g = GM/rÂ². Potential energy U = âˆ’GMm/r (negative, zero at infinity).',
  'g at height h: g'' = g(R/(R+h))Â². For h << R, g'' â‰ˆ g(1 âˆ’ 2h/R).',
  '["Using r as altitude instead of distance from center","Forgetting the negative sign in potential energy"]',
  'Orbital mechanics and escape velocity questions appear regularly.','medium')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('jee-main','Physics','Current Electricity','Ohms Law','V = IR',
  '[{"symbol":"V","meaning":"voltage","unit":"V"},{"symbol":"I","meaning":"current","unit":"A"},{"symbol":"R","meaning":"resistance","unit":"Î©"}]',
  'V','Voltage across a resistor equals current times resistance. Power P = VI = IÂ²R = VÂ²/R.',
  'Series: R = Î£Ráµ¢. Parallel: 1/R = Î£(1/Ráµ¢). Two parallel: R = Râ‚Râ‚‚/(Râ‚+Râ‚‚).',
  '["Adding resistances in parallel instead of taking reciprocals","Forgetting P = IÂ²R is for resistors only"]',
  'Circuit analysis questions in nearly every paper.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('jee-main','Physics','Moving Charges and Magnetism','Lorentz Force','F = q(E + v Ã— B)',
  '[{"symbol":"F","meaning":"Lorentz force","unit":"N"},{"symbol":"q","meaning":"charge","unit":"C"},{"symbol":"E","meaning":"electric field","unit":"V/m"},{"symbol":"v","meaning":"velocity","unit":"m/s"},{"symbol":"B","meaning":"magnetic field","unit":"T"}]',
  'N','Total electromagnetic force on a charge. Magnetic part is always perpendicular to v so does no work.',
  'Cyclotron radius r = mv/(qB). Period T = 2Ï€m/(qB) â€” independent of speed.',
  '["Forgetting the cross product (v Ã— B not vÂ·B)","Using scalar addition instead of vector addition"]',
  'High frequency in electromagnetism sections.','medium')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

-- ========== JEE CHEMISTRY ==========
INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('jee-main','Chemistry','Mole Concept and Stoichiometry','Mole Concept','n = m / M = N / Nâ‚',
  '[{"symbol":"n","meaning":"number of moles","unit":"mol"},{"symbol":"m","meaning":"mass","unit":"g"},{"symbol":"M","meaning":"molar mass","unit":"g/mol"},{"symbol":"N","meaning":"number of particles","unit":"â€”"},{"symbol":"Nâ‚","meaning":"Avogadro number","unit":"6.022Ã—10Â²Â³/mol"}]',
  'mol','A mole contains Avogadro number of particles. Converts between mass, moles, and particle count.',
  'At STP, 1 mole of any gas occupies 22.4 L. Use this to skip mass-to-volume conversions.',
  '["Confusing molar mass with molecular mass (units)","Using Nâ‚ for mass calculations directly"]',
  'Foundation of stoichiometry; appears in almost every physical chemistry question.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('jee-main','Chemistry','Gaseous State','Ideal Gas Equation','PV = nRT',
  '[{"symbol":"P","meaning":"pressure","unit":"Pa or atm"},{"symbol":"V","meaning":"volume","unit":"L or mÂ³"},{"symbol":"n","meaning":"moles","unit":"mol"},{"symbol":"R","meaning":"gas constant","unit":"0.0821 LÂ·atm/(molÂ·K)"},{"symbol":"T","meaning":"temperature","unit":"K"}]',
  'varies','Combines Boyle, Charles, and Avogadro laws. R = 0.0821 LÂ·atm/(molÂ·K) or 8.314 J/(molÂ·K).',
  'For fixed mass: Pâ‚Vâ‚/Tâ‚ = Pâ‚‚Vâ‚‚/Tâ‚‚. Saves computing n and R.',
  '["Using Celsius instead of Kelvin","Mixing R units (LÂ·atm vs J)"]',
  'Standard in gaseous state questions.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('jee-main','Chemistry','Ionic Equilibrium','pH Definition','pH = âˆ’logâ‚â‚€[Hâº]',
  '[{"symbol":"pH","meaning":"acidity scale","unit":"0â€“14"},{"symbol":"[Hâº]","meaning":"hydrogen ion concentration","unit":"mol/L"}]',
  'dimensionless','pH < 7 acidic, > 7 basic, = 7 neutral (at 25Â°C). pOH = 14 âˆ’ pH. pKw = 14 at 25Â°C.',
  'For strong acids [Hâº] = normality. For weak acids [Hâº] = âˆš(KaÂ·C) â€” saves solving the full quadratic.',
  '["Forgetting pKw changes with temperature","Using pH + pOH = 14 at temperatures other than 25Â°C"]',
  'Appears in ionic equilibrium and buffer questions every year.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('jee-main','Chemistry','Ionic Equilibrium','Henderson-Hasselbalch','pH = pKa + log([Aâ»]/[HA])',
  '[{"symbol":"pH","meaning":"buffer pH","unit":"â€”"},{"symbol":"pKa","meaning":"acid dissociation constant","unit":"â€”"},{"symbol":"[Aâ»]","meaning":"conjugate base","unit":"mol/L"},{"symbol":"[HA]","meaning":"weak acid","unit":"mol/L"}]',
  'dimensionless','Calculates pH of buffer solutions. Best when [Aâ»]/[HA] is between 0.1 and 10.',
  'When [Aâ»] = [HA], pH = pKa directly. Useful for identifying buffer capacity maxima.',
  '["Swapping [Aâ»] and [HA]","Applying to non-buffer solutions"]',
  'Buffer problems are JEE favorites.','medium')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('jee-main','Chemistry','Thermodynamics','First Law of Thermodynamics','Î”U = q + w',
  '[{"symbol":"Î”U","meaning":"internal energy change","unit":"J"},{"symbol":"q","meaning":"heat transferred","unit":"J"},{"symbol":"w","meaning":"work done on system","unit":"J"}]',
  'J','Energy conservation for chemical systems. w = âˆ’PÎ”V for expansion work (work done BY system is negative).',
  'For isothermal ideal gas: Î”U = 0, so q = âˆ’w. For adiabatic: q = 0, so Î”U = w.',
  '["Sign convention confusion (w on vs by system)","Using Î”H when the question asks for Î”U at constant volume"]',
  'Thermochemistry calculations appear in nearly every paper.','medium')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

-- ========== JEE MATHEMATICS ==========
INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('jee-main','Mathematics','Quadratic Equations','Quadratic Formula','x = (âˆ’b Â± âˆš(bÂ² âˆ’ 4ac)) / 2a',
  '[{"symbol":"x","meaning":"roots","unit":"â€”"},{"symbol":"a, b, c","meaning":"coefficients of axÂ² + bx + c","unit":"â€”"}]',
  'dimensionless','Discriminant D = bÂ² âˆ’ 4ac: D > 0 two real roots, D = 0 one repeated root, D < 0 complex conjugate roots.',
  'Sum of roots = âˆ’b/a, product = c/a. Use these when only symmetric functions of roots are needed.',
  '["Forgetting 2a in denominator","Misreading the sign of b"]',
  'Foundational; underpins many algebra problems.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('jee-main','Mathematics','Differential Calculus','Derivative Power Rule','d/dx [xâ¿] = nÂ·xâ¿â»Â¹',
  '[{"symbol":"n","meaning":"exponent","unit":"â€”"},{"symbol":"x","meaning":"variable","unit":"â€”"}]',
  'dimensionless','Basic differentiation rule. Chain rule: d/dx[f(g(x))] = f''(g(x))Â·g''(x).',
  'Product rule: (uv)'' = u''v + uv''. Quotient: (u/v)'' = (u''v âˆ’ uv'')/vÂ².',
  '["Applying power rule to e^x (use e^x itself)","Forgetting chain rule in composite functions"]',
  'Calculus is the most heavily weighted JEE math topic.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('jee-main','Mathematics','Integral Calculus','Integration by Parts','âˆ«u dv = uv âˆ’ âˆ«v du',
  '[{"symbol":"u, v","meaning":"functions of x","unit":"â€”"}]',
  'varies','LIATE rule for choosing u: Logarithmic, Inverse trig, Algebraic, Trigonometric, Exponential.',
  'âˆ«eË£(sin x + cos x) dx = eË£ sin x + C. Memorize such direct forms to save time.',
  '["Choosing u and dv wrong (violates LIATE)","Forgetting the constant of integration"]',
  'Definite integrals using parts appear every year.','medium')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('jee-main','Mathematics','Trigonometry','Sine Rule','a/sin A = b/sin B = c/sin C = 2R',
  '[{"symbol":"a, b, c","meaning":"side lengths","unit":"â€”"},{"symbol":"A, B, C","meaning":"opposite angles","unit":"rad"},{"symbol":"R","meaning":"circumradius","unit":"â€”"}]',
  'dimensionless','Relates sides to opposite angles in any triangle. R is the circumradius.',
  'Cosine rule: cÂ² = aÂ² + bÂ² âˆ’ 2abÂ·cos C. Use when all three sides or two sides + included angle are known.',
  '["Using sine rule for SAS configuration","Forgetting R is circumradius not inradius"]',
  'Properties of triangles is a standard JEE topic.','medium')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

-- ========== NEET PHYSICS ==========
INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('neet-ug','Physics','Kinematics','Equations of Motion','v = u + at; s = ut + Â½atÂ²; vÂ² = uÂ² + 2as',
  '[{"symbol":"v","meaning":"final velocity","unit":"m/s"},{"symbol":"u","meaning":"initial velocity","unit":"m/s"},{"symbol":"a","meaning":"acceleration","unit":"m/sÂ²"}]',
  'm/s, m','Motion under constant acceleration. Fundamental for NEET mechanics.',
  'For free fall use a = g = 9.8 m/sÂ² and consistent sign convention.',
  '["Confusing displacement with distance","Wrong sign for retardation"]',
  'NEET physics almost always has 1â€“2 kinematics questions.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('neet-ug','Physics','Current Electricity','Ohms Law','V = IR',
  '[{"symbol":"V","meaning":"voltage","unit":"V"},{"symbol":"I","meaning":"current","unit":"A"},{"symbol":"R","meaning":"resistance","unit":"Î©"}]',
  'V','Foundation of circuit analysis. Power dissipated P = IÂ²R.',
  'Two resistors in parallel: R = Râ‚Râ‚‚/(Râ‚+Râ‚‚).',
  '["Adding parallel resistances directly"]',
  'NEET circuit questions are common.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('neet-ug','Physics','Ray Optics','Lens Formula','1/v âˆ’ 1/u = 1/f',
  '[{"symbol":"v","meaning":"image distance","unit":"cm"},{"symbol":"u","meaning":"object distance","unit":"cm"},{"symbol":"f","meaning":"focal length","unit":"cm"}]',
  'cmâ»Â¹','Sign convention: distances measured from optical center. Convex lens f > 0, concave f < 0.',
  'Magnification m = v/u = h''/h. Power P = 1/f (in meters) â€” unit is dioptre.',
  '["Wrong sign convention for virtual images","Using f in cm when computing power"]',
  'Optics is heavily tested in NEET.','medium')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

-- ========== NEET CHEMISTRY ==========
INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('neet-ug','Chemistry','Mole Concept and Stoichiometry','Mole Concept','n = m / M = N / Nâ‚',
  '[{"symbol":"n","meaning":"moles","unit":"mol"},{"symbol":"m","meaning":"mass","unit":"g"},{"symbol":"M","meaning":"molar mass","unit":"g/mol"},{"symbol":"Nâ‚","meaning":"Avogadro number","unit":"6.022Ã—10Â²Â³"}]',
  'mol','Central to stoichiometry. At STP, 1 mole gas = 22.4 L.',
  'Number of atoms = moles Ã— Nâ‚ Ã— atomicity.',
  '["Forgetting atomicity for diatomic gases"]',
  'NEET physical chemistry foundation.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('neet-ug','Chemistry','Ionic Equilibrium','pH Definition','pH = âˆ’logâ‚â‚€[Hâº]',
  '[{"symbol":"pH","meaning":"acidity","unit":"0â€“14"},{"symbol":"[Hâº]","meaning":"Hâº concentration","unit":"mol/L"}]',
  'dimensionless','pH scale. Blood pH ~7.4. Stomach pH ~1.5â€“2.',
  'pOH = 14 âˆ’ pH at 25Â°C.',
  '["Forgetting temperature dependence of pKw"]',
  'NEET frequently tests pH of biological fluids.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

-- ========== NEET BIOLOGY ==========
INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('neet-ug','Biology','Evolution','Hardy-Weinberg Equilibrium','pÂ² + 2pq + qÂ² = 1',
  '[{"symbol":"p","meaning":"frequency of dominant allele","unit":"â€”"},{"symbol":"q","meaning":"frequency of recessive allele","unit":"â€”"},{"symbol":"pÂ²","meaning":"homozygous dominant frequency","unit":"â€”"},{"symbol":"2pq","meaning":"heterozygous frequency","unit":"â€”"},{"symbol":"qÂ²","meaning":"homozygous recessive frequency","unit":"â€”"}]',
  'dimensionless','Allele frequencies remain constant in an ideal population (no selection, mutation, migration, drift).',
  'If qÂ² is known (recessive phenotype), q = âˆš(qÂ²), p = 1 âˆ’ q, carrier frequency = 2pq.',
  '["Calculating p from pÂ² instead of taking sqrt","Assuming equilibrium when selection is acting"]',
  'NEET genetics questions frequently invoke Hardy-Weinberg.','medium')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('neet-ug','Biology','Photosynthesis','Photosynthesis Equation','6COâ‚‚ + 6Hâ‚‚O â†’ Câ‚†Hâ‚â‚‚Oâ‚† + 6Oâ‚‚',
  '[{"symbol":"COâ‚‚","meaning":"carbon dioxide","unit":"â€”"},{"symbol":"Hâ‚‚O","meaning":"water","unit":"â€”"},{"symbol":"Câ‚†Hâ‚â‚‚Oâ‚†","meaning":"glucose","unit":"â€”"},{"symbol":"Oâ‚‚","meaning":"oxygen","unit":"â€”"}]',
  'â€”','Light-dependent + Calvin cycle. ATP and NADPH carry energy from light to dark reactions.',
  'For 1 glucose: 6 COâ‚‚, 12 Hâ‚‚O (net 6), 6 Oâ‚‚. 18 ATP and 12 NADPH per glucose in Calvin cycle.',
  '["Balancing water incorrectly","Forgetting Oâ‚‚ comes from water not COâ‚‚"]',
  'Direct questions on the equation and sites of reactions are NEET staples.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('neet-ug','Biology','Genetics','Punnett Square Ratio','Monohybrid 3:1; Dihybrid 9:3:3:1; Test cross 1:1',
  '[{"symbol":"â€”","meaning":"phenotypic ratios","unit":"â€”"}]',
  'ratio','Mendelian inheritance ratios for F2 generation under independent assortment.',
  'Test cross (with recessive parent) reveals genotype â€” 1:1 for heterozygote, 1:1:1:1 for dihybrid.',
  '["Confusing phenotypic with genotypic ratio (1:2:1 monohybrid genotypic)"]',
  'Genetics problems are a NEET certainty.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

-- ========== COMMERCE (CA Foundation) ==========
INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('ca-foundation','Accounts','Financial Statements','Net Profit Ratio','Net Profit Ratio = (Net Profit / Revenue) Ã— 100',
  '[{"symbol":"Net Profit","meaning":"profit after all expenses & tax","unit":"â‚¹"},{"symbol":"Revenue","meaning":"net sales","unit":"â‚¹"}]',
  '%','Profitability ratio showing net profit as a percentage of revenue. Higher is better.',
  'Net Profit = Gross Profit âˆ’ Indirect Expenses + Indirect Income.',
  '["Using gross profit instead of net profit","Forgetting to deduct tax"]',
  'Ratio analysis is a Commerce board exam regular.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('ca-foundation','Accounts','Financial Statements','Current Ratio','Current Ratio = Current Assets / Current Liabilities',
  '[{"symbol":"Current Assets","meaning":"assets convertible within 1 year","unit":"â‚¹"},{"symbol":"Current Liabilities","meaning":"obligations due within 1 year","unit":"â‚¹"}]',
  'ratio (ideal 2:1)','Liquidity ratio. Ideal ratio is 2:1 â€” indicates ability to meet short-term obligations.',
  'Quick Ratio = (Current Assets âˆ’ Stock) / Current Liabilities. Ideal 1:1.',
  '["Including stock in quick ratio","Misclassifying prepaid expenses"]',
  'Liquidity ratios appear in board exams and competitive tests.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('ca-foundation','Accounts','Depreciation','Depreciation SLM','Annual Depreciation = (Cost âˆ’ Salvage Value) / Useful Life',
  '[{"symbol":"Cost","meaning":"purchase price + installation","unit":"â‚¹"},{"symbol":"Salvage Value","meaning":"estimated residual value","unit":"â‚¹"},{"symbol":"Useful Life","meaning":"years of expected use","unit":"years"}]',
  'â‚¹/year','Straight-line method: equal depreciation each year. WDV method: depreciation on reducing balance.',
  'Rate under SLM = (Cost âˆ’ Salvage) / (Cost Ã— Life) Ã— 100.',
  '["Forgetting to subtract salvage value","Applying WDV rate to original cost instead of book value"]',
  'Depreciation accounting is heavily tested.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('ca-foundation','Economics','Demand','Elasticity of Demand','Ed = (% change in quantity) / (% change in price)',
  '[{"symbol":"Ed","meaning":"price elasticity of demand","unit":"â€”"},{"symbol":"% Î”Q","meaning":"percentage change in quantity","unit":"%"},{"symbol":"% Î”P","meaning":"percentage change in price","unit":"%"}]',
  'dimensionless','Ed > 1 elastic, Ed < 1 inelastic, Ed = 1 unitary, Ed = 0 perfectly inelastic, Ed = âˆž perfectly elastic.',
  'Midpoint method: Ed = (Î”Q/Î”P) Ã— ((Pâ‚+Pâ‚‚)/(Qâ‚+Qâ‚‚)) â€” more accurate for larger changes.',
  '["Forgetting Ed is negative (drop the sign by convention)","Using absolute changes instead of percentages"]',
  'Demand elasticity is a board exam staple.','medium')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('ca-foundation','Economics','Theory of Cost','Marginal Cost','MC = Î”TC / Î”Q',
  '[{"symbol":"MC","meaning":"marginal cost","unit":"â‚¹/unit"},{"symbol":"Î”TC","meaning":"change in total cost","unit":"â‚¹"},{"symbol":"Î”Q","meaning":"change in output","unit":"units"}]',
  'â‚¹/unit','Cost of producing one additional unit. When MC = MR, profit is maximized.',
  'MC = TVC of n units âˆ’ TVC of (nâˆ’1) units. Fixed costs do not affect MC.',
  '["Including fixed costs in MC computation","Confusing MC with AVC"]',
  'Cost curves and MC=MR equilibrium are exam favorites.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('ca-foundation','Business Studies','Financial Management','Break-even Point','BEP (units) = Fixed Cost / (Price âˆ’ Variable Cost per unit)',
  '[{"symbol":"Fixed Cost","meaning":"costs independent of output","unit":"â‚¹"},{"symbol":"Price","meaning":"selling price per unit","unit":"â‚¹/unit"},{"symbol":"Variable Cost","meaning":"cost per unit","unit":"â‚¹/unit"}]',
  'units','Output level where total revenue equals total cost. Contribution per unit = Price âˆ’ VC.',
  'BEP (sales value) = Fixed Cost / P/V ratio, where P/V = Contribution / Sales.',
  '["Using total variable cost instead of per-unit","Forgetting contribution margin must be positive"]',
  'Break-even analysis appears in Business Studies and Economics.','medium')
ON CONFLICT (exam_id, subject, name) DO NOTHING;



-- ############################################################
-- ## 20260719200256_studyshield_v6_rls_fix_and_formula_expansion.sql.sql
-- ############################################################
/*
# StudyShield v6: RLS fix + formula expansion

## Summary
1. RLS FIX: syllabus_exams, syllabus_subjects, syllabus_chapters are public
   reference data needed by the onboarding page (which runs before a session
   is established). They were authenticated-only, causing the exam picker to
   load empty. Now readable by anon + authenticated.
2. RLS DEDUP: drop duplicate policies accumulated from repeated migrations.
   Keep one canonical set per table.
3. FORMULA EXPANSION: seed formulas for jee-advanced, bitsat, mht-cet,
   comedk, viteee, wbjee, kiitee, srmjeee, ca-intermediate, ca-final, cma,
   clat, cat, upsc-cse, gate, nda, cds, plus more neet-ug.
4. formula_library read policy made anon-readable so the vault loads.

## Security
- syllabus_* tables: SELECT TO anon, authenticated (public reference data).
- All user-scoped tables: keep authenticated-only with auth.uid() ownership.
- formula_library: SELECT TO anon, authenticated (reference data).
*/

-- ============================================================
-- 1. SYLLABUS RLS: make reference data readable by anon
-- ============================================================
ALTER TABLE syllabus_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE syllabus_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE syllabus_chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_syllabus_exams" ON syllabus_exams;
DROP POLICY IF EXISTS "read_syllabus_exams" ON syllabus_exams;
CREATE POLICY "read_syllabus_exams" ON syllabus_exams
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "select_syllabus_subjects" ON syllabus_subjects;
DROP POLICY IF EXISTS "read_syllabus_subjects" ON syllabus_subjects;
CREATE POLICY "read_syllabus_subjects" ON syllabus_subjects
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "select_syllabus_chapters" ON syllabus_chapters;
DROP POLICY IF EXISTS "read_syllabus_chapters" ON syllabus_chapters;
CREATE POLICY "read_syllabus_chapters" ON syllabus_chapters
  FOR SELECT TO anon, authenticated USING (true);

-- ============================================================
-- 2. DEDUP user-scoped table policies (keep canonical set)
-- ============================================================
DROP POLICY IF EXISTS "select_own_backlog" ON backlog_items;
DROP POLICY IF EXISTS "insert_own_backlog" ON backlog_items;
DROP POLICY IF EXISTS "update_own_backlog" ON backlog_items;
DROP POLICY IF EXISTS "delete_own_backlog" ON backlog_items;

DROP POLICY IF EXISTS "select_formula_library" ON formula_library;
DROP POLICY IF EXISTS "read_formula_library" ON formula_library;
CREATE POLICY "read_formula_library" ON formula_library
  FOR SELECT TO anon, authenticated USING (true);

-- ============================================================
-- 3. FORMULA EXPANSION â€” JEE Advanced
-- ============================================================
INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty)
VALUES
('jee-advanced','Physics','Electrostatics','Coulomb Force in Vector Form','F12 = (1/(4Ï€Îµâ‚€)) Â· (q1 q2 / rÂ²) Â· rÌ‚12','[{"symbol":"F12","meaning":"Force on q1 by q2","unit":"N"},{"symbol":"Îµâ‚€","meaning":"Permittivity of free space","unit":"F/m"},{"symbol":"q1,q2","meaning":"Charges","unit":"C"},{"symbol":"r","meaning":"Separation","unit":"m"},{"symbol":"rÌ‚12","meaning":"Unit vector from q2 to q1","unit":"-"}]','N','Vector form of Coulombs law; sign of product determines attraction/repulsion.','Use F = kq1q2/rÂ² for magnitude, attach sign of product for direction.','["Forgetting vector direction","Using wrong sign for charges","Ignoring superposition"]','Directly tested in JEE Advanced electrostatics; combine with equilibrium.','medium'),
('jee-advanced','Physics','Current Electricity','Drift Velocity','vd = (I)/(n A e)','[{"symbol":"vd","meaning":"Drift velocity","unit":"m/s"},{"symbol":"I","meaning":"Current","unit":"A"},{"symbol":"n","meaning":"Electron density","unit":"/mÂ³"},{"symbol":"A","meaning":"Cross-section area","unit":"mÂ²"},{"symbol":"e","meaning":"Electron charge","unit":"C"}]','m/s','Relates macroscopic current to microscopic carrier motion.','vd is tiny (~mm/s) even for large currents.','["Confusing drift velocity with signal speed","Wrong unit for n"]','Appears in resistance and current problems.','easy'),
('jee-advanced','Chemistry','Thermodynamics','Gibbs Free Energy','Î”G = Î”H âˆ’ TÎ”S','[{"symbol":"Î”G","meaning":"Gibbs free energy change","unit":"kJ/mol"},{"symbol":"Î”H","meaning":"Enthalpy change","unit":"kJ/mol"},{"symbol":"T","meaning":"Temperature","unit":"K"},{"symbol":"Î”S","meaning":"Entropy change","unit":"J/(molÂ·K)"}]','kJ/mol','Determines spontaneity: Î”G<0 spontaneous, >0 non-spontaneous.','Convert Î”S to kJ before subtracting.','["Using Â°C instead of K","Mixing J and kJ units for Î”S"]','Core in thermo and electrochemistry problems.','medium'),
('jee-advanced','Chemistry','Chemical Kinetics','Arrhenius Equation','k = AÂ·e^(âˆ’Ea/RT)','[{"symbol":"k","meaning":"Rate constant","unit":"varies"},{"symbol":"A","meaning":"Pre-exponential factor","unit":"varies"},{"symbol":"Ea","meaning":"Activation energy","unit":"J/mol"},{"symbol":"R","meaning":"Gas constant","unit":"J/(molÂ·K)"},{"symbol":"T","meaning":"Temperature","unit":"K"}]','varies','Temperature dependence of rate constant.','ln(k2/k1) = (Ea/R)Â·(1/T1 âˆ’ 1/T2) for two temperatures.','["Using Ea in kJ without Ã—1000","Forgetting natural log in linear form"]','Frequent in JEE Advanced kinetics.','medium'),
('jee-advanced','Mathematics','Calculus','Integration by Parts','âˆ«u dv = uv âˆ’ âˆ«v du','[{"symbol":"u","meaning":"First function","unit":"-"},{"symbol":"dv","meaning":"Second function differential","unit":"-"}]','-','ILATE rule for choosing u: Inverse, Log, Algebraic, Trig, Exponential.','Choose u as the function that simplifies on differentiation.','["Wrong choice of u (should simplify on diff)","Forgetting the second integral"]','Essential for JEE Advanced indefinite integrals.','medium'),
('jee-advanced','Mathematics','Coordinate Geometry','Ellipse Equation','xÂ²/aÂ² + yÂ²/bÂ² = 1','[{"symbol":"a","meaning":"Semi-major axis","unit":"-"},{"symbol":"b","meaning":"Semi-minor axis","unit":"-"},{"symbol":"x,y","meaning":"Point on ellipse","unit":"-"}]','-','Standard ellipse centered at origin; eccentricity e = âˆš(1âˆ’bÂ²/aÂ²).','Focus at (Â±ae, 0); directrix x = Â±a/e.','["Swapping a and b","Using bÂ²=aÂ²âˆ’eÂ² instead of bÂ²=aÂ²(1âˆ’eÂ²)"]','Ellipse properties tested every year.','easy')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. FORMULA EXPANSION â€” BITSAT / MHT-CET / VITEEE / WBJEE / KIITEE / SRMJEEE / COMEDK
-- ============================================================
INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty)
VALUES
('bitsat','Physics','Optics','Lens Makers Formula','1/f = (nâˆ’1)[1/R1 âˆ’ 1/R2 + ((nâˆ’1)d)/(n R1 R2)]','[{"symbol":"f","meaning":"Focal length","unit":"m"},{"symbol":"n","meaning":"Refractive index","unit":"-"},{"symbol":"R1,R2","meaning":"Radii of curvature","unit":"m"},{"symbol":"d","meaning":"Thickness","unit":"m"}]','m','For thin lens, drop thickness term.','Sign convention: R positive if center of curvature is on outgoing side.','["Wrong sign for R1/R2","Including d for thin lens"]','Common in BITSAT optics.','medium'),
('bitsat','Chemistry','Mole Concept','Number of Moles','n = mass / molar mass = N / NA','[{"symbol":"n","meaning":"Moles","unit":"mol"},{"symbol":"N","meaning":"Number of particles","unit":"-"},{"symbol":"NA","meaning":"Avogadro number","unit":"/mol"}]','mol','Foundation of stoichiometry.','NA = 6.022Ã—10Â²Â³/mol.','["Using molecular mass instead of molar","Unit errors"]','Basic; appears across chemistry.','easy'),
('bitsat','Mathematics','Probability','Bayes Theorem','P(A|B) = P(B|A)Â·P(A) / P(B)','[{"symbol":"P(A|B)","meaning":"Posterior probability","unit":"-"},{"symbol":"P(B|A)","meaning":"Likelihood","unit":"-"},{"symbol":"P(A)","meaning":"Prior","unit":"-"},{"symbol":"P(B)","meaning":"Evidence","unit":"-"}]','-','Updates probability given new evidence.','P(B) = Î£ P(B|Ai)Â·P(Ai) by total probability.','["Forgetting to normalise by P(B)","Confusing prior and posterior"]','BITSAT probability and statistics.','medium'),
('mht-cet','Physics','Magnetism','Magnetic Force on Wire','F = BIL sinÎ¸','[{"symbol":"F","meaning":"Force","unit":"N"},{"symbol":"B","meaning":"Magnetic field","unit":"T"},{"symbol":"I","meaning":"Current","unit":"A"},{"symbol":"L","meaning":"Length","unit":"m"},{"symbol":"Î¸","meaning":"Angle B to wire","unit":"Â°"}]','N','Force on current-carrying conductor in field.','Max force when wire perpendicular to B.','["Forgetting sinÎ¸","Wrong direction (use Flemings left rule)"]','MHT-CET magnetism section.','easy'),
('mht-cet','Chemistry','Equilibrium','Equilibrium Constant','Kc = [products]/[reactants] (stoich powers)','[{"symbol":"Kc","meaning":"Equilibrium constant","unit":"-"},{"symbol":"[]","meaning":"Molar concentration","unit":"mol/L"}]','-','For aA+bBâ‡ŒcC+dD, Kc = [C]^c[D]^d/([A]^a[B]^b).','Kp = Kc(RT)^Î”n for gases.','["Using moles instead of concentrations","Wrong stoichiometric powers"]','MHT-CET equilibrium is high-yield.','easy'),
('mht-cet','Mathematics','Trigonometry','Sine and Cosine Rules','a/sinA = b/sinB = c/sinC; cÂ²=aÂ²+bÂ²âˆ’2ab cosC','[{"symbol":"a,b,c","meaning":"Sides","unit":"-"},{"symbol":"A,B,C","meaning":"Opposite angles","unit":"Â°"}]','-','Solve non-right triangles.','cos(A+B) form helps in compound angles.','["Using sine rule for SAS case","Sign error in cosine rule for obtuse C"]','MHT-CET trig problems.','medium'),
('viteee','Physics','Modern Physics','de Broglie Wavelength','Î» = h/p = h/(mv)','[{"symbol":"Î»","meaning":"Wavelength","unit":"m"},{"symbol":"h","meaning":"Planck constant","unit":"JÂ·s"},{"symbol":"p","meaning":"Momentum","unit":"kgÂ·m/s"},{"symbol":"m","meaning":"Mass","unit":"kg"},{"symbol":"v","meaning":"Velocity","unit":"m/s"}]','m','Matter wave wavelength; wave-particle duality.','For electron accelerated through V volts: Î» = 12.27/âˆšV Ã….','["Using mass in grams","Forgetting to convert eV to joules"]','VITEEE modern physics.','medium'),
('viteee','Mathematics','Differential Equations','Linear DE Form','dy/dx + P(x)y = Q(x)','[{"symbol":"y","meaning":"Dependent variable","unit":"-"},{"symbol":"P,Q","meaning":"Functions of x","unit":"-"}]','-','Integrating factor IF = e^âˆ«P dx; solution yÂ·IF = âˆ«QÂ·IF dx.','Recognise linear form before solving.','["Not recognising linear form","Wrong integrating factor"]','VITEEE differential equations.','medium'),
('wbjee','Physics','Thermodynamics','First Law','Î”U = Q âˆ’ W','[{"symbol":"Î”U","meaning":"Internal energy change","unit":"J"},{"symbol":"Q","meaning":"Heat added to system","unit":"J"},{"symbol":"W","meaning":"Work done by system","unit":"J"}]','J','Energy conservation for thermodynamic systems.','Sign: W positive when system expands.','["Wrong sign convention for W","Confusing work by vs on system"]','WBJEE thermo.','easy'),
('kiitee','Chemistry','Periodic Table','Effective Nuclear Charge','Zeff = Z âˆ’ Ïƒ','[{"symbol":"Zeff","meaning":"Effective nuclear charge","unit":"-"},{"symbol":"Z","meaning":"Atomic number","unit":"-"},{"symbol":"Ïƒ","meaning":"Shielding constant","unit":"-"}]','-','Slater rules give Ïƒ; Zeff explains trends.','Zeff increases across a period.','["Using full Z instead of Zeff","Wrong Slater screening values"]','KIITEE periodic properties.','easy'),
('srmjeee','Mathematics','Vectors','Scalar Triple Product','[a b c] = aÂ·(bÃ—c) = det[b c]','[{"symbol":"a,b,c","meaning":"Vectors","unit":"-"},{"symbol":"Ã—","meaning":"Cross product","unit":"-"},{"symbol":"Â·","meaning":"Dot product","unit":"-"}]','-','Volume of parallelepiped; coplanarity if [abc]=0.','Determinant of 3 vectors rows = scalar triple product.','["Row vs column mix-up in determinant","Forgetting coplanarity test"]','SRMJEEE vector algebra.','medium'),
('comedk','Physics','Electrostatics','Capacitance','C = Q/V; for parallel plate C = Îµâ‚€A/d','[{"symbol":"C","meaning":"Capacitance","unit":"F"},{"symbol":"Q","meaning":"Charge","unit":"C"},{"symbol":"V","meaning":"Voltage","unit":"V"},{"symbol":"Îµâ‚€","meaning":"Permittivity","unit":"F/m"},{"symbol":"A","meaning":"Plate area","unit":"mÂ²"},{"symbol":"d","meaning":"Separation","unit":"m"}]','F','Series: 1/C=Î£1/Ci; parallel: C=Î£Ci.','Energy stored U = Â½CVÂ².','["Series vs parallel formula swap","Wrong dielectric effect (k multiplies C)"]','COMEDK electrostatics.','easy')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. FORMULA EXPANSION â€” Commerce (CA Intermediate / Final / CMA)
-- ============================================================
INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty)
VALUES
('ca-intermediate','Advanced Accounting','Ratio Analysis','Current Ratio','Current Ratio = Current Assets / Current Liabilities','[{"symbol":"Current Assets","meaning":"Cash, stock, debtors etc","unit":"â‚¹"},{"symbol":"Current Liabilities","meaning":"Payables, short-term debt","unit":"â‚¹"}]','-','Liquidity measure; ideal ~2:1.','Quick ratio = (CAâˆ’Inventory)/CL.','["Including fixed assets in CA","Treating bank overdraft as non-current"]','CA Inter ratio analysis.','easy'),
('ca-intermediate','Corporate Laws','Capital Structure','Debt-Equity Ratio','D/E = Total Debt / Shareholders Equity','[{"symbol":"D","meaning":"Total debt (long+short)","unit":"â‚¹"},{"symbol":"E","meaning":"Shareholders equity","unit":"â‚¹"}]','-','Leverage indicator; high D/E = higher risk.','Interest coverage = EBIT/Interest.','["Using only long-term debt","Equity net of intangible assets inconsistency"]','Capital structure questions.','medium'),
('ca-final','Financial Reporting','Valuation','Discounted Cash Flow','V = Î£ CFt/(1+r)^t','[{"symbol":"V","meaning":"Value","unit":"â‚¹"},{"symbol":"CFt","meaning":"Cash flow at time t","unit":"â‚¹"},{"symbol":"r","meaning":"Discount rate","unit":"-"},{"symbol":"t","meaning":"Time period","unit":"yr"}]','â‚¹','Intrinsic value via present value of future cash flows.','Terminal value = CFn(1+g)/(râˆ’g).','["Using wrong discount rate","Inconsistent time units"]','CA Final valuation chapter.','hard'),
('ca-final','Strategic Financial Management','Portfolio','CAPM','E(Ri) = Rf + Î²iÂ·(E(Rm) âˆ’ Rf)','[{"symbol":"E(Ri)","meaning":"Expected return","unit":"%"},{"symbol":"Rf","meaning":"Risk-free rate","unit":"%"},{"symbol":"Î²i","meaning":"Stock beta","unit":"-"},{"symbol":"E(Rm)","meaning":"Market return","unit":"%"}]','%','Required return given systematic risk.','Beta = Cov(Ri,Rm)/Var(Rm).','["Confusing Î² with correlation","Using nominal Rf with real returns"]','CAPM in SFM.','medium'),
('cma','Cost Accounting','Marginal Costing','P/V Ratio','P/V Ratio = (Sales âˆ’ Variable Cost)/Sales = Contribution/Sales','[{"symbol":"P/V","meaning":"Profit-volume ratio","unit":"%"},{"symbol":"Contribution","meaning":"Sales âˆ’ Variable cost","unit":"â‚¹"}]','%','Measures profitability per rupee of sales.','BEP (â‚¹) = Fixed Cost / P/V ratio.','["Using profit instead of contribution","Wrong BEP formula"]','CMA marginal costing.','medium'),
('cma','Financial Management','Capital Budgeting','NPV','NPV = Î£ CFt/(1+k)^t âˆ’ Initial Investment','[{"symbol":"NPV","meaning":"Net present value","unit":"â‚¹"},{"symbol":"CFt","meaning":"Cash flow at t","unit":"â‚¹"},{"symbol":"k","meaning":"Cost of capital","unit":"%"}]','â‚¹','Accept if NPV>0; compares projects.','IRR is the rate making NPV=0.','["Using accounting profit not cash flow","Wrong discount rate"]','CMA capital budgeting.','medium')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. FORMULA EXPANSION â€” CLAT / CAT / UPSC / GATE / NDA / CDS
-- ============================================================
INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty)
VALUES
('cat','Quantitative Aptitude','Number System','Remainder Theorem','(a mod n) and (b mod n) â†’ (a+b) mod n = [(a mod n)+(b mod n)] mod n','[{"symbol":"a,b","meaning":"Integers","unit":"-"},{"symbol":"n","meaning":"Modulus","unit":"-"}]','-','Modular arithmetic for remainder problems.','Use Euler/Fermat for large powers.','["Adding moduli without re-modding","Ignoring negative remainders"]','CAT number system.','medium'),
('cat','Quantitative Aptitude','Time-Speed-Distance','Relative Speed','Relative speed = |v1 âˆ’ v2| (same dir), v1+v2 (opposite)','[{"symbol":"v1,v2","meaning":"Speeds","unit":"km/h"}]','km/h','Same direction subtract; opposite add.','Meeting time = distance / relative speed.','["Using sum for same direction","Unit mismatch (m/s vs km/h)"]','CAT TSD problems.','easy'),
('clat','Quantitative Techniques','Percentages','Percentage Change','% change = (New âˆ’ Original)/Original Ã— 100','[{"symbol":"New","meaning":"New value","unit":"-"},{"symbol":"Original","meaning":"Original value","unit":"-"}]','%','Successive %: a+b+ab/100.','Net change for x% up, y% down.','["Dividing by New instead of Original","Forgetting Ã—100"]','CLAT quantitative.','easy'),
('upsc-cse','Economics','Microeconomics','Price Elasticity','Ed = (%Î”Q)/(%Î”P) = (Î”Q/Q)/(Î”P/P)','[{"symbol":"Ed","meaning":"Price elasticity","unit":"-"},{"symbol":"Î”Q","meaning":"Qty change","unit":"-"},{"symbol":"Î”P","meaning":"Price change","unit":"-"}]','-','Ed>1 elastic, <1 inelastic, =1 unitary.','Revenue maximised where Ed=1.','["Using absolute changes not %","Sign confusion"]','UPSC economics.','medium'),
('upsc-cse','Polity','Elections','Electoral Quota','Quota = (Valid votes)/(Seats+1) + 1','[{"symbol":"Quota","meaning":"Votes needed to win","unit":"-"},{"symbol":"Valid votes","meaning":"Total valid votes","unit":"-"},{"symbol":"Seats","meaning":"Seats to fill","unit":"-"}]','-','Droop quota for STV elections.','Used in proportional representation.','["Off-by-one in +1","Using total not valid votes"]','UPSC polity reference.','medium'),
('gate','Engineering Mathematics','Linear Algebra','Eigenvalue','det(A âˆ’ Î»I) = 0','[{"symbol":"A","meaning":"Square matrix","unit":"-"},{"symbol":"Î»","meaning":"Eigenvalue","unit":"-"},{"symbol":"I","meaning":"Identity matrix","unit":"-"}]','-','Characteristic equation; roots are eigenvalues.','Trace = Î£Î», det = Î Î».','["Forgetting to subtract Î»I","Using Aâˆ’Î» instead of Aâˆ’Î»I"]','GATE linear algebra.','medium'),
('nda','Mathematics','Trigonometry','Compound Angle','sin(AÂ±B) = sinA cosB Â± cosA sinB','[{"symbol":"A,B","meaning":"Angles","unit":"Â°"}]','-','cos(AÂ±B)=cosA cosB âˆ“ sinA sinB.','tan(A+B)=(tanA+tanB)/(1âˆ’tanA tanB).','["Sign flip between sin and cos forms","Wrong sign in tan formula"]','NDA trigonometry.','easy'),
('cds','Mathematics','Geometry','Area of Triangle','A = Â½Â·bÂ·h = Â½ ab sinC = âˆš(s(sâˆ’a)(sâˆ’b)(sâˆ’c))','[{"symbol":"A","meaning":"Area","unit":"mÂ²"},{"symbol":"b,h","meaning":"Base, height","unit":"m"},{"symbol":"s","meaning":"Semi-perimeter","unit":"m"}]','mÂ²','Herons formula uses semi-perimeter s=(a+b+c)/2.','For right triangle A=Â½Â·leg1Â·leg2.','["Using full perimeter in Herons","Wrong included angle for Â½ab sinC"]','CDS geometry.','easy')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 7. MORE NEET UG formulas
-- ============================================================
INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty)
VALUES
('neet-ug','Biology','Genetics','Hardy-Weinberg','pÂ² + 2pq + qÂ² = 1; p + q = 1','[{"symbol":"p","meaning":"Dominant allele freq","unit":"-"},{"symbol":"q","meaning":"Recessive allele freq","unit":"-"}]','-','Equilibrium allele frequencies in a population.','pÂ² = homozygous dominant, 2pq = heterozygote.','["Solving for p without using p+q=1","Using phenotype frequencies as allele freqs"]','NEET genetics.','medium'),
('neet-ug','Biology','Photosynthesis','Net Photosynthesis','Net P = Gross P âˆ’ Respiration','[{"symbol":"Net P","meaning":"Net photosynthesis","unit":"mg Oâ‚‚/L"},{"symbol":"Gross P","meaning":"Gross photosynthesis","unit":"mg Oâ‚‚/L"}]','mg Oâ‚‚/L','Net gain after respiratory loss.','Gross P measured in light; respiration in dark.','["Using only light bottle values","Forgetting dark bottle correction"]','NEET plant physiology.','medium'),
('neet-ug','Physics','Optics','Snells Law','n1 sinÎ¸1 = n2 sinÎ¸2','[{"symbol":"n1,n2","meaning":"Refractive indices","unit":"-"},{"symbol":"Î¸1,Î¸2","meaning":"Angles from normal","unit":"Â°"}]','-','Refraction at interface; basis of lens theory.','Critical angle sinC = n2/n1 (n1>n2).','["Measuring angle from surface not normal","Reversing n1,n2"]','NEET optics.','easy'),
('neet-ug','Chemistry','Solutions','Raoults Law','pA = xA Â· pAÂ°','[{"symbol":"pA","meaning":"Partial vapour pressure","unit":"atm"},{"symbol":"xA","meaning":"Mole fraction","unit":"-"},{"symbol":"pAÂ°","meaning":"Pure vapour pressure","unit":"atm"}]','atm','For ideal solutions total P = Î£ xi piÂ°.','Positive/negative deviation modifies this.','["Using mole fraction of solute for solvent P","Ignoring non-ideality"]','NEET solutions.','medium')
ON CONFLICT DO NOTHING;



-- ############################################################
-- ## 20260719211835_normalize_user_chapters_status.sql
-- ############################################################
-- Normalize inconsistent status strings in user_chapters.
-- Root cause: some rows stored "not-started" (kebab) while the app uses
-- "not_started" (snake_case). This caused status updates to silently
-- mismatch existing rows, so changes never persisted.
-- This migration normalizes existing data in place â€” NO rows are deleted,
-- NO user progress is lost. Only the status string is corrected.

UPDATE user_chapters
SET status = 'not_started',
    updated_at = now()
WHERE status = 'not-started';



-- ############################################################
-- ## 20260719211852_extend_user_chapters_status_set.sql
-- ############################################################
-- Add a CHECK constraint so user_chapters.status accepts the full 11-value
-- status set required by the Subject Manager. This is additive â€” it does not
-- drop or alter existing columns, and existing rows (all 'not_started') are
-- already valid under the new constraint.

ALTER TABLE user_chapters
DROP CONSTRAINT IF EXISTS user_chapters_status_check;

ALTER TABLE user_chapters
ADD CONSTRAINT user_chapters_status_check CHECK (
  status IN (
    'not_started',
    'started',
    'in_progress',
    'completed',
    'backlog',
    'revision_pending',
    'revision_completed',
    'dpp_pending',
    'module_pending',
    'pyq_pending',
    'mastered'
  )
);



-- ############################################################
-- ## 20260719211934_correct_neet_formula_subject_mappings.sql
-- ############################################################
-- Correct NEET formula subject/chapter mappings to the official NCERT NEET
-- syllabus. The NEET syllabus uses "Botany" and "Zoology" (not "Biology"),
-- and chapter names must match the syllabus_chapters table exactly.
--
-- These are standard, verified NEET formulas â€” only their subject/chapter
-- classification was wrong. No formulas are invented, deleted, or replaced.
-- Formula content (expression) is unchanged; only classification metadata
-- and the enrichment fields (variables, explanation, pyq_importance) are set.

-- 1. Hardy-Weinberg Equilibrium â€” Evolution is a Zoology chapter in NEET
UPDATE formula_library SET
  subject = 'Zoology',
  chapter = 'Evolution',
  variables = '[{"symbol":"p","meaning":"frequency of dominant allele"},{"symbol":"q","meaning":"frequency of recessive allele"},{"symbol":"pÂ²","meaning":"frequency of homozygous dominant genotype"},{"symbol":"2pq","meaning":"frequency of heterozygous genotype"},{"symbol":"qÂ²","meaning":"frequency of homozygous recessive genotype"}]'::jsonb,
  explanation = 'Describes allele and genotype frequencies in a non-evolving, ideal population. Sum of genotype frequencies equals 1.',
  pyq_importance = 'high',
  unit = '-'
WHERE exam_id = 'neet-ug' AND subject = 'Biology' AND chapter = 'Evolution' AND name = 'Hardy-Weinberg Equilibrium';

-- 2. Hardy-Weinberg (Genetics) â€” Mendelian genetics maps to Botany/Principles of Inheritance and Variation in NEET
UPDATE formula_library SET
  subject = 'Botany',
  chapter = 'Principles of Inheritance and Variation',
  variables = '[{"symbol":"p","meaning":"frequency of dominant allele"},{"symbol":"q","meaning":"frequency of recessive allele"}]'::jsonb,
  explanation = 'Allele frequencies remain constant in an ideal population (no mutation, migration, selection, drift, or non-random mating).',
  pyq_importance = 'high',
  unit = '-'
WHERE exam_id = 'neet-ug' AND subject = 'Biology' AND chapter = 'Genetics' AND name = 'Hardy-Weinberg';

-- 3. Punnett Square Ratio â€” Mendelian ratios, Botany/Principles of Inheritance and Variation
UPDATE formula_library SET
  subject = 'Botany',
  chapter = 'Principles of Inheritance and Variation',
  variables = '[{"symbol":"Monohybrid","meaning":"single trait cross ratio 3:1"},{"symbol":"Dihybrid","meaning":"two trait cross ratio 9:3:3:1"},{"symbol":"Test cross","meaning":"cross with recessive parent, ratio 1:1"}]'::jsonb,
  explanation = 'Standard phenotypic ratios from Mendelian crosses assuming complete dominance and independent assortment.',
  pyq_importance = 'high',
  unit = 'ratio'
WHERE exam_id = 'neet-ug' AND subject = 'Biology' AND chapter = 'Genetics' AND name = 'Punnett Square Ratio';

-- 4 & 5. Photosynthesis equations â€” Botany/Photosynthesis in Higher Plants
UPDATE formula_library SET
  subject = 'Botany',
  chapter = 'Photosynthesis in Higher Plants',
  variables = '[{"symbol":"COâ‚‚","meaning":"carbon dioxide"},{"symbol":"Hâ‚‚O","meaning":"water"},{"symbol":"Câ‚†Hâ‚â‚‚Oâ‚†","meaning":"glucose"},{"symbol":"Oâ‚‚","meaning":"oxygen"}]'::jsonb,
  explanation = 'Overall balanced equation of photosynthesis; light energy converts COâ‚‚ and Hâ‚‚O into glucose and Oâ‚‚.',
  pyq_importance = 'high',
  unit = '-'
WHERE exam_id = 'neet-ug' AND subject = 'Biology' AND chapter = 'Photosynthesis' AND name = 'Photosynthesis Equation';

UPDATE formula_library SET
  subject = 'Botany',
  chapter = 'Photosynthesis in Higher Plants',
  variables = '[{"symbol":"Gross P","meaning":"total photosynthesis"},{"symbol":"Respiration","meaning":"COâ‚‚ released by plant respiration"},{"symbol":"Net P","meaning":"photosynthesis available for growth/storage"}]'::jsonb,
  explanation = 'Net photosynthesis is the carbon fixed after subtracting respiratory losses; what actually contributes to plant biomass.',
  pyq_importance = 'medium',
  unit = '-'
WHERE exam_id = 'neet-ug' AND subject = 'Biology' AND chapter = 'Photosynthesis' AND name = 'Net Photosynthesis';



-- ############################################################
-- ## 20260719212002_correct_ca_foundation_formula_subject_mappings.sql
-- ############################################################
-- Correct CA Foundation formula subject/chapter mappings to the official
-- ICAI CA Foundation syllabus. Syllabus subjects are "Accounting",
-- "Business Laws", "Business Economics", "Mathematics" â€” the stored
-- "Accounts", "Business Studies", "Economics" do not exist in the syllabus.
-- Only classification metadata is corrected; formula expressions unchanged.

-- Net Profit Ratio & Current Ratio -> Accounting / Preparation of Final Accounts
UPDATE formula_library SET subject = 'Accounting', chapter = 'Preparation of Final Accounts', pyq_importance = 'high'
WHERE exam_id = 'ca-foundation' AND subject = 'Accounts' AND chapter = 'Financial Statements' AND name = 'Net Profit Ratio';

UPDATE formula_library SET subject = 'Accounting', chapter = 'Preparation of Final Accounts', pyq_importance = 'high'
WHERE exam_id = 'ca-foundation' AND subject = 'Accounts' AND chapter = 'Financial Statements' AND name = 'Current Ratio';

-- Depreciation SLM -> Accounting / Depreciation Accounting
UPDATE formula_library SET subject = 'Accounting', chapter = 'Depreciation Accounting', pyq_importance = 'high'
WHERE exam_id = 'ca-foundation' AND subject = 'Accounts' AND chapter = 'Depreciation' AND name = 'Depreciation SLM';

-- Break-even Point -> Accounting / Preparation of Final Accounts (cost-volume-profit in final accounts)
UPDATE formula_library SET subject = 'Accounting', chapter = 'Preparation of Final Accounts', pyq_importance = 'medium'
WHERE exam_id = 'ca-foundation' AND subject = 'Business Studies' AND chapter = 'Financial Management' AND name = 'Break-even Point';

-- Elasticity of Demand -> Business Economics / Demand and Supply
UPDATE formula_library SET subject = 'Business Economics', chapter = 'Demand and Supply', pyq_importance = 'high'
WHERE exam_id = 'ca-foundation' AND subject = 'Economics' AND chapter = 'Demand' AND name = 'Elasticity of Demand';

-- Marginal Cost -> Business Economics / Theory of Production and Cost
UPDATE formula_library SET subject = 'Business Economics', chapter = 'Theory of Production and Cost', pyq_importance = 'high'
WHERE exam_id = 'ca-foundation' AND subject = 'Economics' AND chapter = 'Theory of Cost' AND name = 'Marginal Cost';



-- ############################################################
-- ## 20260719213333_merge_jee_main_and_advanced.sql
-- ############################################################
-- Merge JEE Main and JEE Advanced into a single "JEE (Main + Advanced)" exam.
-- JEE Advanced is the syllabus superset (it has 7 extra chapters over JEE Main),
-- so the merged exam uses the Advanced subjects + chapters. Formulas from both
-- exams are merged into the new exam_id; the unique index
-- (exam_id, subject, name) dedupes identical formulas automatically.
--
-- The old jee-main / jee-advanced rows in syllabus_exams are RETAINED (not
-- deleted) as historical references, but no active data references them after
-- this migration. This preserves any audit trail without duplicating syllabi.

INSERT INTO syllabus_exams (id, name, category)
VALUES ('jee', 'JEE (Main + Advanced)', 'Engineering')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category;

-- Copy the JEE Advanced subjects (superset) into the merged exam.
-- display_order is preserved so the subject order stays Physics, Chemistry, Maths.
INSERT INTO syllabus_subjects (exam_id, name, display_order)
SELECT 'jee', name, display_order FROM syllabus_subjects WHERE exam_id = 'jee-advanced'
ON CONFLICT (exam_id, name) DO NOTHING;

-- Copy all JEE Advanced chapters (superset) into the merged exam subjects,
-- matching by subject name. display_order is preserved.
INSERT INTO syllabus_chapters (subject_id, name, display_order)
SELECT ss_new.id, c.name, c.display_order
FROM syllabus_chapters c
JOIN syllabus_subjects ss_old ON ss_old.id = c.subject_id AND ss_old.exam_id = 'jee-advanced'
JOIN syllabus_subjects ss_new ON ss_new.exam_id = 'jee' AND ss_new.name = ss_old.name
WHERE NOT EXISTS (
  SELECT 1 FROM syllabus_chapters c2
  JOIN syllabus_subjects ss2 ON ss2.id = c2.subject_id AND ss2.exam_id = 'jee'
  WHERE c2.name = c.name AND ss2.name = ss_old.name
);

-- Merge formulas from both jee-main and jee-advanced into the merged exam.
-- The unique index (exam_id, subject, name) dedupes formulas that exist in
-- both exams (e.g. "Integration by Parts"). Where a name collides, the
-- jee-advanced version wins (inserted last via ORDER BY). chapter/expression
-- are carried through unchanged.
WITH ranked AS (
  SELECT
    subject, chapter, name, expression, variables, unit, explanation,
    shortcut, common_mistakes, pyq_importance, difficulty,
    ROW_NUMBER() OVER (PARTITION BY subject, name ORDER BY CASE WHEN exam_id = 'jee-advanced' THEN 0 ELSE 1 END) AS rn
  FROM formula_library
  WHERE exam_id IN ('jee-main', 'jee-advanced')
)
INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty)
SELECT 'jee', subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty
FROM ranked WHERE rn = 1
ON CONFLICT (exam_id, subject, name) DO NOTHING;



-- ############################################################
-- ## 20260719213403_unify_jee_user_data.sql
-- ############################################################
-- Unify all JEE user data under the single merged exam_id 'jee'.
-- This is an UPDATE-only migration: NO rows are deleted, NO user progress
-- is lost. Only the exam identifier is normalized.
--
-- Before this migration, user_chapters.exam stored a mix of display names
-- ("JEE Advanced") and kebab IDs ("jee-advanced", "jee-main"). All are
-- remapped to 'jee'. No (user_id, subject, chapter) duplicates exist across
-- the old formats (verified), so the unique index update is conflict-free.

UPDATE user_chapters
SET exam = 'jee', updated_at = now()
WHERE exam IN ('JEE Advanced', 'jee-advanced', 'jee-main', 'JEE Main');

-- Normalize the profile target_exam for JEE users to the merged exam ID.
UPDATE profiles
SET target_exam = 'jee', updated_at = now()
WHERE target_exam IN ('JEE Advanced', 'jee-advanced', 'jee-main', 'JEE Main');

-- Normalize revision_schedule exam references (if any) to the merged exam.
UPDATE revision_schedule
SET exam = 'jee'
WHERE exam IN ('JEE Advanced', 'jee-advanced', 'jee-main', 'JEE Main');



-- ############################################################
-- ## 20260719221347_extend_backlog_items_with_lecture_dpp_module_fields.sql
-- ############################################################
/*
# Extend backlog_items with lecture / DPP / module tracking fields

## Purpose
The Backlog Management workflow now captures structured backlog detail per
chapter: which backlog types apply (lecture / DPP / module), how many
lectures are pending, how many DPPs are pending, and module question
progress. The AI Planner reads these fields to schedule the right work and
decrements them automatically as the user completes tasks.

## Safety
- This migration is purely ADDITIVE. It does NOT drop, rename, or retype any
  existing column. All existing backlog rows keep their data and gain sane
  defaults for the new columns.
- Existing RLS policies on backlog_items are untouched (owner-scoped CRUD
  via auth.uid() = user_id). New columns are covered by the existing
  permissive owner policies automatically.
- A new `updated_at` column + trigger tracks last-modified time. The trigger
  function and trigger are created with OR REPLACE / DROP IF EXISTS so the
  migration is safe to re-run.

## New columns on `backlog_items`
1. `backlog_types` (text[], default '{}') â€” which backlog kinds apply for
   this item. Any subset of: 'lecture', 'dpp', 'module'. Empty array means
   a legacy / free-form item (backward compatible with existing rows).
2. `pending_lectures` (integer, default 0) â€” number of lectures still to be
   watched/attended for this chapter.
3. `pending_dpps` (integer, default 0) â€” number of DPP sheets pending.
4. `module_progress` (text, default 'not_started') â€” one of
   'not_started' | 'started' | 'in_progress' | 'completed'.
5. `module_total_questions` (integer, default 0) â€” total module questions.
6. `module_solved_questions` (integer, default 0) â€” solved so far.
7. `module_questions_remaining` (integer, GENERATED ALWAYS AS
   GREATEST(module_total_questions - module_solved_questions, 0) STORED) â€”
   remaining module questions, auto-calculated, never written directly.
8. `updated_at` (timestamptz, default now()) â€” last-modified timestamp,
   kept in sync by the trigger below.

## Trigger
- `set_updated_at()` sets NEW.updated_at = now() on every UPDATE.
- Trigger `backlog_items_updated_at` fires BEFORE UPDATE on backlog_items.

## Notes
- Existing rows: new scalar columns default to 0 / 'not_started' / '{}' so
  every legacy item remains valid and visible. `title`, `subject`,
  `chapter`, `priority`, `status`, `backlog_data`, `overall_progress` are
  all preserved exactly.
- The AI Planner and Dashboard read the new columns; missing/zero values
  fall back gracefully to the existing behavior.
*/

-- 1. Add new columns (idempotent â€” safe to re-run)
ALTER TABLE backlog_items
  ADD COLUMN IF NOT EXISTS backlog_types text[] NOT NULL DEFAULT '{}';

ALTER TABLE backlog_items
  ADD COLUMN IF NOT EXISTS pending_lectures integer NOT NULL DEFAULT 0;

ALTER TABLE backlog_items
  ADD COLUMN IF NOT EXISTS pending_dpps integer NOT NULL DEFAULT 0;

ALTER TABLE backlog_items
  ADD COLUMN IF NOT EXISTS module_progress text NOT NULL DEFAULT 'not_started';

ALTER TABLE backlog_items
  ADD COLUMN IF NOT EXISTS module_total_questions integer NOT NULL DEFAULT 0;

ALTER TABLE backlog_items
  ADD COLUMN IF NOT EXISTS module_solved_questions integer NOT NULL DEFAULT 0;

-- 2. Remaining module questions = total - solved (auto-calculated, never negative)
ALTER TABLE backlog_items
  ADD COLUMN IF NOT EXISTS module_questions_remaining integer
  GENERATED ALWAYS AS (GREATEST(module_total_questions - module_solved_questions, 0)) STORED;

-- 3. updated_at column + trigger
ALTER TABLE backlog_items
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS backlog_items_updated_at ON backlog_items;
CREATE TRIGGER backlog_items_updated_at
  BEFORE UPDATE ON backlog_items
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();



-- ############################################################
-- ## 20260719232230_fix_set_updated_at_search_path.sql
-- ############################################################
-- Fix: Function Search Path Mutable on public.set_updated_at
-- The trigger function ran with the caller's mutable search_path, allowing a
-- malicious actor to shadow unqualified references. Pin it to an explicit,
-- non-mutable search_path so resolution is deterministic regardless of caller.
-- The function body only calls now(), which lives in pg_catalog, so pin both
-- pg_catalog (for now()) and public (the function's own schema) for safety.
ALTER FUNCTION public.set_updated_at() SET search_path = pg_catalog, public;


-- ############################################################
-- ## 20260728111526_studyshield_planner_v2_schema.sql
-- ############################################################
/*
# StudyShield AI Planner V2 â€” Schema Extension

## Purpose
Extends the existing schema to support the intelligent planning engine:
- Task states (pending, in_progress, completed, skipped, etc.)
- Recovery bucket for missed/rescheduled tasks
- User learning model (average durations, study patterns)
- Weekly/monthly planner goals

## 1. Modified Tables
### plan_tasks
- Added `task_status` column (text, default 'pending') â€” replaces boolean `completed` for richer states.
  Values: pending, in_progress, completed, skipped, partially_completed, postponed, cancelled.
- Added `missed_count` (int, default 0) â€” tracks how many times a task was rescheduled.
- Added `reschedule_reason` (text, nullable) â€” why the task was moved.
- Added `actual_minutes` (int, nullable) â€” real time spent, for learning model.
- Added `priority_score` (numeric, default 0) â€” computed priority from the engine.

## 2. New Tables
### recovery_bucket
Stores missed lectures, DPPs, module questions, PYQs, and revisions that couldn't
fit into the day. These are gradually recovered in future planning â€” never deleted.
- reason (text): why it was missed
- date_missed (date): when it was originally scheduled
- times_rescheduled (int): how many times it's been moved
- recovery_status: pending / scheduled / recovered

### study_stats
The user learning model. Tracks average durations and study patterns so the planner
can predict durations from history instead of assuming defaults.
- avg_lecture_min, avg_dpp_min, avg_module_min, avg_pyq_min, avg_revision_min
- avg_focus_session_min, completion_rate, best_study_hours
- weak_subjects, strong_subjects (text arrays)
- total_study_min, total_questions_solved, total_lectures_completed

### planner_goals
Stores weekly and monthly goals generated by the planner.
- goal_type: 'weekly' | 'monthly'
- period_start, period_end (date)
- goals (jsonb): structured goal data (target chapters, question targets, etc.)
- results (jsonb): computed results after the period ends
- status: 'active' | 'completed' | 'regenerated'

## 3. Security
- RLS enabled on all new tables with owner-scoped CRUD (TO authenticated, auth.uid() = user_id).
- user_id columns default to auth.uid() so inserts omitting user_id succeed.

## 4. Notes
- No existing data is deleted or altered. The `completed` boolean on plan_tasks
  remains for backward compatibility; `task_status` is the source of truth.
- All new tables use gen_random_uuid() for ids and now() for timestamps.
*/

-- ============================================================
-- 1. Extend plan_tasks with task states + planning metadata
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plan_tasks' AND column_name = 'task_status') THEN
    ALTER TABLE plan_tasks ADD COLUMN task_status text NOT NULL DEFAULT 'pending';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plan_tasks' AND column_name = 'missed_count') THEN
    ALTER TABLE plan_tasks ADD COLUMN missed_count int NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plan_tasks' AND column_name = 'reschedule_reason') THEN
    ALTER TABLE plan_tasks ADD COLUMN reschedule_reason text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plan_tasks' AND column_name = 'actual_minutes') THEN
    ALTER TABLE plan_tasks ADD COLUMN actual_minutes int;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plan_tasks' AND column_name = 'priority_score') THEN
    ALTER TABLE plan_tasks ADD COLUMN priority_score numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Backfill task_status from completed for existing rows
UPDATE plan_tasks SET task_status = 'completed' WHERE completed = true AND task_status = 'pending';

-- ============================================================
-- 2. recovery_bucket table
-- ============================================================
CREATE TABLE IF NOT EXISTS recovery_bucket (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  subject text,
  chapter text,
  task_type text NOT NULL DEFAULT 'study',
  estimated_minutes int NOT NULL DEFAULT 30,
  priority text NOT NULL DEFAULT 'medium',
  difficulty text DEFAULT 'medium',
  reason text,
  date_missed date NOT NULL,
  times_rescheduled int NOT NULL DEFAULT 0,
  recovery_status text NOT NULL DEFAULT 'pending',
  original_task_id uuid,
  scheduled_recovery_date date,
  recovered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE recovery_bucket ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_recovery" ON recovery_bucket;
CREATE POLICY "select_own_recovery" ON recovery_bucket FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_recovery" ON recovery_bucket;
CREATE POLICY "insert_own_recovery" ON recovery_bucket FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_recovery" ON recovery_bucket;
CREATE POLICY "update_own_recovery" ON recovery_bucket FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_recovery" ON recovery_bucket;
CREATE POLICY "delete_own_recovery" ON recovery_bucket FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_recovery_user_status ON recovery_bucket(user_id, recovery_status);

-- ============================================================
-- 3. study_stats table (user learning model)
-- ============================================================
CREATE TABLE IF NOT EXISTS study_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  avg_lecture_min numeric DEFAULT 0,
  avg_dpp_min numeric DEFAULT 0,
  avg_module_min numeric DEFAULT 0,
  avg_pyq_min numeric DEFAULT 0,
  avg_revision_min numeric DEFAULT 0,
  avg_focus_session_min numeric DEFAULT 0,
  completion_rate numeric DEFAULT 0,
  best_study_hours text,
  weak_subjects text[] DEFAULT '{}',
  strong_subjects text[] DEFAULT '{}',
  total_study_min int DEFAULT 0,
  total_questions_solved int DEFAULT 0,
  total_lectures_completed int DEFAULT 0,
  total_tasks_completed int DEFAULT 0,
  streak_days int DEFAULT 0,
  data_points int DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE study_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_stats" ON study_stats;
CREATE POLICY "select_own_stats" ON study_stats FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_stats" ON study_stats;
CREATE POLICY "insert_own_stats" ON study_stats FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_stats" ON study_stats;
CREATE POLICY "update_own_stats" ON study_stats FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 4. planner_goals table (weekly / monthly)
-- ============================================================
CREATE TABLE IF NOT EXISTS planner_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type text NOT NULL CHECK (goal_type IN ('weekly', 'monthly')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  goals jsonb NOT NULL DEFAULT '{}',
  results jsonb,
  status text NOT NULL DEFAULT 'active',
  completion_pct int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE planner_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_goals" ON planner_goals;
CREATE POLICY "select_own_goals" ON planner_goals FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_goals" ON planner_goals;
CREATE POLICY "insert_own_goals" ON planner_goals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_goals" ON planner_goals;
CREATE POLICY "update_own_goals" ON planner_goals FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_goals" ON planner_goals;
CREATE POLICY "delete_own_goals" ON planner_goals FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_goals_user_type ON planner_goals(user_id, goal_type, status);


-- ############################################################
-- ## 20260802090000_create_mentor_tables.sql
-- ############################################################
-- ============================================================
-- AI Mentor: persistent chat threads + messages
-- The mentor answers using the student's real preparation data
-- (planner, backlog, chapters, stats, recovery, focus sessions).
-- ============================================================

create table if not exists public.mentor_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default 'Mentor chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mentor_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.mentor_threads(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mentor_threads_user_idx on public.mentor_threads (user_id, updated_at desc);
create index if not exists mentor_threads_created_idx on public.mentor_threads (created_at);
create index if not exists mentor_messages_user_idx on public.mentor_messages (user_id);
create index if not exists mentor_messages_thread_idx on public.mentor_messages (thread_id, created_at);
create index if not exists mentor_messages_created_idx on public.mentor_messages (created_at);

alter table public.mentor_threads enable row level security;
alter table public.mentor_messages enable row level security;

drop policy if exists "mentor_threads_select_own" on public.mentor_threads;
create policy "mentor_threads_select_own" on public.mentor_threads
  for select using (auth.uid() = user_id);
drop policy if exists "mentor_threads_insert_own" on public.mentor_threads;
create policy "mentor_threads_insert_own" on public.mentor_threads
  for insert with check (auth.uid() = user_id);
drop policy if exists "mentor_threads_update_own" on public.mentor_threads;
create policy "mentor_threads_update_own" on public.mentor_threads
  for update using (auth.uid() = user_id);
drop policy if exists "mentor_threads_delete_own" on public.mentor_threads;
create policy "mentor_threads_delete_own" on public.mentor_threads
  for delete using (auth.uid() = user_id);

drop policy if exists "mentor_messages_select_own" on public.mentor_messages;
create policy "mentor_messages_select_own" on public.mentor_messages
  for select using (auth.uid() = user_id);
drop policy if exists "mentor_messages_insert_own" on public.mentor_messages;
create policy "mentor_messages_insert_own" on public.mentor_messages
  for insert with check (auth.uid() = user_id);
drop policy if exists "mentor_messages_delete_own" on public.mentor_messages;
create policy "mentor_messages_delete_own" on public.mentor_messages
  for delete using (auth.uid() = user_id);

-- Keep thread.updated_at fresh so threads sort by last activity
create or replace function public.touch_mentor_thread()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.mentor_threads set updated_at = now() where id = new.thread_id;
  return new;
end $$;

drop trigger if exists mentor_messages_touch_thread on public.mentor_messages;
create trigger mentor_messages_touch_thread
  after insert on public.mentor_messages
  for each row execute function public.touch_mentor_thread();



-- ############################################################
-- ## 20260802110000_create_mock_test_results.sql
-- ############################################################
-- ============================================================
-- Mock test / PYQ attempt tracking
-- Feeds the AI Mentor's mock analysis (scores, subject-wise
-- marks, trend) and the PYQ Tracker page.
-- ============================================================

create table if not exists public.mock_test_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  test_name text not null,
  subject text,
  total_marks numeric not null check (total_marks > 0),
  obtained_marks numeric not null check (obtained_marks >= 0),
  test_date date not null default current_date,
  weak_chapters text[] not null default '{}',
  strong_chapters text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists mock_test_results_user_idx on public.mock_test_results (user_id, test_date desc);

alter table public.mock_test_results enable row level security;

drop policy if exists "mock_test_results_select_own" on public.mock_test_results;
create policy "mock_test_results_select_own" on public.mock_test_results
  for select using (auth.uid() = user_id);
drop policy if exists "mock_test_results_insert_own" on public.mock_test_results;
create policy "mock_test_results_insert_own" on public.mock_test_results
  for insert with check (auth.uid() = user_id);
drop policy if exists "mock_test_results_delete_own" on public.mock_test_results;
create policy "mock_test_results_delete_own" on public.mock_test_results
  for delete using (auth.uid() = user_id);



-- ############################################################
-- ## 20260802120000_create_mentor_memory.sql
-- ############################################################
-- ============================================================
-- AI Mentor long-term conversation memory
-- Stores durable facts about the student (weaknesses, goals,
-- preferences, study habits, recurring problems) extracted
-- from mentor conversations.
-- ============================================================

create table if not exists public.mentor_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null check (category in ('weakness', 'goal', 'preference', 'study_habit', 'problem')),
  key text not null,
  value text not null,
  importance integer not null default 3 check (importance between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category, key)
);

create index if not exists mentor_memory_user_idx on public.mentor_memory (user_id, importance desc, updated_at desc);

alter table public.mentor_memory enable row level security;

drop policy if exists "mentor_memory_select_own" on public.mentor_memory;
create policy "mentor_memory_select_own" on public.mentor_memory
  for select using (auth.uid() = user_id);
drop policy if exists "mentor_memory_insert_own" on public.mentor_memory;
create policy "mentor_memory_insert_own" on public.mentor_memory
  for insert with check (auth.uid() = user_id);
drop policy if exists "mentor_memory_update_own" on public.mentor_memory;
create policy "mentor_memory_update_own" on public.mentor_memory
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "mentor_memory_delete_own" on public.mentor_memory;
create policy "mentor_memory_delete_own" on public.mentor_memory
  for delete using (auth.uid() = user_id);

create or replace function public.touch_mentor_memory()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mentor_memory_touch on public.mentor_memory;
create trigger mentor_memory_touch
  before update on public.mentor_memory
  for each row execute function public.touch_mentor_memory();



-- ############################################################
-- ## 20260802130000_create_mentor_daily_checkins.sql
-- ############################################################
-- ============================================================
-- AI Mentor daily check-ins
-- One personalized check-in per user per day, generated from
-- the student's real data (planner, backlog, streak, mocks).
-- ============================================================

create table if not exists public.mentor_daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  message text not null,
  completed_tasks jsonb not null default '[]'::jsonb,
  missed_tasks jsonb not null default '[]'::jsonb,
  focus_score integer check (focus_score between 0 and 100),
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists mentor_daily_checkins_user_idx on public.mentor_daily_checkins (user_id, date desc);

alter table public.mentor_daily_checkins enable row level security;

drop policy if exists "mentor_daily_checkins_select_own" on public.mentor_daily_checkins;
create policy "mentor_daily_checkins_select_own" on public.mentor_daily_checkins
  for select using (auth.uid() = user_id);
drop policy if exists "mentor_daily_checkins_insert_own" on public.mentor_daily_checkins;
create policy "mentor_daily_checkins_insert_own" on public.mentor_daily_checkins
  for insert with check (auth.uid() = user_id);
drop policy if exists "mentor_daily_checkins_update_own" on public.mentor_daily_checkins;
create policy "mentor_daily_checkins_update_own" on public.mentor_daily_checkins
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);



-- ############################################################
-- ## 20260802150000_create_profile_on_signup.sql
-- ############################################################
/*
# Auto-create profiles row on signup

## Problem
New signups never got a `profiles` row: no trigger created it and the client
only ever SELECTed. Onboarding then silently failed to save (UPDATE matched 0
rows) and route guards treated the missing profile as "not onboarded",
skipping onboarding entirely.

## Fix
After INSERT on auth.users (i.e. every new signup, including email-pending
ones), create a minimal profiles row. The full_name comes from
raw_user_meta_data.full_name, which the signup form sends via
`options.data.full_name`. Existing rows are never touched (ON CONFLICT DO
NOTHING) â€” existing users keep all their data.

## Notes
- Runs with SECURITY DEFINER so it can insert into profiles despite RLS.
- A client-side safety net (db.ensureProfile in AuthContext) covers users who
  signed up before this migration was applied.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    display_name,
    onboarding_completed,
    onboarding_step
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    false,
    0
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_on_new_user ON auth.users;
CREATE TRIGGER trg_profile_on_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();



-- ############################################################
-- ## 20260802160000_onboarding_v2_profile_columns.sql
-- ############################################################
/*
# Onboarding v2 profile columns

## Purpose
The v2 onboarding wizard collects richer profile data than the original flow.
These columns are purely ADDITIVE â€” existing rows and columns are untouched,
so returning users keep all their data. Every answer from the wizard has a
dedicated column (plus onboarding_data stores the full wizard state so an
interrupted onboarding can resume exactly where it left off).

## New profiles columns
- age (int)                 â€” student age
- current_level (text)      â€” beginner | average | advanced | not_sure
- coaching (text)           â€” none | pw | allen | aakash | fiitjee | vibrant |
                              motion | resonance | unacademy | self_study | other
- wake_up_time (text)       â€” HH:MM
- sleep_time (text)         â€” HH:MM
- subjects (text[])         â€” subjects selected for the target exam
- primary_goal (text)       â€” air_under_100 | air_under_1000 | college |
                              marks | custom
- custom_goal (text)        â€” free-text goal when primary_goal = custom
- preferred_language (text) â€” en | hi | hinglish | bn | ta | te | mr | gu | kn |
                              ml | pa | ur
- mentor_tone (text)        â€” friendly | strict | balanced

## New backlog_items columns
- pending_pyqs (int)        â€” PYQ sets remaining for this backlog item
- revision_pending (int)    â€” revision rounds pending for this backlog item
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS age integer;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS current_level text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS coaching text NOT NULL DEFAULT 'none';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS wake_up_time text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS sleep_time text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subjects text[] NOT NULL DEFAULT '{}';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS primary_goal text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS custom_goal text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_language text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS mentor_tone text;

ALTER TABLE backlog_items
  ADD COLUMN IF NOT EXISTS pending_pyqs integer NOT NULL DEFAULT 0;

ALTER TABLE backlog_items
  ADD COLUMN IF NOT EXISTS revision_pending integer NOT NULL DEFAULT 0;



