/*
# Upgrade Backlog Tracker to Chapter-Based System

## Overview
Transforms the backlog_items table from a simple title/priority/due_date model
into a chapter-based system where each backlog is tied to a subject + chapter
from the user's exam syllabus, with multiple backlog types (Lecture, DPP, Module,
PYQ, etc.) and their individual progress tracked in a JSONB column.

## New Columns Added to `backlog_items`
1. `subject` (text, nullable) — Subject name (e.g. "Physics")
2. `chapter` (text, nullable) — Chapter name (e.g. "Kinematics")
3. `exam_id` (text, nullable) — The exam ID from onboarding (e.g. "jee-main")
4. `backlog_data` (jsonb, nullable) — Array of backlog type progress objects:
   [{"type": "lecture", "total": 7, "completed": 3},
    {"type": "module", "total": 120, "completed": 42}]
   Each object has: type (string), total (number), completed (number),
   and optionally status (string for notes), revision_rounds (number for revision).
5. `overall_progress` (numeric, default 0) — Calculated overall completion percentage

## Modified Columns
- `title` is now auto-generated as "{subject} - {chapter}" by the frontend.
  The column itself is unchanged (still text NOT NULL).

## Security
- RLS is already enabled on backlog_items. No policy changes needed —
  existing user_id-based policies cover the new columns.
- Existing data is preserved. Old backlogs without the new columns will
  have NULL values for subject/chapter/backlog_data, which the UI handles
  gracefully.

## Notes
1. No existing columns are dropped or renamed.
2. No data is lost — all existing rows keep their current values.
3. The new columns are all nullable so old rows remain valid.
4. Indexes added for common query patterns (subject, chapter, exam_id).
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'backlog_items' AND column_name = 'subject') THEN
    ALTER TABLE backlog_items ADD COLUMN subject text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'backlog_items' AND column_name = 'chapter') THEN
    ALTER TABLE backlog_items ADD COLUMN chapter text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'backlog_items' AND column_name = 'exam_id') THEN
    ALTER TABLE backlog_items ADD COLUMN exam_id text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'backlog_items' AND column_name = 'backlog_data') THEN
    ALTER TABLE backlog_items ADD COLUMN backlog_data jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'backlog_items' AND column_name = 'overall_progress') THEN
    ALTER TABLE backlog_items ADD COLUMN overall_progress numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_backlog_items_subject ON backlog_items(subject);
CREATE INDEX IF NOT EXISTS idx_backlog_items_chapter ON backlog_items(chapter);
CREATE INDEX IF NOT EXISTS idx_backlog_items_exam_id ON backlog_items(exam_id);
CREATE INDEX IF NOT EXISTS idx_backlog_items_user_status ON backlog_items(user_id, status);
