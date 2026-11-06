-- Hatirlatma (push bildirimi): Dashboard > SQL Editor'da bir kez çalıştırın.
-- Gönderici: supabase/functions/send-reminders (pg_cron ile her 10 dakikada çağrılır; altta örnek var).

-- Cihaz abonelikleri: bir kullanıcının birden çok cihazı olabilir. endpoint benzersizdir.
create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  p256dh     text not null,
  auth       text not null,
  locale     text not null default 'ug' check (locale in ('ug','en','tr')),
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Genel ayar: offsets = son günden kaç gün önce (0 = son gün). send_time yerel saat (HH:MM), tz = IANA saat dilimi.
create table if not exists public.reminder_settings (
  user_id   uuid primary key default auth.uid() references auth.users on delete cascade,
  enabled   boolean not null default false,
  offsets   int[] not null default '{0,1}',
  send_time text not null default '09:00' check (send_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  tz        text not null default 'UTC'
);

-- Aynı hatırlatma iki kez gitmesin. deadline değişirse yeni satır olur (tekrar hatırlatır).
-- offset_days = -1: "süresi geçti" bildirimi (tek seferlik).
create table if not exists public.reminder_log (
  user_id     uuid not null references auth.users on delete cascade,
  note_id     text not null,
  deadline    text not null,
  offset_days int  not null,
  sent_at     timestamptz not null default now(),
  primary key (user_id, note_id, deadline, offset_days)
);

alter table public.push_subscriptions enable row level security;
alter table public.reminder_settings  enable row level security;
alter table public.reminder_log       enable row level security;

drop policy if exists "own rows" on public.push_subscriptions;
drop policy if exists "own rows" on public.reminder_settings;
create policy "own rows" on public.push_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.reminder_settings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- reminder_log: politika YOK = istemci hiçbir şey okuyamaz/yazamaz; yalnızca Edge Function (service_role) kullanır.

-- ---------------------------------------------------------------------------------------------
-- Zamanlama (bir kez; önce Dashboard > Database > Extensions'dan pg_cron ve pg_net'i açın).
-- 1) CRON_SECRET'i hem Edge Function secrets'a (supabase secrets set CRON_SECRET=...) hem Vault'a koyun:
--      select vault.create_secret('<ayni-gizli-deger>', 'reminders_cron_secret');
-- 2) <project-ref> yerine kendi proje referansınızı yazın:
--
-- select cron.schedule('send-reminders', '*/10 * * * *', $$
--   select net.http_post(
--     url     := 'https://<project-ref>.supabase.co/functions/v1/send-reminders',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_cron_secret')
--     ),
--     body    := '{}'::jsonb
--   );
-- $$);
