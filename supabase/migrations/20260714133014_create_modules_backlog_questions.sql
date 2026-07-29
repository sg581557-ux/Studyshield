/*
# Create modules, backlog_items, and questions tables (multi-user, auth-scoped)

1. New Tables
- `modules`
  - id (uuid PK)
  - user_id (uuid, defaults to auth.uid(), FK auth.users)
  - name (text, not null)
  - code (text, nullable — e.g. "CS101")
  - total_topics (int, default 0)
  - completed_topics (int, default 0)
  - color (text, default 'brand' — for UI accent)
  - created_at (timestamptz, default now())
- `backlog_items`
  - id (uuid PK)
  - user_id (uuid, defaults to auth.uid(), FK auth.users)
  - title (text, not null)
  - module_id (uuid, nullable, FK modules — optional link)
  - priority (text, default 'medium' — low/medium/high)
  - status (text, default 'todo' — todo/doing/done)
  - due_date (date, nullable)
  - created_at (timestamptz, default now())
- `questions`
  - id (uuid PK)
  - user_id (uuid, defaults to auth.uid(), FK auth.users)
  - module_id (uuid, nullable, FK modules)
  - question (text, not null)
  - answer (text, nullable)
  - difficulty (text, default 'medium' — easy/medium/hard)
  - status (text, default 'unanswered' — unanswered/answered/reviewing)
  - created_at (timestamptz, default now())
2. Security
- RLS enabled on all three tables.
- Owner-scoped CRUD: each authenticated user can only access their own rows.
- user_id defaults to auth.uid() so inserts omitting user_id still pass WITH CHECK.
3. Indexes
- modules: user_id
- backlog_items: user_id, status, module_id
- questions: user_id, status, module_id
*/

-- Modules
CREATE TABLE IF NOT EXISTS modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  total_topics integer NOT NULL DEFAULT 0,
  completed_topics integer NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT 'brand',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_modules_user_id ON modules (user_id);

DROP POLICY IF EXISTS "select_own_modules" ON modules;
CREATE POLICY "select_own_modules" ON modules FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_modules" ON modules;
CREATE POLICY "insert_own_modules" ON modules FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_modules" ON modules;
CREATE POLICY "update_own_modules" ON modules FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_modules" ON modules;
CREATE POLICY "delete_own_modules" ON modules FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Backlog items
CREATE TABLE IF NOT EXISTS backlog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  module_id uuid REFERENCES modules(id) ON DELETE SET NULL,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'todo',
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE backlog_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_backlog_user_id ON backlog_items (user_id);
CREATE INDEX IF NOT EXISTS idx_backlog_status ON backlog_items (status);
CREATE INDEX IF NOT EXISTS idx_backlog_module_id ON backlog_items (module_id);

DROP POLICY IF EXISTS "select_own_backlog" ON backlog_items;
CREATE POLICY "select_own_backlog" ON backlog_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_backlog" ON backlog_items;
CREATE POLICY "insert_own_backlog" ON backlog_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_backlog" ON backlog_items;
CREATE POLICY "update_own_backlog" ON backlog_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_backlog" ON backlog_items;
CREATE POLICY "delete_own_backlog" ON backlog_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Questions
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id uuid REFERENCES modules(id) ON DELETE SET NULL,
  question text NOT NULL,
  answer text,
  difficulty text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'unanswered',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_questions_user_id ON questions (user_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions (status);
CREATE INDEX IF NOT EXISTS idx_questions_module_id ON questions (module_id);

DROP POLICY IF EXISTS "select_own_questions" ON questions;
CREATE POLICY "select_own_questions" ON questions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_questions" ON questions;
CREATE POLICY "insert_own_questions" ON questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_questions" ON questions;
CREATE POLICY "update_own_questions" ON questions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_questions" ON questions;
CREATE POLICY "delete_own_questions" ON questions FOR DELETE TO authenticated USING (auth.uid() = user_id);
