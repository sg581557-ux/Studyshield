/*
# Add progress JSONB column to user_chapters

## Changes:
1. Adds `progress` JSONB column to `user_chapters` table with 12 independent boolean flags
2. Sets default value with all flags false except notStarted=true
3. Backward compatible: existing `status` column remains for any code still referencing it

## New column:
- `progress` (jsonb): Contains 12 boolean flags for independent chapter progress tracking:
  notStarted, lectureCompleted, notesCompleted, moduleQuestionsCompleted,
  dppCompleted, pyqsSolved, revision1, revision2, revision3,
  formulaRevised, conceptMastered, fullyCompleted

## Security:
- No RLS policy changes needed (existing policies cover the new column)
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_chapters' AND column_name = 'progress'
  ) THEN
    ALTER TABLE user_chapters
    ADD COLUMN progress jsonb NOT NULL DEFAULT '{"notStarted":true,"lectureCompleted":false,"notesCompleted":false,"moduleQuestionsCompleted":false,"dppCompleted":false,"pyqsSolved":false,"revision1":false,"revision2":false,"revision3":false,"formulaRevised":false,"conceptMastered":false,"fullyCompleted":false}'::jsonb;
  END IF;
END $$;
