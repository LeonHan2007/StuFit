-- Social features, profile extensions, rest days, friendships, avatars storage

create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- Profile extensions
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists username citext,
  add column if not exists avatar_url text,
  add column if not exists is_public boolean not null default false,
  add column if not exists bio text;

alter table public.profiles
  drop constraint if exists profiles_username_format;

alter table public.profiles
  add constraint profiles_username_format check (
    username is null
    or username::text ~ '^[a-z][a-z0-9_]{2,29}$'
  );

create unique index if not exists profiles_username_unique
  on public.profiles (username)
  where username is not null;

-- Backfill usernames from display_name or email local-part
do $$
declare
  r record;
  base text;
  candidate citext;
  suffix int;
begin
  for r in
    select p.id, p.display_name, u.email
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.username is null
  loop
    base := lower(regexp_replace(
      coalesce(nullif(trim(r.display_name), ''), split_part(r.email, '@', 1)),
      '[^a-z0-9]+',
      '_',
      'g'
    ));
    base := regexp_replace(base, '^_+|_+$', '', 'g');
    if base = '' or base !~ '^[a-z]' then
      base := 'athlete';
    end if;
    base := left(base, 29);
    candidate := base::citext;
    suffix := 2;
    while exists (select 1 from public.profiles where username = candidate and id <> r.id) loop
      candidate := (left(base, 27) || suffix::text)::citext;
      suffix := suffix + 1;
    end loop;
    update public.profiles set username = candidate where id = r.id;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Plan rest days
-- ---------------------------------------------------------------------------
alter table public.plan_days
  add column if not exists is_rest_day boolean not null default false;

-- Backfill missing weekdays as rest days (preserve existing training rows)
insert into public.plan_days (plan_id, day_index, label, is_rest_day)
select wp.id, gs.idx, 'Rest', true
from public.workout_plans wp
cross join generate_series(1, 7) as gs(idx)
where not exists (
  select 1
  from public.plan_days pd
  where pd.plan_id = wp.id and pd.day_index = gs.idx
)
on conflict (plan_id, day_index) do nothing;

-- ---------------------------------------------------------------------------
-- Friendships
-- ---------------------------------------------------------------------------
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  check (requester_id <> addressee_id)
);

create unique index if not exists friendships_pair_unique
  on public.friendships (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

alter table public.friendships enable row level security;

drop policy if exists "Users view own friendships" on public.friendships;
create policy "Users view own friendships"
  on public.friendships for select
  using (auth.uid() in (requester_id, addressee_id));

drop policy if exists "Users send friend requests" on public.friendships;
create policy "Users send friend requests"
  on public.friendships for insert
  with check (auth.uid() = requester_id and status = 'pending');

drop policy if exists "Addressee updates friendship" on public.friendships;
create policy "Addressee updates friendship"
  on public.friendships for update
  using (auth.uid() = addressee_id)
  with check (auth.uid() = addressee_id);

drop policy if exists "Participants delete friendship" on public.friendships;
create policy "Participants delete friendship"
  on public.friendships for delete
  using (auth.uid() in (requester_id, addressee_id));

-- ---------------------------------------------------------------------------
-- Profile RLS: public + friends can read
-- ---------------------------------------------------------------------------
drop policy if exists "Users can view public profiles" on public.profiles;
create policy "Users can view public profiles"
  on public.profiles for select
  using (is_public = true);

drop policy if exists "Users can view friends profiles" on public.profiles;
create policy "Users can view friends profiles"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = auth.uid() and f.addressee_id = profiles.id)
          or (f.addressee_id = auth.uid() and f.requester_id = profiles.id)
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Storage: avatars bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated users can read avatars" on storage.objects;
create policy "Authenticated users can read avatars"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars');

drop policy if exists "Users upload own avatar" on storage.objects;
create policy "Users upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users update own avatar" on storage.objects;
create policy "Users update own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users delete own avatar" on storage.objects;
create policy "Users delete own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
