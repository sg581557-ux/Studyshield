/*
# Create user profiles table for StudyShield

1. New Tables
- `profiles`
  - `id` (uuid, primary key, references auth.users)
  - `name` (text, display name)
  - `email` (text, unique)
  - `photo_url` (text, nullable, profile picture URL)
  - `exam_id` (text, selected exam from catalog, e.g. 'jee-main')
  - `exam_goal` (text, human-readable exam name, e.g. 'JEE Main')
  - `target_year` (text, e.g. 'JEE 2028')
  - `onboarding_complete` (boolean, default false)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Security
- Enable RLS on `profiles`.
- Each authenticated user can only read, insert, update, and delete their own profile row.
- Owner is determined by `auth.uid() = id`.
- The `id` column defaults to `auth.uid()` so inserts from authenticated sessions work even when the client omits it.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text UNIQUE NOT NULL,
  photo_url text,
  exam_id text,
  exam_goal text,
  target_year text,
  onboarding_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile"
ON profiles FOR DELETE
TO authenticated
USING (auth.uid() = id);
