/*
# Create focus_sessions table (single-tenant, no auth)

1. New Tables
- `focus_sessions`
  - `id` (uuid, primary key)
  - `duration_minutes` (integer, not null) — planned session length
  - `completed` (boolean, default false) — whether the session finished without stopping early
  - `strict_mode` (boolean, default false) — whether strict mode was on
  - `started_at` (timestamptz, default now())
  - `completed_at` (timestamptz, nullable) — when the session ended
2. Security
- Enable RLS on `focus_sessions`.
- Allow anon + authenticated CRUD because the data is intentionally shared/public (single-tenant, no sign-in).
3. Indexes
- Index on `started_at` descending for history queries.
*/

CREATE TABLE IF NOT EXISTS focus_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duration_minutes integer NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  strict_mode boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_focus_sessions" ON focus_sessions;
CREATE POLICY "anon_select_focus_sessions" ON focus_sessions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_focus_sessions" ON focus_sessions;
CREATE POLICY "anon_insert_focus_sessions" ON focus_sessions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_focus_sessions" ON focus_sessions;
CREATE POLICY "anon_update_focus_sessions" ON focus_sessions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_focus_sessions" ON focus_sessions;
CREATE POLICY "anon_delete_focus_sessions" ON focus_sessions FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_started_at ON focus_sessions (started_at DESC);
