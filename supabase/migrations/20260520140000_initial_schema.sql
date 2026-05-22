-- StuFit initial schema

-- Extensions
create extension if not exists "pgcrypto";

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone text default 'UTC',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Exercises catalog (readable by all authenticated users)
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  muscle_group text not null,
  equipment text not null,
  technique_md text not null default '',
  youtube_url text,
  difficulty text not null default 'intermediate',
  created_at timestamptz not null default now()
);

alter table public.exercises enable row level security;

create policy "Authenticated users can read exercises"
  on public.exercises for select
  to authenticated
  using (true);

-- User onboarding
create table public.user_onboarding (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goals text[] not null default '{}',
  days_per_week int not null check (days_per_week between 1 and 7),
  session_minutes int not null check (session_minutes between 15 and 180),
  experience text not null,
  equipment text not null,
  injuries_notes text,
  created_at timestamptz not null default now()
);

alter table public.user_onboarding enable row level security;

create policy "Users manage own onboarding"
  on public.user_onboarding for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Workout plans
create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  source text not null default 'onboarding',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.workout_plans enable row level security;

create policy "Users manage own workout plans"
  on public.workout_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Plan days
create table public.plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.workout_plans (id) on delete cascade,
  day_index int not null check (day_index between 1 and 7),
  label text not null,
  created_at timestamptz not null default now(),
  unique (plan_id, day_index)
);

alter table public.plan_days enable row level security;

create policy "Users manage own plan days"
  on public.plan_days for all
  using (
    exists (
      select 1 from public.workout_plans wp
      where wp.id = plan_days.plan_id and wp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_plans wp
      where wp.id = plan_days.plan_id and wp.user_id = auth.uid()
    )
  );

-- Plan day exercises
create table public.plan_day_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_day_id uuid not null references public.plan_days (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  order_index int not null default 0,
  sets int not null default 3,
  reps_min int not null default 8,
  reps_max int not null default 12,
  rest_seconds int not null default 90,
  created_at timestamptz not null default now()
);

alter table public.plan_day_exercises enable row level security;

create policy "Users manage own plan day exercises"
  on public.plan_day_exercises for all
  using (
    exists (
      select 1
      from public.plan_days pd
      join public.workout_plans wp on wp.id = pd.plan_id
      where pd.id = plan_day_exercises.plan_day_id and wp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.plan_days pd
      join public.workout_plans wp on wp.id = pd.plan_id
      where pd.id = plan_day_exercises.plan_day_id and wp.user_id = auth.uid()
    )
  );

-- Workout sessions
create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_day_id uuid references public.plan_days (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  created_at timestamptz not null default now()
);

alter table public.workout_sessions enable row level security;

create policy "Users manage own workout sessions"
  on public.workout_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Session exercises
create table public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  order_index int not null default 0,
  started_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.session_exercises enable row level security;

create policy "Users manage own session exercises"
  on public.session_exercises for all
  using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_exercises.session_id and ws.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_exercises.session_id and ws.user_id = auth.uid()
    )
  );

-- Session sets
create table public.session_sets (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null references public.session_exercises (id) on delete cascade,
  set_number int not null,
  weight_kg numeric not null default 0,
  reps int not null default 0,
  rpe numeric check (rpe is null or (rpe >= 1 and rpe <= 10)),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.session_sets enable row level security;

create policy "Users manage own session sets"
  on public.session_sets for all
  using (
    exists (
      select 1
      from public.session_exercises se
      join public.workout_sessions ws on ws.id = se.session_id
      where se.id = session_sets.session_exercise_id and ws.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.session_exercises se
      join public.workout_sessions ws on ws.id = se.session_id
      where se.id = session_sets.session_exercise_id and ws.user_id = auth.uid()
    )
  );

-- User integrations (calendar tokens - server writes via service role)
create table public.user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  refresh_token text not null,
  calendar_id text,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

alter table public.user_integrations enable row level security;

create policy "Users can view own integrations"
  on public.user_integrations for select
  using (auth.uid() = user_id);

-- No insert/update/delete for client - service role only in API routes

-- Scheduled workouts
create table public.scheduled_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_day_id uuid references public.plan_days (id) on delete set null,
  google_event_id text,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  status text not null default 'scheduled',
  created_at timestamptz not null default now()
);

alter table public.scheduled_workouts enable row level security;

create policy "Users manage own scheduled workouts"
  on public.scheduled_workouts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Weekly stats view
create or replace view public.user_weekly_stats
with (security_invoker = true)
as
select
  ws.user_id,
  date_trunc('week', coalesce(ws.ended_at, ws.started_at))::date as week_start,
  count(distinct ws.id)::int as workout_count,
  coalesce(sum(ss.weight_kg * ss.reps), 0)::numeric as total_volume_kg
from public.workout_sessions ws
left join public.session_exercises se on se.session_id = ws.id
left join public.session_sets ss on ss.session_exercise_id = se.id
where ws.status = 'completed'
group by ws.user_id, date_trunc('week', coalesce(ws.ended_at, ws.started_at));

grant select on public.user_weekly_stats to authenticated;

-- Indexes
create index idx_workout_sessions_user_status on public.workout_sessions (user_id, status);
create index idx_workout_sessions_started on public.workout_sessions (user_id, started_at desc);
create index idx_session_sets_exercise on public.session_sets (session_exercise_id);
create index idx_plan_days_plan on public.plan_days (plan_id);
create index idx_workout_plans_user_active on public.workout_plans (user_id, is_active);
