-- Unify all JEE user data under the single merged exam_id 'jee'.
-- This is an UPDATE-only migration: NO rows are deleted, NO user progress
-- is lost. Only the exam identifier is normalized.
--
-- Before this migration, user_chapters.exam stored a mix of display names
-- ("JEE Advanced") and kebab IDs ("jee-advanced", "jee-main"). All are
-- remapped to 'jee'. No (user_id, subject, chapter) duplicates exist across
-- the old formats (verified), so the unique index update is conflict-free.

UPDATE user_chapters
SET exam = 'jee', updated_at = now()
WHERE exam IN ('JEE Advanced', 'jee-advanced', 'jee-main', 'JEE Main');

-- Normalize the profile target_exam for JEE users to the merged exam ID.
UPDATE profiles
SET target_exam = 'jee', updated_at = now()
WHERE target_exam IN ('JEE Advanced', 'jee-advanced', 'jee-main', 'JEE Main');

-- Normalize revision_schedule exam references (if any) to the merged exam.
UPDATE revision_schedule
SET exam = 'jee'
WHERE exam IN ('JEE Advanced', 'jee-advanced', 'jee-main', 'JEE Main');
