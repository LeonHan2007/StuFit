alter table public.profiles
  add column if not exists streak_accountability_enabled boolean not null default true;
