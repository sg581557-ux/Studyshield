-- ============================================================
-- Mock test / PYQ attempt tracking
-- Feeds the AI Mentor's mock analysis (scores, subject-wise
-- marks, trend) and the PYQ Tracker page.
-- ============================================================

create table if not exists public.mock_test_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  test_name text not null,
  subject text,
  total_marks numeric not null check (total_marks > 0),
  obtained_marks numeric not null check (obtained_marks >= 0),
  test_date date not null default current_date,
  weak_chapters text[] not null default '{}',
  strong_chapters text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists mock_test_results_user_idx on public.mock_test_results (user_id, test_date desc);

alter table public.mock_test_results enable row level security;

drop policy if exists "mock_test_results_select_own" on public.mock_test_results;
create policy "mock_test_results_select_own" on public.mock_test_results
  for select using (auth.uid() = user_id);
drop policy if exists "mock_test_results_insert_own" on public.mock_test_results;
create policy "mock_test_results_insert_own" on public.mock_test_results
  for insert with check (auth.uid() = user_id);
drop policy if exists "mock_test_results_delete_own" on public.mock_test_results;
create policy "mock_test_results_delete_own" on public.mock_test_results
  for delete using (auth.uid() = user_id);
