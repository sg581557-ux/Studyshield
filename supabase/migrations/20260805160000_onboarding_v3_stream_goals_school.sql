/*
# Onboarding v3 — stream, academic goals, school schedule, sleep & tests

## Purpose
The v3 onboarding wizard collects: academic stream (PCM/PCB/PCMB/Commerce/
Arts/Diploma/Other), multi-select academic goals (school board + competitive
exams), school class (6–12/College), granular productive-time slots (incl.
Night Owl), desired sleep hours, weekly test count, school days + timings and
study days. All columns are purely ADDITIVE — existing rows and columns are
untouched, so returning users keep all their data.

## New profiles columns
- stream (text)             — science_pcm | science_pcb | science_pcmb |
                              commerce | arts | diploma | other
- academic_goals (text[])   — multi-select: school exams (cbse, icse,
                              state_board) + competitive exams (jee-main,
                              jee-advanced, neet-ug, cuet-ug, nda, olympiad,
                              upsc-foundation, ssc-cgl, gate, cat, other)
- productive_time (text)    — primary productive window used by the planner:
                              early_morning | morning | afternoon | evening |
                              night | night_owl
- desired_sleep_hours (numeric) — hours of sleep the student aims for
- tests_per_week (integer)  — weekly mock tests (0–7+)
- school_days (text[])      — days school is attended ("monday"…"sunday")
- study_days (text[])       — days the student plans to study (weekdays)
- coaching_mode (text)      — online | offline | hybrid | self_study

## New backlog_items columns
- lecture_status (text)     — not_started | in_progress | completed
- revision_level (integer)  — revision rounds needed (0–3)
- confidence (integer)      — 1 (weak) … 5 (strong)

Existing backlog columns (pending_lectures, pending_dpps, pending_pyqs,
revision_pending, module_total_questions, module_solved_questions) already
cover lectures / DPPs / PYQs / modules — the wizard maps the new fields onto
them, so the planner sees the backlog without any planner-side change.
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stream text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS academic_goals text[] NOT NULL DEFAULT '{}';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS productive_time text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS desired_sleep_hours numeric;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tests_per_week integer NOT NULL DEFAULT 0;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS school_days text[] NOT NULL DEFAULT '{}';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS study_days text[] NOT NULL DEFAULT '{}';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS coaching_mode text;

ALTER TABLE backlog_items
  ADD COLUMN IF NOT EXISTS lecture_status text;

ALTER TABLE backlog_items
  ADD COLUMN IF NOT EXISTS revision_level integer NOT NULL DEFAULT 0;

ALTER TABLE backlog_items
  ADD COLUMN IF NOT EXISTS confidence integer NOT NULL DEFAULT 3;
