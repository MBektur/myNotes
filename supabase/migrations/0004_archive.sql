-- Arshiv: xatire öchürülmey, aldi bilen arshivlinidu (archived_at toldurulidu). Dashboard > SQL Editor'da bir qétim ishlitiñ.
alter table public.notes add column if not exists archived_at timestamptz;
