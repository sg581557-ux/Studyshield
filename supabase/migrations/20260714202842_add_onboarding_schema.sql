/*
# StudyShield — Onboarding schema (retry)

1. Modified Tables
- `profiles` — add onboarding_completed, onboarding_step, onboarding_data
2. New Tables
- `user_chapters` — per-chapter status from onboarding
3. Security
- RLS on user_chapters, owner-scoped
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_step') THEN
    ALTER TABLE profiles ADD COLUMN onboarding_step integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_data') THEN
    ALTER TABLE profiles ADD COLUMN onboarding_data jsonb;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  exam text NOT NULL,
  subject text NOT NULL,
  chapter text NOT NULL,
  status text NOT NULL DEFAULT 'not_started',
  lectures_remaining integer NOT NULL DEFAULT 0,
  questions_remaining integer NOT NULL DEFAULT 0,
  revision_pending integer NOT NULL DEFAULT 0,
  confidence integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE user_chapters ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_user_chapters_user ON user_chapters (user_id);
CREATE INDEX IF NOT EXISTS idx_user_chapters_exam ON user_chapters (exam);
CREATE INDEX IF NOT EXISTS idx_user_chapters_subject ON user_chapters (subject);

DROP POLICY IF EXISTS "select_own_user_chapters" ON user_chapters;
CREATE POLICY "select_own_user_chapters" ON user_chapters FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_user_chapters" ON user_chapters;
CREATE POLICY "insert_own_user_chapters" ON user_chapters FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_user_chapters" ON user_chapters;
CREATE POLICY "update_own_user_chapters" ON user_chapters FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_user_chapters" ON user_chapters;
CREATE POLICY "delete_own_user_chapters" ON user_chapters FOR DELETE TO authenticated USING (auth.uid() = user_id);
