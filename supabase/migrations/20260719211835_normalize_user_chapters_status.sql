-- Normalize inconsistent status strings in user_chapters.
-- Root cause: some rows stored "not-started" (kebab) while the app uses
-- "not_started" (snake_case). This caused status updates to silently
-- mismatch existing rows, so changes never persisted.
-- This migration normalizes existing data in place — NO rows are deleted,
-- NO user progress is lost. Only the status string is corrected.

UPDATE user_chapters
SET status = 'not_started',
    updated_at = now()
WHERE status = 'not-started';
