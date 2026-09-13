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
  'pec-deck',
  'Pec Deck',
  'chest',
  'machine',
  'weightlifting',
  'beginner',
  E'## Technique\n- Set seat so upper arms stay parallel to floor\n- Keep shoulder blades retracted against pad\n- Bring handles together with controlled squeeze\n- Return slowly without letting weight stack slam',
  null
)
on conflict (slug) do nothing;
