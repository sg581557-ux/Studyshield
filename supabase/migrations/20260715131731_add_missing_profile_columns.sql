/*
# Add missing columns to profiles table

## Problem
The Onboarding "Complete Setup" and Profile page save fields like
`board`, `coaching_type`, `full_name`, `exam_year`, `phone`, `bio`,
`study_time` that do not exist as columns on the `profiles` table,
causing "Could not find the 'X' column of 'profiles' in the schema cache" errors.

## Changes
Adds the missing columns. All are nullable (except where a default makes
sense) so existing rows remain valid. No data is lost; existing columns
are untouched.

## New columns
- board            text       — student's board (CBSE, ICSE, State Board, …)
- coaching_type    text       — Self Study / Online / Offline / Hybrid / Test Series
- full_name        text       — user's display name ( mirrors `display_name` / `name` )
- exam_year        text       — target exam year (stored as text to support "Custom Year")
- phone            text       — contact phone number
- bio              text       — short user bio
- study_time       text       — preferred study session (Morning / Afternoon / Evening / Night)
- stream           text       — academic stream (Science, Commerce, Arts, …)
- class            text       — student's class / grade
- school_name      text       — school or college name
- city             text       — user's city
- state            text       — user's state
- country          text       — user's country
- profile_photo    text       — URL to profile photo ( distinct from legacy photo_url )
- dream_college    text       — target college / university
- dream_branch     text       — target branch / major
- preferred_study_time text   — preferred time-of-day for studying ( alias of study_time )

## Security
No RLS policy changes — existing policies already cover the profiles
table and new columns inherit the same row-level access rules.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'board') THEN
    ALTER TABLE profiles ADD COLUMN board text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'coaching_type') THEN
    ALTER TABLE profiles ADD COLUMN coaching_type text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
    ALTER TABLE profiles ADD COLUMN full_name text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'exam_year') THEN
    ALTER TABLE profiles ADD COLUMN exam_year text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
    ALTER TABLE profiles ADD COLUMN phone text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio') THEN
    ALTER TABLE profiles ADD COLUMN bio text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'study_time') THEN
    ALTER TABLE profiles ADD COLUMN study_time text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'stream') THEN
    ALTER TABLE profiles ADD COLUMN stream text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'class') THEN
    ALTER TABLE profiles ADD COLUMN class text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'school_name') THEN
    ALTER TABLE profiles ADD COLUMN school_name text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'city') THEN
    ALTER TABLE profiles ADD COLUMN city text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'state') THEN
    ALTER TABLE profiles ADD COLUMN state text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'country') THEN
    ALTER TABLE profiles ADD COLUMN country text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'profile_photo') THEN
    ALTER TABLE profiles ADD COLUMN profile_photo text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'dream_college') THEN
    ALTER TABLE profiles ADD COLUMN dream_college text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'dream_branch') THEN
    ALTER TABLE profiles ADD COLUMN dream_branch text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'preferred_study_time') THEN
    ALTER TABLE profiles ADD COLUMN preferred_study_time text;
  END IF;
END $$;