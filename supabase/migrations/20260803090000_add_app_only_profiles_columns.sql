-- Add the 5 app-only `profiles` columns that exist in NO earlier migration.
--
-- Why these are missing:
--   `supabase migration push` only executes the migrations in this folder.
--   The app writes five columns that were never added by any migration file:
--     study_mode       - written by SettingsPage.tsx, dashboard/Settings.tsx
--                        and db.completeOnboarding() (payload always sets
--                        study_mode = "balanced")
--     current_streak   - read by Profile.tsx; part of the Profile interface
--     study_hours      - read by Profile.tsx; part of the Profile interface
--     modules_completed- read by Profile.tsx; part of the Profile interface
--     xp               - read by mentor.ts and the dashboard; part of the
--                        Profile interface
--   Without them, PostgREST rejects the save with PGRST204 / 42703:
--     "A field in the save doesn't exist in the profiles table"
--
-- Canonical definitions come from the frontend Profile interface
-- (src/lib/types.ts) and the save payloads in src/services/db.ts:
--   study_mode        -> StudyMode string union ("balanced" | ...)
--   current_streak    -> number (integer, default 0)
--   study_hours       -> number (integer, default 0)
--   modules_completed -> number (integer, default 0)
--   xp                -> number (integer, default 0)
--
-- Safety: IF NOT EXISTS + plain ADD COLUMN with NOT NULL DEFAULT. Existing
-- rows keep their data; new defaults apply to any rows lacking the column.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS study_mode text NOT NULL DEFAULT 'balanced';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS study_hours integer NOT NULL DEFAULT 0;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS modules_completed integer NOT NULL DEFAULT 0;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0;
