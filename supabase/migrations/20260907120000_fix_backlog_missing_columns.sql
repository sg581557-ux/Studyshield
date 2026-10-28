-- Fix backlog_items missing columns that the app references (PGRST204)
-- Live DB was missing completed_at, difficulty, estimated_minutes — every
-- addSmartBacklog / complete / progress update that touched them failed with
-- "Could not find the 'X' column of 'backlog_items' in the schema cache".
-- These are purely additive, idempotent, and safe to re-run.

ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS difficulty text;
ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS estimated_minutes integer;

-- Ensure the updated_at trigger still exists (re-create if prior migration was skipped)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS backlog_items_updated_at ON backlog_items;
CREATE TRIGGER backlog_items_updated_at BEFORE UPDATE ON backlog_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
