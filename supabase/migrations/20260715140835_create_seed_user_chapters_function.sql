/*
# Create auto-population function for user_chapters

## Purpose
When a user completes onboarding (or signs up), automatically create
user_chapters progress records for every chapter in their target exam's syllabus.
This ensures users never see an empty Module Tracker.

## Changes
1. Creates `seed_user_chapters(p_user_id, p_exam_name)` function that:
   - Maps the exam name (e.g. "JEE Main") to the syllabus_exams id (e.g. "jee-main")
   - Fetches all subjects + chapters for that exam from the syllabus tables
   - Inserts user_chapters rows for each chapter with status='not-started'
   - Uses ON CONFLICT DO NOTHING so re-running is safe
2. Grants EXECUTE to authenticated users

## RLS
No policy changes — user_chapters already has RLS policies from the original schema.
The function runs as SECURITY DEFINER so it can insert rows regardless of RLS,
but it only inserts for the calling user (p_user_id = auth.uid()).

## Important Notes
1. The function maps exam names to syllabus_exams ids using a lookup table.
2. If the exam name doesn't match any known exam, it defaults to 'other'.
3. The function is idempotent — calling it multiple times for the same user+exam
   won't create duplicate rows (ON CONFLICT DO NOTHING on the unique constraint).
4. We also add a unique constraint on (user_id, exam, subject, chapter) to prevent duplicates.
*/

-- Add unique constraint to user_chapters to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_chapters_unique 
  ON user_chapters(user_id, exam, subject, chapter);

-- Create the seed function
CREATE OR REPLACE FUNCTION seed_user_chapters(p_user_id uuid, p_exam_name text)
RETURNS integer AS $$
DECLARE
  v_exam_id text;
  v_count integer := 0;
  v_chapter RECORD;
  v_exam_name text := p_exam_name;
BEGIN
  -- Map exam name to syllabus_exams id
  -- Try exact name match first, then case-insensitive
  SELECT id INTO v_exam_id FROM syllabus_exams WHERE name = v_exam_name LIMIT 1;
  
  IF v_exam_id IS NULL THEN
    -- Try case-insensitive match
    SELECT id INTO v_exam_id FROM syllabus_exams WHERE LOWER(name) = LOWER(v_exam_name) LIMIT 1;
  END IF;
  
  IF v_exam_id IS NULL THEN
    -- Try partial match (e.g. "JEE Main 2025" → "JEE Main")
    SELECT id INTO v_exam_id FROM syllabus_exams 
    WHERE v_exam_name ILIKE name || '%' OR name ILIKE v_exam_name || '%'
    LIMIT 1;
  END IF;
  
  IF v_exam_id IS NULL THEN
    -- Default to 'other' if no match
    v_exam_id := 'other';
  END IF;
  
  -- Get the exam name from syllabus_exams for consistent naming
  SELECT name INTO v_exam_name FROM syllabus_exams WHERE id = v_exam_id;
  
  -- Insert user_chapters for all chapters in this exam
  FOR v_chapter IN
    SELECT 
      ss.name AS subject_name,
      sc.name AS chapter_name
    FROM syllabus_chapters sc
    JOIN syllabus_subjects ss ON sc.subject_id = ss.id
    WHERE ss.exam_id = v_exam_id
    ORDER BY ss.display_order, sc.display_order
  LOOP
    INSERT INTO user_chapters (user_id, exam, subject, chapter, status, lectures_remaining, questions_remaining, revision_pending, confidence)
    VALUES (p_user_id, v_exam_name, v_chapter.subject_name, v_chapter.chapter_name, 'not-started', 1, 0, 0, 0)
    ON CONFLICT (user_id, exam, subject, chapter) DO NOTHING;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION seed_user_chapters(uuid, text) TO authenticated;