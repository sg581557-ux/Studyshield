/*
# StudyShield Full Schema v2

1. New Tables
- `profiles` — user profiles with onboarding data, admin flag, exam targets
- `todos` — user todo items with priority, status, tags
- `backlog_items` — study backlog with chapter linkage, priority, deadlines
- `formulas` — user's custom formulas + bookmark/favorite/pin tracking
- `resources` — study resources (PDF, video, link, note)
- `study_sessions` — study time tracking with subject and session type
- `notifications` — in-app notifications
- `user_chapters` — per-user chapter status tracking with confidence levels

2. Security
- RLS enabled on ALL tables
- All tables are owner-scoped (user_id = auth.uid())
- 4 CRUD policies per table (SELECT, INSERT, UPDATE, DELETE)
- No FOR ALL policies — each verb is separate

3. Important Notes
- `profiles.id` matches `auth.users.id` (not gen_random_uuid)
- `user_id` columns have `DEFAULT auth.uid()` so inserts work without explicit user_id
- `onboarding_data` is JSONB for flexible wizard state storage
- `target_exam` is an array to support multi-exam students
- `user_chapters` has a unique constraint on (user_id, exam, subject, chapter) for upsert support
- Indexes on user_id for all tables for query performance
*/

-- ═══════════════════════════════════════════════════════════════
-- PROFILES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  full_name text,
  avatar_url text,
  phone text,
  bio text,
  target_exam text[],
  study_time text,
  board text,
  coaching_type text,
  exam_year int,
  is_admin boolean NOT NULL DEFAULT false,
  onboarding_completed boolean NOT NULL DEFAULT false,
  onboarding_step int NOT NULL DEFAULT 0,
  onboarding_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- ═══════════════════════════════════════════════════════════════
-- TODOS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
  due_date date,
  tags text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_todos" ON todos;
CREATE POLICY "select_own_todos" ON todos FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_todos" ON todos;
CREATE POLICY "insert_own_todos" ON todos FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_todos" ON todos;
CREATE POLICY "update_own_todos" ON todos FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_todos" ON todos;
CREATE POLICY "delete_own_todos" ON todos FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);

-- ═══════════════════════════════════════════════════════════════
-- BACKLOG_ITEMS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS backlog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  subject text NOT NULL DEFAULT '',
  chapter text NOT NULL DEFAULT '',
  topic text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
  estimated_time int NOT NULL DEFAULT 60,
  deadline date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE backlog_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_backlog" ON backlog_items;
CREATE POLICY "select_own_backlog" ON backlog_items FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_backlog" ON backlog_items;
CREATE POLICY "insert_own_backlog" ON backlog_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_backlog" ON backlog_items;
CREATE POLICY "update_own_backlog" ON backlog_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_backlog" ON backlog_items;
CREATE POLICY "delete_own_backlog" ON backlog_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_backlog_user_id ON backlog_items(user_id);

-- ═══════════════════════════════════════════════════════════════
-- FORMULAS (user custom formulas + bookmark tracking)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS formulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  formula text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  chapter text NOT NULL DEFAULT '',
  exam text NOT NULL DEFAULT '',
  notes text,
  is_favorite boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  view_count int NOT NULL DEFAULT 0,
  last_viewed timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE formulas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_formulas" ON formulas;
CREATE POLICY "select_own_formulas" ON formulas FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_formulas" ON formulas;
CREATE POLICY "insert_own_formulas" ON formulas FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_formulas" ON formulas;
CREATE POLICY "update_own_formulas" ON formulas FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_formulas" ON formulas;
CREATE POLICY "delete_own_formulas" ON formulas FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_formulas_user_id ON formulas(user_id);

-- ═══════════════════════════════════════════════════════════════
-- RESOURCES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'note' CHECK (type IN ('pdf', 'video', 'image', 'link', 'note')),
  url text NOT NULL DEFAULT '',
  subject text,
  chapter text,
  tags text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_resources" ON resources;
CREATE POLICY "select_own_resources" ON resources FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_resources" ON resources;
CREATE POLICY "insert_own_resources" ON resources FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_resources" ON resources;
CREATE POLICY "update_own_resources" ON resources FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_resources" ON resources;
CREATE POLICY "delete_own_resources" ON resources FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_resources_user_id ON resources(user_id);

-- ═══════════════════════════════════════════════════════════════
-- STUDY_SESSIONS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL DEFAULT '',
  duration int NOT NULL DEFAULT 0,
  session_type text NOT NULL DEFAULT 'pomodoro' CHECK (session_type IN ('pomodoro', 'focus', 'custom')),
  completed boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sessions" ON study_sessions;
CREATE POLICY "select_own_sessions" ON study_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_sessions" ON study_sessions;
CREATE POLICY "insert_own_sessions" ON study_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_sessions" ON study_sessions;
CREATE POLICY "update_own_sessions" ON study_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_sessions" ON study_sessions;
CREATE POLICY "delete_own_sessions" ON study_sessions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON study_sessions(user_id);

-- ═══════════════════════════════════════════════════════════════
-- NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- ═══════════════════════════════════════════════════════════════
-- USER_CHAPTERS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  exam text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  chapter text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'not-started' CHECK (status IN ('not-started', 'in-progress', 'completed', 'needs-review')),
  confidence int NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  last_studied timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, exam, subject, chapter)
);

ALTER TABLE user_chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_chapters" ON user_chapters;
CREATE POLICY "select_own_chapters" ON user_chapters FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_chapters" ON user_chapters;
CREATE POLICY "insert_own_chapters" ON user_chapters FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_chapters" ON user_chapters;
CREATE POLICY "update_own_chapters" ON user_chapters FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_chapters" ON user_chapters;
CREATE POLICY "delete_own_chapters" ON user_chapters FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_chapters_user_id ON user_chapters(user_id);
CREATE INDEX IF NOT EXISTS idx_user_chapters_subject ON user_chapters(subject);
