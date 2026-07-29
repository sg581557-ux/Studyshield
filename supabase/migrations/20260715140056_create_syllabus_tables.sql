/*
# Create syllabus tables and seed with complete exam data

## Purpose
Store the complete syllabus hierarchy (Exam → Subject → Chapter) in the database
so the Module Tracker and AI Planner can fetch from the DB instead of hardcoded arrays.

## New Tables (3)

### 1. syllabus_exams
- id (text PK, e.g. 'jee-main')
- name (text, e.g. 'JEE Main')
- category (text, e.g. 'Engineering')

### 2. syllabus_subjects
- id (uuid PK)
- exam_id (text FK → syllabus_exams.id)
- name (text, e.g. 'Physics')
- display_order (int, for sorting)

### 3. syllabus_chapters
- id (uuid PK)
- subject_id (uuid FK → syllabus_subjects.id)
- name (text, e.g. 'Units and Measurements')
- display_order (int, for sorting)

## RLS
- All three tables are readable by all authenticated users (shared syllabus data).
- No INSERT/UPDATE/DELETE via RLS — only the service role can modify syllabus data.

## Seeding
All exams, subjects, and chapters from the TypeScript examData.ts file are inserted.
This includes JEE Main, JEE Advanced, NEET, UPSC, CA, SSC, Banking, CAT, and more.

## Important Notes
1. Uses ON CONFLICT DO NOTHING so re-running is safe.
2. The display_order preserves the order of subjects and chapters as defined in examData.ts.
3. user_chapters (existing table) will store per-user progress keyed by exam/subject/chapter names.
*/

-- ============================================================
-- 1. syllabus_exams
-- ============================================================
CREATE TABLE IF NOT EXISTS syllabus_exams (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General'
);

ALTER TABLE syllabus_exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_syllabus_exams" ON syllabus_exams;
CREATE POLICY "select_syllabus_exams" ON syllabus_exams FOR SELECT
  TO authenticated USING (true);

-- ============================================================
-- 2. syllabus_subjects
-- ============================================================
CREATE TABLE IF NOT EXISTS syllabus_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id text NOT NULL REFERENCES syllabus_exams(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_syllabus_subjects_exam ON syllabus_subjects(exam_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_syllabus_subjects_unique ON syllabus_subjects(exam_id, name);

ALTER TABLE syllabus_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_syllabus_subjects" ON syllabus_subjects;
CREATE POLICY "select_syllabus_subjects" ON syllabus_subjects FOR SELECT
  TO authenticated USING (true);

-- ============================================================
-- 3. syllabus_chapters
-- ============================================================
CREATE TABLE IF NOT EXISTS syllabus_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES syllabus_subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_syllabus_chapters_subject ON syllabus_chapters(subject_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_syllabus_chapters_unique ON syllabus_chapters(subject_id, name);

ALTER TABLE syllabus_chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_syllabus_chapters" ON syllabus_chapters;
CREATE POLICY "select_syllabus_chapters" ON syllabus_chapters FOR SELECT
  TO authenticated USING (true);

-- ============================================================
-- 4. SEED: Exams
-- ============================================================
INSERT INTO syllabus_exams (id, name, category) VALUES
  ('jee-main', 'JEE Main', 'Engineering'),
  ('jee-advanced', 'JEE Advanced', 'Engineering'),
  ('neet-ug', 'NEET UG', 'Medical'),
  ('upsc-cse', 'UPSC CSE', 'Civil Services'),
  ('ca-foundation', 'CA Foundation', 'Commerce'),
  ('ca-intermediate', 'CA Intermediate', 'Commerce'),
  ('ca-final', 'CA Final', 'Commerce'),
  ('ssc-cgl', 'SSC CGL', 'Government Jobs'),
  ('ssc-chsl', 'SSC CHSL', 'Government Jobs'),
  ('banking-exams', 'Banking Exams', 'Banking'),
  ('cat', 'CAT', 'Management'),
  ('clat', 'CLAT', 'Law'),
  ('nda', 'NDA', 'Defence'),
  ('cds', 'CDS', 'Defence'),
  ('gate', 'GATE', 'Engineering'),
  ('cuet-ug', 'CUET UG', 'Entrance'),
  ('cuet-pg', 'CUET PG', 'Entrance'),
  ('bitsat', 'BITSAT', 'Engineering'),
  ('wbjee', 'WBJEE', 'Engineering'),
  ('mht-cet', 'MHT CET', 'Engineering'),
  ('comedk', 'COMEDK', 'Engineering'),
  ('viteee', 'VITEEE', 'Engineering'),
  ('srmjeee', 'SRMJEEE', 'Engineering'),
  ('kiitee', 'KIITEE', 'Engineering'),
  ('neet-ug-aiims', 'AIIMS (legacy)', 'Medical'),
  ('cs', 'CS', 'Commerce'),
  ('cma', 'CMA', 'Commerce'),
  ('olympiads', 'Olympiads', 'School'),
  ('railway-exams', 'Railway Exams', 'Government Jobs'),
  ('state-psc', 'State PSC', 'Civil Services'),
  ('other', 'Other', 'General')
ON CONFLICT (id) DO NOTHING;