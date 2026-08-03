/*
# Onboarding v2 profile columns

## Purpose
The v2 onboarding wizard collects richer profile data than the original flow.
These columns are purely ADDITIVE — existing rows and columns are untouched,
so returning users keep all their data. Every answer from the wizard has a
dedicated column (plus onboarding_data stores the full wizard state so an
interrupted onboarding can resume exactly where it left off).

## New profiles columns
- age (int)                 — student age
- current_level (text)      — beginner | average | advanced | not_sure
- coaching (text)           — none | pw | allen | aakash | fiitjee | vibrant |
                              motion | resonance | unacademy | self_study | other
- wake_up_time (text)       — HH:MM
- sleep_time (text)         — HH:MM
- subjects (text[])         — subjects selected for the target exam
- primary_goal (text)       — air_under_100 | air_under_1000 | college |
                              marks | custom
- custom_goal (text)        — free-text goal when primary_goal = custom
- preferred_language (text) — en | hi | hinglish | bn | ta | te | mr | gu | kn |
                              ml | pa | ur
- mentor_tone (text)        — friendly | strict | balanced

## New backlog_items columns
- pending_pyqs (int)        — PYQ sets remaining for this backlog item
- revision_pending (int)    — revision rounds pending for this backlog item
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS age integer;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS current_level text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS coaching text NOT NULL DEFAULT 'none';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS wake_up_time text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS sleep_time text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subjects text[] NOT NULL DEFAULT '{}';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS primary_goal text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS custom_goal text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_language text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS mentor_tone text;

ALTER TABLE backlog_items
  ADD COLUMN IF NOT EXISTS pending_pyqs integer NOT NULL DEFAULT 0;

ALTER TABLE backlog_items
  ADD COLUMN IF NOT EXISTS revision_pending integer NOT NULL DEFAULT 0;
