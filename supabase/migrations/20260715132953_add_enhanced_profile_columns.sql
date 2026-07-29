/*
# Add enhanced profile columns and admin user management fields

## Purpose
Add columns needed by the premium Profile page (dob, gender, dream_career, etc.)
and admin user management fields (is_premium, is_banned, banned_at, banned_reason).

## New columns on profiles table (17)

Profile enhancement columns:
- date_of_birth   date       — user's date of birth
- gender          text       — male / female / other / prefer_not_to_say
- dream_career    text       — target career
- weekly_goal_days integer   — days per week the user aims to study (1-7)
- longest_streak  integer    — user's longest study streak
- revision_count  integer    — total revisions completed
- mock_tests_count integer   — total mock tests taken
- achievements    jsonb      — array of achievement objects
- motivation_quote text      — user's personal motivation quote

Admin management columns:
- is_premium      boolean    — whether user has premium access
- is_banned       boolean    — whether user is banned
- banned_at       timestamptz — when the user was banned
- banned_reason   text       — reason for ban
- last_active     timestamptz — last activity timestamp
- device_info     jsonb      — device/browser info for admin dashboard
- reset_at        timestamptz — when progress was last reset by admin

## Security
No RLS policy changes needed — existing policies cover new columns.
is_premium and is_banned are only writable by admins via the edge function
(service role bypasses RLS). Users can update their own profile fields but
not these admin-controlled fields (enforced in the edge function, not RLS,
since RLS can't distinguish individual columns).

## Important Notes
1. All columns are nullable with safe defaults — existing rows remain valid.
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