-- RLS performansi: auth.uid() her satir ücün ayrim chaqirilmasliqi üchün (select auth.uid()) ishlitilidu.
-- Postgres bu ifadeni sorgu bashida bir qétim hésablaydu (InitPlan); mezmun aldinqi bilen birdek.
-- Dashboard > SQL Editor'da bir qétim ishlitiñ.

-- notes
drop policy if exists "own rows" on public.notes;
create policy "own rows" on public.notes for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- schedule
drop policy if exists "own rows" on public.schedule_people;
create policy "own rows" on public.schedule_people for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "own rows" on public.schedule_lessons;
create policy "own rows" on public.schedule_lessons for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- workspaces
drop policy if exists "own rows" on public.workspaces;
create policy "own rows" on public.workspaces for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- push / hatirlatma
drop policy if exists "own rows" on public.push_subscriptions;
create policy "own rows" on public.push_subscriptions for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "own rows" on public.reminder_settings;
create policy "own rows" on public.reminder_settings for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- attachments (Storage)
drop policy if exists "attachments select" on storage.objects;
create policy "attachments select" on storage.objects for select
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "attachments insert" on storage.objects;
create policy "attachments insert" on storage.objects for insert
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "attachments update" on storage.objects;
create policy "attachments update" on storage.objects for update
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "attachments delete" on storage.objects;
create policy "attachments delete" on storage.objects for delete
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
