"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateLlmWorkoutPlanWithMeta } from "@/lib/plan/llm/generate";
import {
  loadLatestOnboarding,
  loadPlanSnapshot,
  onboardingRowToGeneratorParams,
} from "@/lib/plan/onboarding-params";
import { replaceDraftPlanContent } from "@/lib/plan/replace-draft";
import { reviseDraftPlanInPlace } from "@/lib/plan/revise-draft";
import { planRevisionSchema } from "@/lib/validations/plan-revision";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function getActivePlanId(supabase: SupabaseClient, userId: string) {
  const { data: plan } = await supabase
    .from("workout_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  return plan?.id ?? null;
}

/** Draft proposal takes priority over the active plan for editing. */
async function getEditablePlanId(supabase: SupabaseClient, userId: string) {
  const { data: draft } = await supabase
    .from("workout_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (draft) return draft.id;
  return getActivePlanId(supabase, userId);
}

export async function confirmPlan(planId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: plan } = await supabase
    .from("workout_plans")
    .select("id, user_id, is_active")
    .eq("id", planId)
    .single();

  if (!plan || plan.user_id !== user.id) {
    throw new Error("Plan not found");
  }
  if (plan.is_active) {
    redirect("/plan?ready=1");
  }

  await supabase
    .from("workout_plans")
    .update({ is_active: false })
    .eq("user_id", user.id)
    .eq("is_active", true);

  const { error } = await supabase
    .from("workout_plans")
    .update({ is_active: true })
    .eq("id", planId);

  if (error) throw new Error(error.message);

  revalidatePath("/plan");
  revalidatePath("/workout");
  revalidatePath("/dashboard");
  redirect("/plan?ready=1");
}

export async function regenerateDraftPlan(
  planId: string,
  revisionNotes: string
): Promise<{ error?: string; message?: string }> {
  const parsed = planRevisionSchema.safeParse({ planId, revisionNotes });
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors.revisionNotes?.[0];
    return { error: msg ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: plan } = await supabase
    .from("workout_plans")
    .select("id, user_id, name, is_active")
    .eq("id", parsed.data.planId)
    .single();

  if (!plan || plan.user_id !== user.id || plan.is_active) {
    return { error: "Draft plan not found" };
  }

  const { params: onboarding, error: onboardingError } =
    await loadLatestOnboarding(supabase, user.id);
  if (!onboarding) {
    return {
      error:
        onboardingError ??
        "No questionnaire data found. Retake onboarding to regenerate.",
    };
  }

  const previousPlan = await loadPlanSnapshot(
    supabase,
    plan.id,
    plan.name
  );

  const generatorParams = onboardingRowToGeneratorParams(onboarding, {
    revisionNotes: parsed.data.revisionNotes,
    previousPlan,
  });

  const { data: catalog } = await supabase
    .from("exercises")
    .select("slug, name, category, equipment");

  let llmFailureDetail: string | undefined;

  if (catalog?.length) {
    const llmResult = await generateLlmWorkoutPlanWithMeta(
      generatorParams,
      catalog
    );
    if (llmResult.plan) {
      const replaced = await replaceDraftPlanContent(
        supabase,
        plan.id,
        llmResult.plan,
        generatorParams
      );
      if (replaced.ok) {
        revalidatePath("/plan");
        return {
          message: "Plan regenerated with AI using your requested changes.",
        };
      }
      llmFailureDetail = replaced.error;
      console.error("[regenerate] AI replace failed:", replaced.error);
    } else {
      llmFailureDetail = llmResult.detail;
      console.error(
        "[regenerate] LLM failed:",
        llmResult.failure,
        llmResult.detail
      );
    }
  }

  const { data: planDayRows } = await supabase
    .from("plan_days")
    .select("id")
    .eq("plan_id", plan.id);

  const planDayIds = planDayRows?.map((d) => d.id) ?? [];

  if (planDayIds.length > 0) {
    const { count: exerciseCount } = await supabase
      .from("plan_day_exercises")
      .select("id", { count: "exact", head: true })
      .in("plan_day_id", planDayIds);

    if (!exerciseCount) {
      return {
        error:
          "Your plan has no exercises left. Retake onboarding at /onboarding?retake=1 to build a new plan.",
      };
    }
  } else {
    return {
      error:
        "Your plan has no workout days. Retake onboarding at /onboarding?retake=1 to build a new plan.",
    };
  }

  const revised = await reviseDraftPlanInPlace(
    supabase,
    plan.id,
    parsed.data.revisionNotes,
    generatorParams
  );

  if (!revised.ok) {
    const aiHint = llmFailureDetail
      ? ` AI note: ${llmFailureDetail}`
      : "";
    return {
      error: `${revised.error ?? "Failed to apply changes"}${aiHint}`,
    };
  }

  revalidatePath("/plan");

  const aiNote = llmFailureDetail
    ? " (AI was unavailable; changes applied automatically.)"
    : "";

  return {
    message: `Updated ${revised.changes} exercise(s) to match your request.${aiNote}`,
  };
}

export async function discardDraftPlan(planId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: plan } = await supabase
    .from("workout_plans")
    .select("id, user_id, is_active")
    .eq("id", planId)
    .single();

  if (!plan || plan.user_id !== user.id || plan.is_active) {
    throw new Error("Draft not found");
  }

  const { error } = await supabase
    .from("workout_plans")
    .delete()
    .eq("id", planId);

  if (error) throw new Error(error.message);

  revalidatePath("/plan");
  redirect("/plan");
}

async function assertPlanDayOwnership(
  supabase: SupabaseClient,
  planDayId: string,
  userId: string
) {
  const { data: day } = await supabase
    .from("plan_days")
    .select("id, plan_id")
    .eq("id", planDayId)
    .single();

  if (!day) throw new Error("Plan day not found");

  const { data: plan } = await supabase
    .from("workout_plans")
    .select("user_id")
    .eq("id", day.plan_id)
    .single();

  if (!plan || plan.user_id !== userId) throw new Error("Plan day not found");
  return day;
}

async function assertPlanExerciseOwnership(
  supabase: SupabaseClient,
  planExerciseId: string,
  userId: string
) {
  const { data: row } = await supabase
    .from("plan_day_exercises")
    .select("id, plan_day_id")
    .eq("id", planExerciseId)
    .single();

  if (!row) throw new Error("Exercise not found");
  await assertPlanDayOwnership(supabase, row.plan_day_id, userId);
  return row;
}

export async function addPlanDay(
  label: string,
  dayIndex?: number,
  isRestDay = false
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const planId = await getEditablePlanId(supabase, user.id);
  if (!planId) throw new Error("No plan to edit");

  const { data: existing } = await supabase
    .from("plan_days")
    .select("day_index")
    .eq("plan_id", planId)
    .order("day_index");

  const used = new Set((existing ?? []).map((d) => d.day_index));
  let index = dayIndex ?? 1;
  if (dayIndex == null) {
    while (used.has(index) && index <= 7) index++;
  }
  if (index < 1 || index > 7) throw new Error("Invalid weekday");
  if (used.has(index)) throw new Error("That weekday already has a workout");

  const { error } = await supabase.from("plan_days").insert({
    plan_id: planId,
    day_index: index,
    label: label.trim() || (isRestDay ? "Rest" : "Workout"),
    is_rest_day: isRestDay,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/plan");
}

export async function removePlanDay(planDayId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await assertPlanDayOwnership(supabase, planDayId, user.id);

  const { error } = await supabase.from("plan_days").delete().eq("id", planDayId);
  if (error) throw new Error(error.message);
  revalidatePath("/plan");
}

export async function setPlanDayRest(planDayId: string, isRestDay: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await assertPlanDayOwnership(supabase, planDayId, user.id);

  const { data: day } = await supabase
    .from("plan_days")
    .select("label")
    .eq("id", planDayId)
    .single();

  const update: { is_rest_day: boolean; label?: string } = {
    is_rest_day: isRestDay,
  };
  if (!isRestDay && day?.label?.trim().toLowerCase() === "rest") {
    update.label = "Workout";
  }

  const { error } = await supabase
    .from("plan_days")
    .update(update)
    .eq("id", planDayId);

  if (error) throw new Error(error.message);
  revalidatePath("/plan");
  revalidatePath("/workout");
}

export async function updatePlanDayLabel(planDayId: string, label: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await assertPlanDayOwnership(supabase, planDayId, user.id);

  const { error } = await supabase
    .from("plan_days")
    .update({ label: label.trim() })
    .eq("id", planDayId);

  if (error) throw new Error(error.message);
  revalidatePath("/plan");
}

export async function addPlanExercise(
  planDayId: string,
  exerciseId: string,
  sets = 3,
  repsMin = 8,
  repsMax = 12,
  restSeconds = 90
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await assertPlanDayOwnership(supabase, planDayId, user.id);

  const { data: existing } = await supabase
    .from("plan_day_exercises")
    .select("order_index")
    .eq("plan_day_id", planDayId)
    .order("order_index", { ascending: false })
    .limit(1);

  const orderIndex = (existing?.[0]?.order_index ?? -1) + 1;

  const { error } = await supabase.from("plan_day_exercises").insert({
    plan_day_id: planDayId,
    exercise_id: exerciseId,
    order_index: orderIndex,
    sets,
    reps_min: repsMin,
    reps_max: repsMax,
    rest_seconds: restSeconds,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/plan");
}

export async function removePlanExercise(planExerciseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await assertPlanExerciseOwnership(supabase, planExerciseId, user.id);

  const { error } = await supabase
    .from("plan_day_exercises")
    .delete()
    .eq("id", planExerciseId);

  if (error) throw new Error(error.message);
  revalidatePath("/plan");
}

export async function reorderPlanExercises(
  planDayId: string,
  orderedExerciseIds: string[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await assertPlanDayOwnership(supabase, planDayId, user.id);

  const { data: rows } = await supabase
    .from("plan_day_exercises")
    .select("id, order_index")
    .eq("plan_day_id", planDayId);

  const ids = new Set((rows ?? []).map((r) => r.id));
  if (
    !rows ||
    rows.length !== orderedExerciseIds.length ||
    !orderedExerciseIds.every((id) => ids.has(id))
  ) {
    throw new Error("Invalid exercise order");
  }

  for (const row of rows) {
    const { error } = await supabase
      .from("plan_day_exercises")
      .update({ order_index: row.order_index + 1000 })
      .eq("id", row.id);
    if (error) throw new Error(error.message);
  }

  for (let i = 0; i < orderedExerciseIds.length; i++) {
    const { error } = await supabase
      .from("plan_day_exercises")
      .update({ order_index: i })
      .eq("id", orderedExerciseIds[i]);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/plan");
}

export async function updatePlanExercise(
  planExerciseId: string,
  fields: {
    sets?: number;
    repsMin?: number;
    repsMax?: number;
    restSeconds?: number;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await assertPlanExerciseOwnership(supabase, planExerciseId, user.id);

  const update: Record<string, number> = {};
  if (fields.sets !== undefined) update.sets = fields.sets;
  if (fields.repsMin !== undefined) update.reps_min = fields.repsMin;
  if (fields.repsMax !== undefined) update.reps_max = fields.repsMax;
  if (fields.restSeconds !== undefined) update.rest_seconds = fields.restSeconds;

  const { error } = await supabase
    .from("plan_day_exercises")
    .update(update)
    .eq("id", planExerciseId);

  if (error) throw new Error(error.message);
  revalidatePath("/plan");
}
