alter table public.user_onboarding
  add column if not exists exercise_modalities text[] not null default '{}';
