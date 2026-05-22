import type { SupabaseClient } from "@supabase/supabase-js";
import type { Exercise } from "@/types/database";
import { sortExercisesByCategory } from "@/lib/exercises/constants";

const EXERCISE_SELECT =
  "id, slug, name, muscle_group, equipment, category, technique_md, youtube_url, difficulty";

export async function fetchExerciseCatalog(
  supabase: SupabaseClient
): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select(EXERCISE_SELECT)
    .order("name");

  if (error || !data) return [];
  return sortExercisesByCategory(data as Exercise[]);
}
