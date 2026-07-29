-- Merge JEE Main and JEE Advanced into a single "JEE (Main + Advanced)" exam.
-- JEE Advanced is the syllabus superset (it has 7 extra chapters over JEE Main),
-- so the merged exam uses the Advanced subjects + chapters. Formulas from both
-- exams are merged into the new exam_id; the unique index
-- (exam_id, subject, name) dedupes identical formulas automatically.
--
-- The old jee-main / jee-advanced rows in syllabus_exams are RETAINED (not
-- deleted) as historical references, but no active data references them after
-- this migration. This preserves any audit trail without duplicating syllabi.

INSERT INTO syllabus_exams (id, name, category)
VALUES ('jee', 'JEE (Main + Advanced)', 'Engineering')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category;

-- Copy the JEE Advanced subjects (superset) into the merged exam.
-- display_order is preserved so the subject order stays Physics, Chemistry, Maths.
INSERT INTO syllabus_subjects (exam_id, name, display_order)
SELECT 'jee', name, display_order FROM syllabus_subjects WHERE exam_id = 'jee-advanced'
ON CONFLICT (exam_id, name) DO NOTHING;

-- Copy all JEE Advanced chapters (superset) into the merged exam subjects,
-- matching by subject name. display_order is preserved.
INSERT INTO syllabus_chapters (subject_id, name, display_order)
SELECT ss_new.id, c.name, c.display_order
FROM syllabus_chapters c
JOIN syllabus_subjects ss_old ON ss_old.id = c.subject_id AND ss_old.exam_id = 'jee-advanced'
JOIN syllabus_subjects ss_new ON ss_new.exam_id = 'jee' AND ss_new.name = ss_old.name
WHERE NOT EXISTS (
  SELECT 1 FROM syllabus_chapters c2
  JOIN syllabus_subjects ss2 ON ss2.id = c2.subject_id AND ss2.exam_id = 'jee'
  WHERE c2.name = c.name AND ss2.name = ss_old.name
);

-- Merge formulas from both jee-main and jee-advanced into the merged exam.
-- The unique index (exam_id, subject, name) dedupes formulas that exist in
-- both exams (e.g. "Integration by Parts"). Where a name collides, the
-- jee-advanced version wins (inserted last via ORDER BY). chapter/expression
-- are carried through unchanged.
WITH ranked AS (
  SELECT
    subject, chapter, name, expression, variables, unit, explanation,
    shortcut, common_mistakes, pyq_importance, difficulty,
    ROW_NUMBER() OVER (PARTITION BY subject, name ORDER BY CASE WHEN exam_id = 'jee-advanced' THEN 0 ELSE 1 END) AS rn
  FROM formula_library
  WHERE exam_id IN ('jee-main', 'jee-advanced')
)
INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty)
SELECT 'jee', subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty
FROM ranked WHERE rn = 1
ON CONFLICT (exam_id, subject, name) DO NOTHING;
