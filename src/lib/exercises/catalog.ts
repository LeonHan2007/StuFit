import type { SupabaseClient } from "@supabase/supabase-js";
import type { Exercise } from "@/types/database";
import { sortExercisesByCategory } from "@/lib/exercises/constants";

const EXERCISE_SUMMARY_SELECT =
  "id, slug, name, muscle_group, equipment, category, difficulty";

const EXERCISE_DETAIL_SELECT =
  "id, slug, name, muscle_group, equipment, category, technique_md, youtube_url, difficulty";

export async function fetchExerciseCatalog(
  supabase: SupabaseClient,
  options?: { includeDetails?: boolean }
): Promise<Exercise[]> {
  const query = options?.includeDetails
    ? supabase.from("exercises").select(EXERCISE_DETAIL_SELECT)
    : supabase.from("exercises").select(EXERCISE_SUMMARY_SELECT);
  const { data, error } = await query.order("name");

  if (error || !data) return [];
  return sortExercisesByCategory(data as unknown as Exercise[]);
}
