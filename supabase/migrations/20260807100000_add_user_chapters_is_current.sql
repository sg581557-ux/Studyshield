-- Add an explicit "current chapter" flag to user_chapters.
--
-- Previously the planner derived the user's current chapter from status
-- (status IN ('started','in_progress')). Now that derivation is persisted so
-- the AI planner, mentor chat, and reminders all read the same stored truth.
-- Additive: does not drop or alter existing columns.

ALTER TABLE user_chapters
ADD COLUMN IF NOT EXISTS is_current boolean NOT NULL DEFAULT false;

-- Backfill: chapters already in an active studying state are current.
UPDATE user_chapters
SET is_current = true
WHERE status IN ('started', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_user_chapters_current
  ON user_chapters (user_id, is_current)
  WHERE is_current = true;
