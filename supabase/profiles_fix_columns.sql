-- ============================================================
-- StudyShield — profiles table: add missing columns
-- Project: htnyxravjtoueqxdyhha (Study Shield)
--
-- WHY: The app (src/services/db.ts completeOnboarding, src/pages/Profile.tsx,
-- src/pages/SettingsPage.tsx, src/lib/auth.tsx, admin-api edge function)
-- INSERTS/UPDATES columns that the applied migrations never added to
-- `profiles`. Supabase client aborts with
--   "A field in the save doesn't exist in the profiles table."
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query ->
--   paste -> Run. Safe to run twice (all statements use IF NOT EXISTS).
-- Does NOT touch existing rows. No DROP, no recreate.
--
-- Column list, types and defaults are lifted verbatim from the canonical
-- migrations (20260715132953, 20260719190455, 20260802160000) plus the
-- app-only columns that no migration ever created.
-- ============================================================

-- ── Enhanced profile / admin columns (migration 20260715132953) ────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dream_career text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weekly_goal_days integer DEFAULT 5;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longest_streak integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS revision_count integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mock_tests_count integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS achievements jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS motivation_quote text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_reason text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS device_info jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reset_at timestamptz;

-- ── Coaching / school / planning (migration 20260719190455) ────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coaching_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coaching_name text DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coaching_is_live boolean NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coaching_days text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coaching_start text DEFAULT '09:00';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coaching_end text DEFAULT '12:00';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lecture_duration_min integer NOT NULL DEFAULT 120;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS revision_time text DEFAULT 'evening';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS attends_school boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS school_board text DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS school_class text DEFAULT '';

-- ── Onboarding v2 (migration 20260802160000) ───────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_level text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coaching text NOT NULL DEFAULT 'none';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wake_up_time text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sleep_time text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subjects text[] NOT NULL DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS primary_goal text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_goal text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mentor_tone text;

-- ── Columns the app expects but NO migration ever created ──────────────────
-- study_mode:       src/pages/SettingsPage.tsx writes it; Profile interface has it
-- current_streak:   src/pages/Profile.tsx reads it (pnum)
-- study_hours:      src/pages/Profile.tsx reads it (pnum)
-- modules_completed:src/pages/Profile.tsx reads it (pnum)
-- xp:               DashboardHome / Layout / dashboard Profile / mentor.ts read it
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS study_mode text NOT NULL DEFAULT 'balanced';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS study_hours integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS modules_completed integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0;

-- ── Sanity: verify against the app's expected schema (all must return OK) ──
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'profiles' ORDER BY ordinal_position;
