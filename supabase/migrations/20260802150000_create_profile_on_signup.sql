/*
# Auto-create profiles row on signup

## Problem
New signups never got a `profiles` row: no trigger created it and the client
only ever SELECTed. Onboarding then silently failed to save (UPDATE matched 0
rows) and route guards treated the missing profile as "not onboarded",
skipping onboarding entirely.

## Fix
After INSERT on auth.users (i.e. every new signup, including email-pending
ones), create a minimal profiles row. The full_name comes from
raw_user_meta_data.full_name, which the signup form sends via
`options.data.full_name`. Existing rows are never touched (ON CONFLICT DO
NOTHING) — existing users keep all their data.

## Notes
- Runs with SECURITY DEFINER so it can insert into profiles despite RLS.
- A client-side safety net (db.ensureProfile in AuthContext) covers users who
  signed up before this migration was applied.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    display_name,
    onboarding_completed,
    onboarding_step
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    false,
    0
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_on_new_user ON auth.users;
CREATE TRIGGER trg_profile_on_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
