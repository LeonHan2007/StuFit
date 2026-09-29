-- Existing databases already applied the column with default true.
alter table public.profiles
  alter column streak_accountability_enabled set default false;

update public.profiles
  set streak_accountability_enabled = false
  where streak_accountability_enabled = true;
