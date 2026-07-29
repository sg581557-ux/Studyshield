/*
# StudyShield — Add is_admin column + full schema

Adds is_admin to profiles if missing, then creates all other tables.
*/

-- Add is_admin column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_admin') THEN
    ALTER TABLE profiles ADD COLUMN is_admin boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Ensure all other columns exist on profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'display_name') THEN
    ALTER TABLE profiles ADD COLUMN display_name text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'target_exam') THEN
    ALTER TABLE profiles ADD COLUMN target_exam text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'target_year') THEN
    ALTER TABLE profiles ADD COLUMN target_year text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'daily_goal_hours') THEN
    ALTER TABLE profiles ADD COLUMN daily_goal_hours numeric NOT NULL DEFAULT 4;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'study_goal') THEN
    ALTER TABLE profiles ADD COLUMN study_goal text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'theme') THEN
    ALTER TABLE profiles ADD COLUMN theme text NOT NULL DEFAULT 'light';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE profiles ADD COLUMN avatar_url text DEFAULT '';
  END IF;
END $$;

-- Repolicy profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- TODOS
CREATE TABLE IF NOT EXISTS todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  due_date date,
  category text DEFAULT '',
  repeat text DEFAULT 'none',
  completed boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_todos_user ON todos (user_id);
DROP POLICY IF EXISTS "select_own_todos" ON todos;
CREATE POLICY "select_own_todos" ON todos FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_todos" ON todos;
CREATE POLICY "insert_own_todos" ON todos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_todos" ON todos;
CREATE POLICY "update_own_todos" ON todos FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_todos" ON todos;
CREATE POLICY "delete_own_todos" ON todos FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- MODULES
CREATE TABLE IF NOT EXISTS modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_modules_user ON modules (user_id);
DROP POLICY IF EXISTS "select_own_modules" ON modules;
CREATE POLICY "select_own_modules" ON modules FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_modules" ON modules;
CREATE POLICY "insert_own_modules" ON modules FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_modules" ON modules;
CREATE POLICY "update_own_modules" ON modules FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_modules" ON modules;
CREATE POLICY "delete_own_modules" ON modules FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- CHAPTERS
CREATE TABLE IF NOT EXISTS chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE,
  name text NOT NULL,
  exercises_total integer NOT NULL DEFAULT 0,
  exercises_done integer NOT NULL DEFAULT 0,
  dpp_total integer NOT NULL DEFAULT 0,
  dpp_done integer NOT NULL DEFAULT 0,
  pyq_total integer NOT NULL DEFAULT 0,
  pyq_done integer NOT NULL DEFAULT 0,
  mock_total integer NOT NULL DEFAULT 0,
  mock_done integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_chapters_user ON chapters (user_id);
CREATE INDEX IF NOT EXISTS idx_chapters_module ON chapters (module_id);
DROP POLICY IF EXISTS "select_own_chapters" ON chapters;
CREATE POLICY "select_own_chapters" ON chapters FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_chapters" ON chapters;
CREATE POLICY "insert_own_chapters" ON chapters FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_chapters" ON chapters;
CREATE POLICY "update_own_chapters" ON chapters FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_chapters" ON chapters;
CREATE POLICY "delete_own_chapters" ON chapters FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- BACKLOG ITEMS
CREATE TABLE IF NOT EXISTS backlog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  chapter text NOT NULL,
  module text DEFAULT '',
  total_questions integer NOT NULL DEFAULT 0,
  completed_questions integer NOT NULL DEFAULT 0,
  deadline date,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE backlog_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_backlog_user ON backlog_items (user_id);
CREATE INDEX IF NOT EXISTS idx_backlog_status ON backlog_items (status);
DROP POLICY IF EXISTS "select_own_backlog" ON backlog_items;
CREATE POLICY "select_own_backlog" ON backlog_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_backlog" ON backlog_items;
CREATE POLICY "insert_own_backlog" ON backlog_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_backlog" ON backlog_items;
CREATE POLICY "update_own_backlog" ON backlog_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_backlog" ON backlog_items;
CREATE POLICY "delete_own_backlog" ON backlog_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- FORMULAS
CREATE TABLE IF NOT EXISTS formulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  chapter text NOT NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  image_url text DEFAULT '',
  pdf_url text DEFAULT '',
  bookmarked boolean NOT NULL DEFAULT false,
  favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE formulas ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_formulas_user ON formulas (user_id);
DROP POLICY IF EXISTS "select_own_formulas" ON formulas;
CREATE POLICY "select_own_formulas" ON formulas FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_formulas" ON formulas;
CREATE POLICY "insert_own_formulas" ON formulas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_formulas" ON formulas;
CREATE POLICY "update_own_formulas" ON formulas FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_formulas" ON formulas;
CREATE POLICY "delete_own_formulas" ON formulas FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RESOURCES
CREATE TABLE IF NOT EXISTS resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'pdf',
  subject text DEFAULT '',
  chapter text DEFAULT '',
  url text NOT NULL,
  size integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_resources_user ON resources (user_id);
DROP POLICY IF EXISTS "select_own_resources" ON resources;
CREATE POLICY "select_own_resources" ON resources FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_resources" ON resources;
CREATE POLICY "insert_own_resources" ON resources FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_resources" ON resources;
CREATE POLICY "update_own_resources" ON resources FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_resources" ON resources;
CREATE POLICY "delete_own_resources" ON resources FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- STUDY SESSIONS
CREATE TABLE IF NOT EXISTS study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT '25/5',
  duration_minutes integer NOT NULL DEFAULT 25,
  completed boolean NOT NULL DEFAULT false,
  task text DEFAULT '',
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sessions_user ON study_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON study_sessions (session_date);
DROP POLICY IF EXISTS "select_own_sessions" ON study_sessions;
CREATE POLICY "select_own_sessions" ON study_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_sessions" ON study_sessions;
CREATE POLICY "insert_own_sessions" ON study_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_sessions" ON study_sessions;
CREATE POLICY "update_own_sessions" ON study_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_sessions" ON study_sessions;
CREATE POLICY "delete_own_sessions" ON study_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text DEFAULT '',
  type text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications (user_id);
DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);
