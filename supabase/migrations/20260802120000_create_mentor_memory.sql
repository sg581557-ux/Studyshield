-- ============================================================
-- AI Mentor long-term conversation memory
-- Stores durable facts about the student (weaknesses, goals,
-- preferences, study habits, recurring problems) extracted
-- from mentor conversations.
-- ============================================================

create table if not exists public.mentor_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null check (category in ('weakness', 'goal', 'preference', 'study_habit', 'problem')),
  key text not null,
  value text not null,
  importance integer not null default 3 check (importance between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category, key)
);

create index if not exists mentor_memory_user_idx on public.mentor_memory (user_id, importance desc, updated_at desc);

alter table public.mentor_memory enable row level security;

drop policy if exists "mentor_memory_select_own" on public.mentor_memory;
create policy "mentor_memory_select_own" on public.mentor_memory
  for select using (auth.uid() = user_id);
drop policy if exists "mentor_memory_insert_own" on public.mentor_memory;
create policy "mentor_memory_insert_own" on public.mentor_memory
  for insert with check (auth.uid() = user_id);
drop policy if exists "mentor_memory_update_own" on public.mentor_memory;
create policy "mentor_memory_update_own" on public.mentor_memory
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "mentor_memory_delete_own" on public.mentor_memory;
create policy "mentor_memory_delete_own" on public.mentor_memory
  for delete using (auth.uid() = user_id);

create or replace function public.touch_mentor_memory()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mentor_memory_touch on public.mentor_memory;
create trigger mentor_memory_touch
  before update on public.mentor_memory
  for each row execute function public.touch_mentor_memory();
