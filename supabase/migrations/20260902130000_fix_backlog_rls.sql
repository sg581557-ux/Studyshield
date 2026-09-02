-- Fix backlog_items RLS: previous migration 20260719200256 dropped policies without recreating
-- This restores owner-scoped CRUD for backlog_items (user_id = auth.uid())
create policy "select_own_backlog" on backlog_items for select to authenticated using (auth.uid() = user_id);
create policy "insert_own_backlog" on backlog_items for insert to authenticated with check (auth.uid() = user_id);
create policy "update_own_backlog" on backlog_items for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete_own_backlog" on backlog_items for delete to authenticated using (auth.uid() = user_id);
