import type { SupabaseClient } from "@supabase/supabase-js";

export type CurrentPlan = {
  id: string;
  name: string;
  isProposal: boolean;
};

type PlanRow = {
  id: string;
  name: string;
  created_at: string;
};

function isOpenProposal(draft: PlanRow | null, active: PlanRow | null) {
  if (!draft) return false;
  if (!active) return true;
  return draft.created_at > active.created_at;
}

/** Draft proposals are inactive and newer than the active plan. Older inactive plans are superseded. */
export async function getCurrentPlan(
  supabase: SupabaseClient,
  userId: string
): Promise<CurrentPlan | null> {
  const [{ data: draft }, { data: active }] = await Promise.all([
    supabase
      .from("workout_plans")
      .select("id, name, created_at")
      .eq("user_id", userId)
      .eq("is_active", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("workout_plans")
      .select("id, name, created_at")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (isOpenProposal(draft, active) && draft) {
    return { id: draft.id, name: draft.name, isProposal: true };
  }
  if (active) {
    return { id: active.id, name: active.name, isProposal: false };
  }
  return null;
}

export async function activatePlanForUser(
  supabase: SupabaseClient,
  userId: string,
  planId: string
) {
  const { data: plan, error: planError } = await supabase
    .from("workout_plans")
    .select("id, user_id, is_active")
    .eq("id", planId)
    .single();

  if (planError || !plan || plan.user_id !== userId) {
    throw new Error("Plan not found");
  }
  if (plan.is_active) return;

  const { error: deactivateError } = await supabase
    .from("workout_plans")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("is_active", true);
  if (deactivateError) throw new Error(deactivateError.message);

  const { error: activateError } = await supabase
    .from("workout_plans")
    .update({ is_active: true })
    .eq("id", planId);
  if (activateError) throw new Error(activateError.message);
}

export async function activatePlanOwningDay(
  supabase: SupabaseClient,
  userId: string,
  planDayId: string
) {
  const { data: day, error: dayError } = await supabase
    .from("plan_days")
    .select("id, plan_id")
    .eq("id", planDayId)
    .single();

  if (dayError || !day) throw new Error("Plan day not found");

  await activatePlanForUser(supabase, userId, day.plan_id);
}
