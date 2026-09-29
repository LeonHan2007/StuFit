insert into public.exercises (
  slug,
  name,
  muscle_group,
  equipment,
  category,
  difficulty,
  technique_md,
  youtube_url
)
values (
  'dumbbell-curl',
  'Dumbbell Curl',
  'arms',
  'dumbbell',
  'weightlifting',
  'beginner',
  E'## Technique\n- Elbows at sides, palms facing forward\n- Curl without swinging the torso\n- Squeeze at the top, then lower under control',
  null
)
on conflict (slug) do nothing;
