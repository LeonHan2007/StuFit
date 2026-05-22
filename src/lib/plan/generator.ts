import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkoutGoal } from "@/types/database";
import { HOME_EQUIPMENT } from "@/lib/exercises/constants";
import { generateLlmWorkoutPlan } from "@/lib/plan/llm/generate";
import type { LlmWorkoutPlan } from "@/lib/plan/llm/schema";
import { buildSevenDayWeek } from "./build-seven-day-week";
import {
  fullBodyHomeTemplate,
  fullBodyTemplate,
} from "./templates/full-body";
import {
  upperLowerHomeTemplate,
  upperLowerTemplate,
} from "./templates/upper-lower";
import { pplHomeTemplate, pplTemplate } from "./templates/ppl";
import type {
  GeneratorParams,
  PlanTemplate,
  RepScheme,
  TemplateExerciseSlot,
} from "./templates/types";

function getRepScheme(goals: WorkoutGoal[]): RepScheme {
  const primary = goals[0] ?? "general";

  switch (primary) {
    case "strength":
      return { sets: 4, repsMin: 3, repsMax: 6, restSeconds: 180 };
    case "hypertrophy":
      return { sets: 3, repsMin: 8, repsMax: 12, restSeconds: 90 };
    case "endurance":
      return { sets: 3, repsMin: 12, repsMax: 20, restSeconds: 60 };
    case "athletic_performance":
      return { sets: 3, repsMin: 5, repsMax: 10, restSeconds: 120 };
    default:
      return { sets: 3, repsMin: 8, repsMax: 12, restSeconds: 90 };
  }
}

function selectTemplate(params: GeneratorParams): PlanTemplate {
  const isHome = params.equipment === "home";
  const days = params.daysPerWeek;

  if (days <= 3) {
    return isHome ? fullBodyHomeTemplate : fullBodyTemplate;
  }
  if (days === 4) {
    return isHome ? upperLowerHomeTemplate : upperLowerTemplate;
  }
  return isHome ? pplHomeTemplate : pplTemplate;
}

function templateToSevenDays(
  template: PlanTemplate,
  daysPerWeek: number
): Array<{
  dayIndex: number;
  label: string;
  isRestDay: boolean;
  exercises: TemplateExerciseSlot[];
}> {
  const training = template.days.slice(0, daysPerWeek).map((d) => ({
    label: d.label,
    exercises: d.exercises,
    dayIndex: d.dayIndex,
  }));
  return buildSevenDayWeek(training, daysPerWeek);
}

interface ExerciseRow {
  id: string;
  slug: string;
  equipment: string;
}

async function preparePlanSlot(
  supabase: SupabaseClient,
  userId: string,
  activate: boolean
): Promise<{ cleared: boolean; error?: string }> {
  if (activate) {
    const { error } = await supabase
      .from("workout_plans")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("is_active", true);
    if (error) return { cleared: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("workout_plans")
      .delete()
      .eq("user_id", userId)
      .eq("is_active", false);
    if (error) return { cleared: false, error: error.message };
  }
  return { cleared: true };
}

async function insertPlanDays(
  supabase: SupabaseClient,
  planId: string,
  days: Array<{
    dayIndex: number;
    label: string;
    isRestDay: boolean;
    exercises: Array<{
      slug: string;
      sets: number;
      repsMin: number;
      repsMax: number;
      restSeconds: number;
    }>;
  }>,
  exerciseMap: Map<string, ExerciseRow>
): Promise<void> {
  for (const day of days) {
    const { data: planDay, error: dayError } = await supabase
      .from("plan_days")
      .insert({
        plan_id: planId,
        day_index: day.dayIndex,
        label: day.label,
        is_rest_day: day.isRestDay,
      })
      .select("id")
      .single();

    if (dayError || !planDay) continue;

    const rows: Array<{
      plan_day_id: string;
      exercise_id: string;
      order_index: number;
      sets: number;
      reps_min: number;
      reps_max: number;
      rest_seconds: number;
    }> = [];

    day.exercises.forEach((slot, index) => {
      const ex = exerciseMap.get(slot.slug);
      if (!ex) return;
      rows.push({
        plan_day_id: planDay.id,
        exercise_id: ex.id,
        order_index: index,
        sets: slot.sets,
        reps_min: slot.repsMin,
        reps_max: slot.repsMax,
        rest_seconds: slot.restSeconds,
      });
    });

    if (rows.length > 0) {
      await supabase.from("plan_day_exercises").insert(rows);
    }
  }
}

async function loadExerciseMap(
  supabase: SupabaseClient,
  slugs: string[]
): Promise<{ map: Map<string, ExerciseRow>; error?: string }> {
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

async function generateFromTemplate(
  supabase: SupabaseClient,
  userId: string,
  params: GeneratorParams,
  activate: boolean
): Promise<{ planId: string; error?: string }> {
  const template = selectTemplate(params);
  const week = templateToSevenDays(template, params.daysPerWeek);
  const scheme = getRepScheme(params.goals);

  const slugs = [
    ...new Set(week.flatMap((d) => d.exercises.map((e) => e.slug))),
  ];

  const { map: exerciseMap, error: loadError } = await loadExerciseMap(
    supabase,
    slugs
  );
  if (loadError) return { planId: "", error: loadError };

  const filteredDays = week.map((day) => ({
    dayIndex: day.dayIndex,
    label: day.label,
    isRestDay: day.isRestDay,
    exercises: day.isRestDay
      ? []
      : day.exercises
          .filter((slot) => {
            const ex = exerciseMap.get(slot.slug);
            if (!ex) return false;
            if (params.equipment === "home") {
              return HOME_EQUIPMENT.has(ex.equipment);
            }
            return true;
          })
          .map((slot) => slotToPrescription(slot, scheme)),
  }));

  const prep = await preparePlanSlot(supabase, userId, activate);
  if (!prep.cleared) return { planId: "", error: prep.error };

  const { data: plan, error: planError } = await supabase
    .from("workout_plans")
    .insert({
      user_id: userId,
      name: template.name,
      source: "onboarding",
      is_active: activate,
    })
    .select("id")
    .single();

  if (planError || !plan) {
    return { planId: "", error: planError?.message ?? "Failed to create plan" };
  }

  await insertPlanDays(supabase, plan.id, filteredDays, exerciseMap);
  return { planId: plan.id };
}

function slotToPrescription(
  slot: TemplateExerciseSlot,
  scheme: RepScheme
): {
  slug: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
} {
  return {
    slug: slot.slug,
    sets: slot.sets ?? scheme.sets,
    repsMin: slot.repsMin ?? scheme.repsMin,
    repsMax: slot.repsMax ?? scheme.repsMax,
    restSeconds: slot.restSeconds ?? scheme.restSeconds,
  };
}

async function generateFromLlm(
  supabase: SupabaseClient,
  userId: string,
  params: GeneratorParams,
  activate: boolean
): Promise<{ planId: string; error?: string } | null> {
  const { data: catalog, error: catalogError } = await supabase
    .from("exercises")
    .select("slug, name, category, equipment");

  if (catalogError || !catalog?.length) {
    console.error("[llm] Catalog load failed:", catalogError?.message);
    return null;
  }

  const llmPlan = await generateLlmWorkoutPlan(params, catalog);
  if (!llmPlan) return null;

  return persistLlmPlan(supabase, userId, params, llmPlan, activate);
}

async function persistLlmPlan(
  supabase: SupabaseClient,
  userId: string,
  params: GeneratorParams,
  llmPlan: LlmWorkoutPlan,
  activate: boolean
): Promise<{ planId: string; error?: string }> {
  const slugs = [
    ...new Set(llmPlan.days.flatMap((d) => d.exercises.map((e) => e.slug))),
  ];

  const { map: exerciseMap, error: loadError } = await loadExerciseMap(
    supabase,
    slugs
  );
  if (loadError) return { planId: "", error: loadError };

  const days = llmPlan.days.map((day, index) => ({
    dayIndex: index + 1,
    label: day.label,
    isRestDay: Boolean(day.isRestDay),
    exercises: day.isRestDay
      ? []
      : day.exercises
          .filter((slot) => {
            const ex = exerciseMap.get(slot.slug);
            if (!ex) return false;
            if (params.equipment === "home") {
              return HOME_EQUIPMENT.has(ex.equipment);
            }
            return true;
          })
          .map((slot) => ({
            slug: slot.slug,
            sets: slot.sets,
            repsMin: slot.repsMin,
            repsMax: slot.repsMax,
            restSeconds: slot.restSeconds,
          })),
  }));

  const trainingDays = days.filter((d) => !d.isRestDay);
  if (trainingDays.some((d) => d.exercises.length === 0)) {
    return { planId: "", error: "LLM plan had no valid exercises" };
  }
  if (days.length !== 7) {
    return { planId: "", error: "LLM plan must have 7 days" };
  }

  const prep = await preparePlanSlot(supabase, userId, activate);
  if (!prep.cleared) return { planId: "", error: prep.error };

  const { data: plan, error: planError } = await supabase
    .from("workout_plans")
    .insert({
      user_id: userId,
      name: llmPlan.planName,
      source: "onboarding",
      is_active: activate,
    })
    .select("id")
    .single();

  if (planError || !plan) {
    return { planId: "", error: planError?.message ?? "Failed to create plan" };
  }

  await insertPlanDays(supabase, plan.id, days, exerciseMap);
  return { planId: plan.id };
}

export async function generateWorkoutPlan(
  supabase: SupabaseClient,
  userId: string,
  params: GeneratorParams,
  options?: { activate?: boolean }
): Promise<{ planId: string; error?: string }> {
  const activate = options?.activate ?? false;

  try {
    const llmResult = await generateFromLlm(
      supabase,
      userId,
      params,
      activate
    );
    if (llmResult?.planId) return llmResult;
    if (llmResult?.error) {
      console.error("[llm] Persist failed, falling back:", llmResult.error);
    }
  } catch (err) {
    console.error("[llm] Unexpected error, falling back:", err);
  }

  return generateFromTemplate(supabase, userId, params, activate);
}
