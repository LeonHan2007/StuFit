import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  createClient,
  getRequestProfile,
  getRequestUser,
} from "@/lib/supabase/server";
import { fetchExerciseCatalog } from "@/lib/exercises/catalog";
import { getCurrentPlan } from "@/lib/plan/current-plan";
import { Page } from "@/components/layout/page";
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
  const user = await getRequestUser();
  if (!user) redirect("/auth/login");

  const [profile, plan] = await Promise.all([
    getRequestProfile(user.id),
    getCurrentPlan(supabase, user.id),
  ]);

  if (!profile?.onboarding_completed_at) {
    redirect("/onboarding");
  }

  if (!plan) {
    redirect("/onboarding?retake=1");
  }

  const isProposal = plan.isProposal;

  const [{ data: planDays }, exerciseCatalog] = await Promise.all([
    loadPlanDays(supabase, plan.id),
    fetchExerciseCatalog(supabase),
  ]);

  const todayIndex =
    new Date().getDay() === 0 ? 7 : new Date().getDay();
  const todayDay =
    planDays?.find((d) => d.day_index === todayIndex) ?? planDays?.[0];

  return (
    <Page title={isProposal ? "Proposed plan" : plan.name}>
      <Suspense fallback={null}>
        <PlanReadyToast />
      </Suspense>
      <div className="space-y-6">
        {isProposal && <PlanProposalBanner planId={plan.id} />}

        <PlanEditor
          planDays={planDays ?? []}
          todayDayId={todayDay?.id}
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
    </Page>
  );
}
