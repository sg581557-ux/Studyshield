-- Add a CHECK constraint so user_chapters.status accepts the full 11-value
-- status set required by the Subject Manager. This is additive — it does not
-- drop or alter existing columns, and existing rows (all 'not_started') are
-- already valid under the new constraint.

ALTER TABLE user_chapters
DROP CONSTRAINT IF EXISTS user_chapters_status_check;

ALTER TABLE user_chapters
ADD CONSTRAINT user_chapters_status_check CHECK (
  status IN (
    'not_started',
    'started',
    'in_progress',
    'completed',
    'backlog',
    'revision_pending',
    'revision_completed',
    'dpp_pending',
    'module_pending',
    'pyq_pending',
    'mastered'
  )
);
