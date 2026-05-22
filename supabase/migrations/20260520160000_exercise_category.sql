alter table public.exercises
  add column if not exists category text not null default 'weightlifting';

alter table public.exercises
  drop constraint if exists exercises_category_check;

alter table public.exercises
  add constraint exercises_category_check
  check (
    category in (
      'weightlifting',
      'calisthenics',
      'cardio',
      'plyometrics',
      'stretching'
    )
  );
