-- Mehpiy shifirni eslige keltürüshte hésab barmu-yoqmu tekshürüsh: Dashboard > SQL Editor'da bir qétim ishlitiñ.
-- Supabase resetPasswordForEmail hésab bolmisimu "yollandi" deydu; bu fonksiye peqet true/false qayturidu.
-- Diqqet: bu hésab barliqini ashkarilaydu (kim bolsa bir élxetni sinap baqalaydu). Peqet boolean qayturidu, bashqa melumat yoq.
create or replace function public.email_exists(addr text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (select 1 from auth.users where lower(email) = lower(trim(addr)))
$$;

revoke all on function public.email_exists(text) from public;
grant execute on function public.email_exists(text) to anon, authenticated;
