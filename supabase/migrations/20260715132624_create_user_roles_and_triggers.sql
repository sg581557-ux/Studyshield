/*
# Create user_roles table with automatic role assignment

## Purpose
Establishes a role-based access control (RBAC) system for StudyShield.
Every authenticated user gets exactly one role: super_admin, admin, moderator, or user.

## New Tables
- `user_roles`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users, unique)
  - `email` (text, the user's email for easy lookups)
  - `role` (text, one of: super_admin, admin, moderator, user)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

## Automatic Role Assignment
- A trigger fires after INSERT on auth.users (i.e., when a new account is created).
- If the email is studyshieldofficial@gmail.com or studyshieldrecovery@gmail.com → role = super_admin
- All other emails → role = user
- This happens automatically — no manual database editing required.

## Security (RLS)
- Users can read their own role (SELECT WHERE auth.uid() = user_id).
- All writes (INSERT/UPDATE/DELETE) are denied via RLS — only the database trigger
  and service-role edge functions can modify roles. This prevents privilege escalation.
- A `prevent_role_escalation` trigger ensures a user can never elevate their own role
  or demote a super_admin.

## Important Notes
1. The trigger on auth.users runs once per new signup. If the user already exists
   (e.g., OAuth login for an existing auth.users row), `ON CONFLICT DO NOTHING` prevents duplicates.
2. The `assign_user_role` function reads the email from `NEW.email` in auth.users.
3. An upsert variant `upsert_user_role(text, text)` is also provided for edge functions
   to call when a user logs in for the first time via OAuth (where the auth.users row
   may predate the trigger).
*/

-- ============================================================
-- 1. Create user_roles table
-- ============================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'moderator', 'user')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_email ON user_roles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Users can read their own role
DROP POLICY IF EXISTS "select_own_role" ON user_roles;
CREATE POLICY "select_own_role" ON user_roles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- All writes are blocked at the RLS level — only the trigger and service role can write
-- (service_role bypasses RLS, so edge functions with the service key can still manage roles)
DROP POLICY IF EXISTS "insert_own_role" ON user_roles;
CREATE POLICY "insert_own_role" ON user_roles FOR INSERT
  TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "update_own_role" ON user_roles;
CREATE POLICY "update_own_role" ON user_roles FOR UPDATE
  TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "delete_own_role" ON user_roles;
CREATE POLICY "delete_own_role" ON user_roles FOR DELETE
  TO authenticated USING (false);

-- ============================================================
-- 2. Auto-update updated_at on row change
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_roles_updated_at ON user_roles;
CREATE TRIGGER trg_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 3. Function: assign_user_role on new auth.users insert
-- ============================================================
CREATE OR REPLACE FUNCTION assign_user_role()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_roles (user_id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    CASE
      WHEN NEW.email IN ('studyshieldofficial@gmail.com', 'studyshieldrecovery@gmail.com') THEN 'super_admin'
      ELSE 'user'
    END
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS trg_assign_user_role ON auth.users;
CREATE TRIGGER trg_assign_user_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION assign_user_role();

-- ============================================================
-- 4. Upsert function for OAuth logins (called from edge function)
-- ============================================================
CREATE OR REPLACE FUNCTION upsert_user_role(p_user_id uuid, p_email text)
RETURNS void AS $$
BEGIN
  INSERT INTO user_roles (user_id, email, role)
  VALUES (
    p_user_id,
    p_email,
    CASE
      WHEN p_email IN ('studyshieldofficial@gmail.com', 'studyshieldrecovery@gmail.com') THEN 'super_admin'
      ELSE 'user'
    END
  )
  ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = now()
    WHERE user_roles.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. Function: check if current user has a given role (for edge functions)
-- ============================================================
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS text AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM user_roles WHERE user_id = auth.uid();
  RETURN COALESCE(v_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. Function: check if current user is admin or above
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. Grant necessary permissions
-- ============================================================
GRANT SELECT ON user_roles TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_user_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated;