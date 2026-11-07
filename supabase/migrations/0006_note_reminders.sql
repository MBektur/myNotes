-- Nota xas hatirlatma (alarm): Dashboard > SQL Editor'da bir qétim ishlitiñ.
-- Her notta birnechche hatirlatma bolalaydu: [{ "id", "at": "yyyy-MM-ddTHH:mm" (yerlik), "repeat"?: { "every": N, "unit": "minute|hour|day|week|month" } }]
-- Saet dilimi: reminder_settings.tz. Gönderici: supabase/functions/send-reminders (occurrence.ts).
alter table public.notes add column if not exists reminders jsonb not null default '[]';

-- Her bir qétim (fire_at) bir qétimla yollansun. "at" özgerse yéngi açquch bolidu.
create table if not exists public.note_reminder_log (
  user_id     uuid not null references auth.users on delete cascade,
  note_id     text not null,
  reminder_id text not null,
  fire_at     text not null,
  sent_at     timestamptz not null default now(),
  primary key (user_id, note_id, reminder_id, fire_at)
);
alter table public.note_reminder_log enable row level security;
-- Politika YOQ: istemci oqualmaydu/yazalmaydu; yalnizla Edge Function (service_role) ishlitidu.

-- Kona log'larni tazilash (ixtiyariy, pg_cron bilen her kéche):
-- select cron.schedule('note-reminder-log-cleanup', '17 3 * * *',
--   $$ delete from public.note_reminder_log where sent_at < now() - interval '30 days' $$);

-- ---------------------------------------------------------------------------------------------
-- Alarm'gha oxshash bolushi üchün send-reminders'ni her minutta chaqirish (0005'tiki cron'ni almashturidu;
-- oxshash nam bilen cron.schedule mewjutini yéngilaydu). <project-ref> ni özingizningkige almashturung:
--
-- select cron.schedule('send-reminders', '* * * * *', $$
--   select net.http_post(
--     url     := 'https://<project-ref>.supabase.co/functions/v1/send-reminders',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_cron_secret')
--     ),
--     body    := '{}'::jsonb,
--     timeout_milliseconds := 30000  -- standart 5 sn: Edge Function soghuq qozghalghanda (cold start) yétishmeydu
--   );
-- $$);
