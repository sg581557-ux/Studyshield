/*
# Create admin dashboard support tables

## Purpose
Tables to power the Developer Dashboard: feature analytics, study analytics,
bug reports, feedback, announcements, admin action logs, notifications,
and user activity tracking.

## New Tables (7)
1. feature_usage — tracks feature usage per user per day
2. bug_reports — user-submitted bug reports with status
3. feedback — user feedback with rating, category, searchable
4. announcements — admin-created push/in-app announcements with targeting
5. admin_logs — audit trail for all admin actions
6. user_notifications — in-app notifications for users
7. user_activity — tracks online status, last active, device info

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