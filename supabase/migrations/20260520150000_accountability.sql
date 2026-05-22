-- Workout locations for streak accountability
create table public.workout_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  latitude numeric not null,
  longitude numeric not null,
  radius_meters int not null default 150 check (radius_meters between 25 and 500),
  created_at timestamptz not null default now()
);

alter table public.workout_locations enable row level security;

create policy "Users manage own workout locations"
  on public.workout_locations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_workout_locations_user on public.workout_locations (user_id);

-- Session accountability fields
alter table public.workout_sessions
  add column if not exists expected_duration_seconds int,
  add column if not exists qualifies_for_streak boolean not null default false,
  add column if not exists streak_qualify_reasons text[] not null default '{}';

-- GPS samples during live workouts
create table public.session_location_samples (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  recorded_at timestamptz not null default now(),
  latitude numeric not null,
  longitude numeric not null,
  within_bounds boolean not null default false
);

alter table public.session_location_samples enable row level security;

create policy "Users manage own session location samples"
  on public.session_location_samples for all
  using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_location_samples.session_id
        and ws.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_location_samples.session_id
        and ws.user_id = auth.uid()
    )
  );

create index idx_session_location_samples_session
  on public.session_location_samples (session_id, recorded_at);
