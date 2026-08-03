-- ============================================================
-- AI Mentor: persistent chat threads + messages
-- The mentor answers using the student's real preparation data
-- (planner, backlog, chapters, stats, recovery, focus sessions).
-- ============================================================

create table if not exists public.mentor_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default 'Mentor chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mentor_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.mentor_threads(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mentor_threads_user_idx on public.mentor_threads (user_id, updated_at desc);
create index if not exists mentor_threads_created_idx on public.mentor_threads (created_at);
create index if not exists mentor_messages_user_idx on public.mentor_messages (user_id);
create index if not exists mentor_messages_thread_idx on public.mentor_messages (thread_id, created_at);
create index if not exists mentor_messages_created_idx on public.mentor_messages (created_at);

alter table public.mentor_threads enable row level security;
alter table public.mentor_messages enable row level security;

drop policy if exists "mentor_threads_select_own" on public.mentor_threads;
create policy "mentor_threads_select_own" on public.mentor_threads
  for select using (auth.uid() = user_id);
drop policy if exists "mentor_threads_insert_own" on public.mentor_threads;
create policy "mentor_threads_insert_own" on public.mentor_threads
  for insert with check (auth.uid() = user_id);
drop policy if exists "mentor_threads_update_own" on public.mentor_threads;
create policy "mentor_threads_update_own" on public.mentor_threads
  for update using (auth.uid() = user_id);
drop policy if exists "mentor_threads_delete_own" on public.mentor_threads;
create policy "mentor_threads_delete_own" on public.mentor_threads
  for delete using (auth.uid() = user_id);

drop policy if exists "mentor_messages_select_own" on public.mentor_messages;
create policy "mentor_messages_select_own" on public.mentor_messages
  for select using (auth.uid() = user_id);
drop policy if exists "mentor_messages_insert_own" on public.mentor_messages;
create policy "mentor_messages_insert_own" on public.mentor_messages
  for insert with check (auth.uid() = user_id);
drop policy if exists "mentor_messages_delete_own" on public.mentor_messages;
create policy "mentor_messages_delete_own" on public.mentor_messages
  for delete using (auth.uid() = user_id);

-- Keep thread.updated_at fresh so threads sort by last activity
create or replace function public.touch_mentor_thread()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.mentor_threads set updated_at = now() where id = new.thread_id;
  return new;
end $$;

drop trigger if exists mentor_messages_touch_thread on public.mentor_messages;
create trigger mentor_messages_touch_thread
  after insert on public.mentor_messages
  for each row execute function public.touch_mentor_thread();
