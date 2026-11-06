-- Workspace (üst kategori): shexsiy / mektep / proyekt toplumi qatarliq. Dashboard > SQL Editor'da bir kez çalıştırın.

create table if not exists public.workspaces (
  id         text not null,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  name       text not null,
  emoji      text,
  color      text,
  sort_order double precision,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.workspaces enable row level security;
drop policy if exists "own rows" on public.workspaces;
create policy "own rows" on public.workspaces for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Not -> workspace. Ataylap FK yoq: workspace we not ayrim yézilidu, tertip boyiche kélishi shert emes.
-- Workspace öchürülgende notlarning workspace_id'si istemchi tárepte (we deleteWorkspace ichide) boshitilidu.
alter table public.notes add column if not exists workspace_id text;
create index if not exists notes_user_workspace_idx on public.notes (user_id, workspace_id);

-- Barliq eski notlar: notu bar her kullanghuchigha bir "شەخسىي" workspace achip, workspace'siz notlarni shuninggha baghlaymiz.
with owners as (
  select distinct user_id from public.notes where workspace_id is null
),
created as (
  insert into public.workspaces (id, user_id, name, emoji, color, sort_order)
  select gen_random_uuid()::text, user_id, 'شەخسىي', '👤', 'blue', 0 from owners
  returning id, user_id
)
update public.notes n
set workspace_id = c.id
from created c
where n.user_id = c.user_id and n.workspace_id is null;

alter publication supabase_realtime add table public.workspaces;
