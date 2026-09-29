import type { SupabaseClient } from "@supabase/supabase-js";
import { HOME_EQUIPMENT } from "@/lib/exercises/constants";
import type { GeneratorParams } from "@/lib/plan/templates/types";
import type { LlmWorkoutPlan } from "@/lib/plan/llm/schema";
import {
  equipmentMatchesExclude,
  parseRevisionRules,
} from "@/lib/plan/revision-rules";

interface ExerciseRow {
  id: string;
  slug: string;
  equipment: string;
}

interface BuiltDay {
  dayIndex: number;
  label: string;
  isRestDay: boolean;
  rows: Array<{
    exercise_id: string;
    order_index: number;
    sets: number;
    reps_min: number;
    reps_max: number;
    rest_seconds: number;
  }>;
}

async function loadExerciseMap(
  supabase: SupabaseClient,
  slugs: string[]
): Promise<{ map: Map<string, ExerciseRow>; error?: string }> {
  if (slugs.length === 0) {
    return { map: new Map() };
  }

  const { data: exercises, error: exError } = await supabase
    .from("exercises")
    .select("id, slug, equipment")
    .in("slug", slugs);

  if (exError || !exercises?.length) {
    return {
      map: new Map(),
      error: exError?.message ?? "Exercises not found",
    };
  }

  return { map: new Map(exercises.map((e) => [e.slug, e])) };
}

function buildReplacementDays(
  llmPlan: LlmWorkoutPlan,
  exerciseMap: Map<string, ExerciseRow>,
  params: GeneratorParams,
  rules: ReturnType<typeof parseRevisionRules>
): { days: BuiltDay[]; totalExercises: number } | { error: string } {
  const days: BuiltDay[] = [];

  for (const [index, day] of llmPlan.days.entries()) {
    const isRestDay = Boolean(day.isRestDay);
    const rows: BuiltDay["rows"] = [];

    if (!isRestDay) {
      day.exercises.forEach((slot, orderIndex) => {
        const ex = exerciseMap.get(slot.slug);
        if (!ex) return;
        if (params.equipment === "home" && !HOME_EQUIPMENT.has(ex.equipment)) {
          return;
        }
        if (equipmentMatchesExclude(ex.equipment, rules.excludeEquipment)) {
          return;
        }
        rows.push({
          exercise_id: ex.id,
          order_index: orderIndex,
          sets: slot.sets,
          reps_min: slot.repsMin,
          reps_max: slot.repsMax,
          rest_seconds: slot.restSeconds,
        });
      });
    }

    days.push({
      dayIndex: index + 1,
      label: day.label,
      isRestDay,
      rows,
    });
  }

  const totalExercises = days.reduce((sum, d) => sum + d.rows.length, 0);
  const trainingDays = days.filter((d) => !d.isRestDay);

  if (totalExercises === 0) {
    return {
      error:
        "AI plan had no valid exercises after filtering. Your original plan was kept.",
    };
  }

  if (trainingDays.some((d) => d.rows.length === 0)) {
    return {
      error:
        "AI plan had empty training days. Your original plan was kept.",
    };
  }

  if (days.length !== 7) {
    return {
      error: "AI plan must include exactly 7 days. Your original plan was kept.",
    };
  }

  return { days, totalExercises };
}

export async function replaceDraftPlanContent(
  supabase: SupabaseClient,
  planId: string,
  llmPlan: LlmWorkoutPlan,
  params: GeneratorParams
): Promise<{ ok: boolean; error?: string }> {
  const rules = params.revisionNotes
    ? parseRevisionRules(params.revisionNotes)
    : { excludeEquipment: [], preferCategories: [] };

  const slugs = [
    ...new Set(
      llmPlan.days.flatMap((d) =>
        d.isRestDay ? [] : d.exercises.map((e) => e.slug)
      )
    ),
  ];

  const { map: exerciseMap, error: loadError } = await loadExerciseMap(
    supabase,
    slugs
  );
  if (loadError) return { ok: false, error: loadError };

  const built = buildReplacementDays(llmPlan, exerciseMap, params, rules);
  if ("error" in built) {
    return { ok: false, error: built.error };
  }

  const { error: deleteDaysError } = await supabase
    .from("plan_days")
    .delete()
    .eq("plan_id", planId);

  if (deleteDaysError) {
    return { ok: false, error: deleteDaysError.message };
  }

  const { error: nameError } = await supabase
    .from("workout_plans")
    .update({ name: llmPlan.planName })
    .eq("id", planId);

  if (nameError) {
    return { ok: false, error: nameError.message };
  }

  const { data: planDays, error: dayError } = await supabase
    .from("plan_days")
    .insert(
      built.days.map((day) => ({
        plan_id: planId,
        day_index: day.dayIndex,
        label: day.label,
        is_rest_day: day.isRestDay,
      }))
    )
    .select("id, day_index");

  if (dayError || !planDays?.length) {
    return {
      ok: false,
      error:
        dayError?.message ??
        "Failed while saving the new plan. Some days may be missing — try regenerating again.",
    };
  }

  const idByIndex = new Map(planDays.map((day) => [day.day_index, day.id]));
  const rows = built.days.flatMap((day) => {
    const planDayId = idByIndex.get(day.dayIndex);
    if (!planDayId) return [];
    return day.rows.map((row) => ({
      plan_day_id: planDayId,
      ...row,
    }));
  });

  if (rows.length > 0) {
    const { error: insertError } = await supabase
      .from("plan_day_exercises")
      .insert(rows);

    if (insertError) {
      return { ok: false, error: insertError.message };
    }
  }

  return { ok: true };
}
