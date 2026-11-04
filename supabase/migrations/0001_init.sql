-- myNotes: Supabase şeması. Dashboard > SQL Editor'da bir kez çalıştırın.

create table if not exists public.notes (
  id          text primary key,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  status      text not null check (status in ('todo','in_progress','review','done')),
  title       text,
  content     text,
  category    text,
  tags        text[] not null default '{}',
  priority    text check (priority in ('low','medium','high','urgent')),
  deadline    text,
  color       text,
  sort_order  double precision,
  links       jsonb not null default '[]',
  checklist   jsonb not null default '[]',
  attachments jsonb not null default '[]',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists notes_user_updated_idx on public.notes (user_id, updated_at desc);

create table if not exists public.schedule_people (
  id         text not null,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  name       text not null,
  color      text not null,
  avail      jsonb not null default '{}',
  travel_min int,
  primary key (user_id, id)
);

create table if not exists public.schedule_lessons (
  id        text not null,
  user_id   uuid not null default auth.uid() references auth.users on delete cascade,
  person_id text not null,
  day       smallint not null,
  start_t   text not null,
  end_t     text not null,
  subject   text not null,
  from_d    text not null,
  to_d      text not null,
  exclude   text[] not null default '{}',
  flexible  boolean not null default false,
  note      text,
  primary key (user_id, id)
);

-- Row Level Security: herkes yalnızca kendi satırlarını görür/değiştirir
alter table public.notes enable row level security;
alter table public.schedule_people enable row level security;
alter table public.schedule_lessons enable row level security;

drop policy if exists "own rows" on public.notes;
drop policy if exists "own rows" on public.schedule_people;
drop policy if exists "own rows" on public.schedule_lessons;
create policy "own rows" on public.notes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.schedule_people for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.schedule_lessons for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Realtime (başka cihazdaki değişiklikler anında yansısın)
alter publication supabase_realtime add table public.notes;

-- Dosyalar (resim/PDF): private bucket, yol = {user_id}/{attachment_id}
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

drop policy if exists "attachments select" on storage.objects;
drop policy if exists "attachments insert" on storage.objects;
drop policy if exists "attachments update" on storage.objects;
drop policy if exists "attachments delete" on storage.objects;
create policy "attachments select" on storage.objects for select
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "attachments insert" on storage.objects for insert
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "attachments update" on storage.objects for update
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "attachments delete" on storage.objects for delete
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
