import type { SupabaseClient } from "@supabase/supabase-js";
import { HOME_EQUIPMENT } from "@/lib/exercises/constants";
import type { GeneratorParams } from "@/lib/plan/templates/types";
import type { Exercise, ExerciseCategory } from "@/types/database";
import {
  effectiveModalitiesForRevision,
  equipmentMatchesExclude,
  hasActionableRevisionRules,
  parseRevisionRules,
  type RevisionRules,
} from "@/lib/plan/revision-rules";

function catalogAllowedForUser(
  ex: Exercise,
  params: GeneratorParams,
  rules: RevisionRules
): boolean {
  const modalitySet = effectiveModalitiesForRevision(params, rules);
  if (!modalitySet.has(ex.category)) return false;
  if (params.equipment === "home" && !HOME_EQUIPMENT.has(ex.equipment)) {
    return false;
  }
  if (equipmentMatchesExclude(ex.equipment, rules.excludeEquipment)) {
    return false;
  }
  return true;
}

function defaultPrescription(category: ExerciseCategory): {
  sets: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number;
} {
  switch (category) {
    case "cardio":
      return { sets: 3, reps_min: 30, reps_max: 45, rest_seconds: 60 };
    case "stretching":
      return { sets: 2, reps_min: 30, reps_max: 45, rest_seconds: 15 };
    case "plyometrics":
      return { sets: 4, reps_min: 5, reps_max: 8, rest_seconds: 90 };
    default:
      return { sets: 3, reps_min: 8, reps_max: 12, rest_seconds: 90 };
  }
}

function findReplacement(
  current: Exercise,
  catalog: Exercise[],
  excludeEquipment: string[],
  usedOnDay: Set<string>
): Exercise | null {
  const candidates = catalog.filter(
    (c) =>
      !equipmentMatchesExclude(c.equipment, excludeEquipment) &&
      !usedOnDay.has(c.id) &&
      c.id !== current.id
  );

  const sameMuscle = candidates.filter(
    (c) => c.muscle_group === current.muscle_group
  );
  if (sameMuscle.length > 0) return sameMuscle[0];

  const sameCategory = candidates.filter((c) => c.category === current.category);
  if (sameCategory.length > 0) return sameCategory[0];

  return candidates[0] ?? null;
}

function countExercisesOnDay(
  rows: Array<{ exercises: unknown }>
): number {
  return rows.filter((row) => {
    const ex = Array.isArray(row.exercises) ? row.exercises[0] : row.exercises;
    return Boolean(ex);
  }).length;
}

async function applyEquipmentExclusions(
  supabase: SupabaseClient,
  planDays: Array<{ id: string }>,
  catalog: Exercise[],
  rules: RevisionRules
): Promise<number> {
  let changes = 0;

  for (const day of planDays) {
    const { data: rows } = await supabase
      .from("plan_day_exercises")
      .select(
        `
        id,
        exercise_id,
        exercises ( id, slug, name, muscle_group, equipment, category )
      `
      )
      .eq("plan_day_id", day.id)
      .order("order_index");

    if (!rows) continue;

    const usedOnDay = new Set<string>();
    const exerciseCount = countExercisesOnDay(rows);

    for (const row of rows) {
      const ex = Array.isArray(row.exercises)
        ? row.exercises[0]
        : row.exercises;
      if (!ex) continue;

      usedOnDay.add(ex.id);

      if (!equipmentMatchesExclude(ex.equipment, rules.excludeEquipment)) {
        continue;
      }

      const replacement = findReplacement(
        ex as Exercise,
        catalog,
        rules.excludeEquipment,
        usedOnDay
      );

      if (!replacement) {
        // Never delete the last exercise on a day — avoids wiping the workout
        if (exerciseCount <= 1) continue;
        await supabase.from("plan_day_exercises").delete().eq("id", row.id);
        changes += 1;
        continue;
      }

      const { error: updateError } = await supabase
        .from("plan_day_exercises")
        .update({ exercise_id: replacement.id })
        .eq("id", row.id);

      if (!updateError) {
        usedOnDay.add(replacement.id);
        changes += 1;
      }
    }
  }

  return changes;
}

async function addPreferredCategories(
  supabase: SupabaseClient,
  planDays: Array<{ id: string }>,
  catalog: Exercise[],
  rules: RevisionRules,
  revisionNotes: string
): Promise<number> {
  let changes = 0;
  const poolByCategory = new Map<string, Exercise[]>();

  for (const category of rules.preferCategories) {
    const pool = catalog.filter((c) => c.category === category);
    if (pool.length > 0) poolByCategory.set(category, pool);
  }

  let poolIndex = 0;

  for (const day of planDays) {
    const { data: rows } = await supabase
      .from("plan_day_exercises")
      .select(
        `
        id,
        order_index,
        exercises ( id, category )
      `
      )
      .eq("plan_day_id", day.id)
      .order("order_index");

    const usedOnDay = new Set(
      (rows ?? [])
        .map((r) => {
          const ex = Array.isArray(r.exercises) ? r.exercises[0] : r.exercises;
          return ex?.id;
        })
        .filter(Boolean) as string[]
    );

    let nextOrder =
      rows?.length ? Math.max(...rows.map((r) => r.order_index)) + 1 : 0;

    for (const category of rules.preferCategories) {
      const pool = poolByCategory.get(category);
      if (!pool?.length) continue;

      let countOnDay = (rows ?? []).filter((r) => {
        const ex = Array.isArray(r.exercises) ? r.exercises[0] : r.exercises;
        return ex?.category === category;
      }).length;
      const wantsMore =
        revisionNotes.toLowerCase().includes("more") ||
        revisionNotes.toLowerCase().includes("add more");
      const targetCount = wantsMore ? 2 : 1;
      const toAdd = Math.max(0, targetCount - countOnDay);

      for (let i = 0; i < toAdd; i++) {
        const pick =
          pool.find((c) => !usedOnDay.has(c.id)) ??
          pool[poolIndex % pool.length];
        poolIndex += 1;

        const rx = defaultPrescription(category as ExerciseCategory);
        const { error } = await supabase.from("plan_day_exercises").insert({
          plan_day_id: day.id,
          exercise_id: pick.id,
          order_index: nextOrder,
          sets: rx.sets,
          reps_min: rx.reps_min,
          reps_max: rx.reps_max,
          rest_seconds: rx.rest_seconds,
        });

        if (!error) {
          usedOnDay.add(pick.id);
          countOnDay += 1;
          nextOrder += 1;
          changes += 1;
        }
      }
    }
  }

  return changes;
}

export async function reviseDraftPlanInPlace(
  supabase: SupabaseClient,
  planId: string,
  revisionNotes: string,
  params: GeneratorParams
): Promise<{ ok: boolean; changes: number; error?: string }> {
  const rules = parseRevisionRules(revisionNotes);
  if (!hasActionableRevisionRules(rules)) {
    return {
      ok: false,
      changes: 0,
      error:
        'Could not understand that request. Try "add more cardio" or "remove all dumbbell exercises".',
    };
  }

  const { data: catalogRows, error: catalogError } = await supabase
    .from("exercises")
    .select(
      "id, slug, name, muscle_group, equipment, category, technique_md, youtube_url, difficulty"
    );

  if (catalogError || !catalogRows?.length) {
    return { ok: false, changes: 0, error: catalogError?.message ?? "No exercises" };
  }

  const catalog = catalogRows.filter((ex) =>
    catalogAllowedForUser(ex as Exercise, params, rules)
  ) as Exercise[];

  const { data: planDays, error: daysError } = await supabase
    .from("plan_days")
    .select("id")
    .eq("plan_id", planId);

  if (daysError || !planDays?.length) {
    return { ok: false, changes: 0, error: daysError?.message ?? "Plan days not found" };
  }

  let changes = 0;

  if (rules.excludeEquipment.length > 0) {
    changes += await applyEquipmentExclusions(
      supabase,
      planDays,
      catalog,
      rules
    );
  }

  if (rules.preferCategories.length > 0) {
    changes += await addPreferredCategories(
      supabase,
      planDays,
      catalog,
      rules,
      revisionNotes
    );
  }

  if (changes === 0) {
    const missingModality = rules.preferCategories.filter(
      (cat) => !catalog.some((c) => c.category === cat)
    );
    if (missingModality.length > 0) {
      return {
        ok: false,
        changes: 0,
        error: `No ${missingModality.join(", ")} exercises available for your equipment. Try retaking onboarding with that modality selected.`,
      };
    }
    return {
      ok: false,
      changes: 0,
      error: "No changes could be applied. Try editing exercises manually below.",
    };
  }

  await supabase
    .from("workout_plans")
    .update({ name: "Revised plan" })
    .eq("id", planId);

  return { ok: true, changes };
}
