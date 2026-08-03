-- ============================================================
-- AI Mentor daily check-ins
-- One personalized check-in per user per day, generated from
-- the student's real data (planner, backlog, streak, mocks).
-- ============================================================

create table if not exists public.mentor_daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  message text not null,
  completed_tasks jsonb not null default '[]'::jsonb,
  missed_tasks jsonb not null default '[]'::jsonb,
  focus_score integer check (focus_score between 0 and 100),
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists mentor_daily_checkins_user_idx on public.mentor_daily_checkins (user_id, date desc);

alter table public.mentor_daily_checkins enable row level security;

drop policy if exists "mentor_daily_checkins_select_own" on public.mentor_daily_checkins;
create policy "mentor_daily_checkins_select_own" on public.mentor_daily_checkins
  for select using (auth.uid() = user_id);
drop policy if exists "mentor_daily_checkins_insert_own" on public.mentor_daily_checkins;
create policy "mentor_daily_checkins_insert_own" on public.mentor_daily_checkins
  for insert with check (auth.uid() = user_id);
drop policy if exists "mentor_daily_checkins_update_own" on public.mentor_daily_checkins;
create policy "mentor_daily_checkins_update_own" on public.mentor_daily_checkins
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
