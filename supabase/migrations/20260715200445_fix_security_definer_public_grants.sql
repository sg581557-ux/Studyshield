/*
# Fix SECURITY DEFINER Public Execute Grants + Enforce NOT NULL on user_id

## Summary
Follow-up to the previous security migration. The initial REVOKE EXECUTE FROM anon
removed the explicit `anon` grant, but a broader `PUBLIC` grant (PostgreSQL oid 0)
still exists on all 8 SECURITY DEFINER functions. Since `anon` inherits from `PUBLIC`,
this effectively still allows anon to execute these functions.

## Changes
1. Revoke EXECUTE FROM PUBLIC on all 8 SECURITY DEFINER functions.
   - For trigger function `assign_user_role`: also already revoked from authenticated
     (confirmed). Only postgres and service_role retain execute.
   - For RPC-callable functions: revoke from PUBLIC, keep grants for authenticated
     and service_role.
2. Set `user_id` columns to NOT NULL on `focus_sessions` and `study_tasks`.
   Both tables are currently empty (0 rows), so this is safe. Combined with
   `DEFAULT auth.uid()`, this enforces that every future row is owner-scoped.
3. Also revoke EXECUTE FROM PUBLIC on the 5 non-SECURITY-DEFINER helper/trigger
   functions for defense in depth.
*/

-- Revoke PUBLIC execute on all SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.assign_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_current_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_admin_action(uuid, text, text, uuid, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.upsert_user_role(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_user_chapters(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_chapter_resources(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.schedule_chapter_revisions(uuid, text, text, text, date) FROM PUBLIC;

-- Revoke PUBLIC execute on non-SECURITY-DEFINER helper/trigger functions (defense in depth)
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_resource_metrics() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._seed_subject(text, text, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._seed_chapter(uuid, text, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._copy_chapters(text, text, uuid, integer) FROM PUBLIC;

-- Set user_id columns to NOT NULL (tables are empty, safe to do)
ALTER TABLE focus_sessions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE study_tasks ALTER COLUMN user_id SET NOT NULL;
