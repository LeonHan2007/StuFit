import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  EquipmentAccess,
  ExerciseModality,
  Experience,
  WorkoutGoal,
} from "@/types/database";
import type { GeneratorParams, PreviousPlanSnapshot } from "@/lib/plan/templates/types";

export async function loadLatestOnboarding(
  supabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from("user_onboarding")
    .select(
      "goals, exercise_modalities, days_per_week, session_minutes, experience, equipment, injuries_notes"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return { params: null, error: error?.message ?? "No onboarding data" };
  return { params: data, error: null };
}

export async function loadPlanSnapshot(
  supabase: SupabaseClient,
  planId: string,
  planName: string
): Promise<PreviousPlanSnapshot | null> {
  const { data: planDays } = await supabase
    .from("plan_days")
    .select(
      `
      label,
      plan_day_exercises (
        order_index,
        sets,
        reps_min,
        reps_max,
        rest_seconds,
        exercises ( slug, name )
      )
    `
    )
    .eq("plan_id", planId)
    .order("day_index");

  if (!planDays?.length) return null;

  const days = planDays.map((day) => {
    const exercises = [...(day.plan_day_exercises ?? [])]
      .sort((a, b) => a.order_index - b.order_index)
      .map((pe) => {
        const ex = Array.isArray(pe.exercises) ? pe.exercises[0] : pe.exercises;
        if (!ex?.slug) return null;
        return {
          slug: ex.slug,
          name: ex.name,
          sets: pe.sets,
          repsMin: pe.reps_min,
          repsMax: pe.reps_max,
          restSeconds: pe.rest_seconds,
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    return { label: day.label, exercises };
  });

  return { planName, days };
}

export function onboardingRowToGeneratorParams(
  row: {
    goals: string[];
    exercise_modalities: string[];
    days_per_week: number;
    session_minutes: number;
    experience: string;
    equipment: string;
    injuries_notes: string | null;
  },
  options?: {
    revisionNotes?: string | null;
    previousPlan?: PreviousPlanSnapshot | null;
  }
): GeneratorParams {
  return {
    goals: row.goals as WorkoutGoal[],
    exerciseModalities: row.exercise_modalities as ExerciseModality[],
    daysPerWeek: row.days_per_week,
    sessionMinutes: row.session_minutes,
    experience: row.experience as Experience,
    equipment: row.equipment as EquipmentAccess,
    injuriesNotes: row.injuries_notes,
    revisionNotes: options?.revisionNotes ?? null,
    previousPlan: options?.previousPlan ?? null,
  };
}
