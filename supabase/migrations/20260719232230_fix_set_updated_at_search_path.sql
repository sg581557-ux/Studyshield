-- Fix: Function Search Path Mutable on public.set_updated_at
-- The trigger function ran with the caller's mutable search_path, allowing a
-- malicious actor to shadow unqualified references. Pin it to an explicit,
-- non-mutable search_path so resolution is deterministic regardless of caller.
-- The function body only calls now(), which lives in pg_catalog, so pin both
-- pg_catalog (for now()) and public (the function's own schema) for safety.
ALTER FUNCTION public.set_updated_at() SET search_path = pg_catalog, public;