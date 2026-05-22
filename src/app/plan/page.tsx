import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchExerciseCatalog } from "@/lib/exercises/catalog";
import { AppShell } from "@/components/layout/app-shell";
import { PlanReadyToast } from "@/components/plan/plan-ready-toast";
import { PlanProposalBanner } from "@/components/plan/plan-proposal-banner";
import { PlanEditor } from "@/components/plan/plan-editor";
import { buttonVariants } from "@/components/ui/button";
async function loadPlanDays(supabase: Awaited<ReturnType<typeof createClient>>, planId: string) {
  return supabase
    .from("plan_days")
    .select(
      `
      id,
      day_index,
      label,
      is_rest_day,
      plan_day_exercises (
        id,
        exercise_id,
        order_index,
        sets,
        reps_min,
        reps_max,
        rest_seconds,
        exercises ( id, slug, name, muscle_group, equipment, category, technique_md, youtube_url, difficulty )
      )
    `
    )
    .eq("plan_id", planId)
    .order("day_index");
}

export default async function PlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarding_completed_at) {
    redirect("/onboarding");
  }

  const { data: draftPlan } = await supabase
    .from("workout_plans")
    .select("id, name")
    .eq("user_id", user.id)
    .eq("is_active", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: activePlan } = await supabase
    .from("workout_plans")
    .select("id, name")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  const plan = draftPlan ?? activePlan;

  if (!plan) {
    redirect("/onboarding?retake=1");
  }

  const isProposal = !!draftPlan;

  const [{ data: planDays }, exerciseCatalog] = await Promise.all([
    loadPlanDays(supabase, plan.id),
    fetchExerciseCatalog(supabase),
  ]);

  const todayIndex =
    new Date().getDay() === 0 ? 7 : new Date().getDay();
  const todayDay =
    planDays?.find((d) => d.day_index === todayIndex) ?? planDays?.[0];

  return (
    <AppShell title={isProposal ? "Proposed plan" : plan.name}>
      <Suspense fallback={null}>
        <PlanReadyToast />
      </Suspense>
      <div className="space-y-6">
        {isProposal && <PlanProposalBanner planId={draftPlan.id} />}

        <PlanEditor
          planDays={planDays ?? []}
          todayDayId={isProposal ? undefined : todayDay?.id}
          exerciseCatalog={exerciseCatalog}
          isProposal={isProposal}
        />

        {!isProposal && (
          <Link
            href="/onboarding?retake=1"
            className={buttonVariants({ variant: "link" })}
          >
            Retake questionnaire
          </Link>
        )}
      </div>
    </AppShell>
  );
}
