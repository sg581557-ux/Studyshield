-- AI Mentor → AI Planner integration: change log + audit.
-- The mentor-chat edge function logs every proposed planner modification here;
-- the app marks it applied/undone after executing it client-side.

create table if not exists public.mentor_plan_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  thread_id uuid references mentor_threads(id) on delete set null,
  reason text not null,
  changes jsonb not null default '[]'::jsonb,
  status text not null default 'proposed'
    check (status in ('proposed', 'applied', 'rejected', 'undone')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mentor_plan_changes_user_created
  on public.mentor_plan_changes (user_id, created_at desc);

alter table public.mentor_plan_changes enable row level security;

drop policy if exists "mentor_plan_changes_select_own" on public.mentor_plan_changes;
create policy "mentor_plan_changes_select_own"
  on public.mentor_plan_changes for select
  using (auth.uid() = user_id);

drop policy if exists "mentor_plan_changes_insert_own" on public.mentor_plan_changes;
create policy "mentor_plan_changes_insert_own"
  on public.mentor_plan_changes for insert
  with check (auth.uid() = user_id);

drop policy if exists "mentor_plan_changes_update_own" on public.mentor_plan_changes;
create policy "mentor_plan_changes_update_own"
  on public.mentor_plan_changes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
