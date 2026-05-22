"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import { generateWorkoutPlan } from "@/lib/plan/generator";
import { onboardingSchema } from "@/lib/validations/onboarding";
import type { ExerciseModality, WorkoutGoal } from "@/types/database";

function formError(message: string) {
  return { error: { _form: [message] } };
}

export async function submitOnboarding(formData: unknown) {
  const parsed = onboardingSchema.safeParse(formData);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const first =
      Object.values(fieldErrors).flat()[0] ?? "Invalid form data";
    return formError(first);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return formError("Not signed in. Please log in and try again.");
  }

  const profileResult = await ensureProfile(supabase, user);
  if (profileResult.error) {
    return formError(`Profile setup failed: ${profileResult.error}`);
  }

  const v = parsed.data;
  const isRetake = v.retake === true;

  const { error: onboardingError } = await supabase.from("user_onboarding").insert({
    user_id: user.id,
    goals: v.goals,
    exercise_modalities: v.exerciseModalities,
    days_per_week: v.daysPerWeek,
    session_minutes: v.sessionMinutes,
    experience: v.experience,
    equipment: v.equipment,
    injuries_notes: v.injuriesNotes ?? null,
  });

  if (onboardingError) {
    if (onboardingError.message.includes("does not exist")) {
      return formError(
        "Database tables missing. Run: npx supabase db push (or apply migrations in Supabase SQL editor)."
      );
    }
    return formError(onboardingError.message);
  }

  const { planId, error: planError } = await generateWorkoutPlan(
    supabase,
    user.id,
    {
      goals: v.goals as WorkoutGoal[],
      exerciseModalities: v.exerciseModalities as ExerciseModality[],
      daysPerWeek: v.daysPerWeek,
      sessionMinutes: v.sessionMinutes,
      experience: v.experience,
      equipment: v.equipment,
      injuriesNotes: v.injuriesNotes ?? null,
    },
    { activate: false }
  );

  if (planError) {
    if (planError === "Exercises not found") {
      return formError(
        "Exercise catalog is empty. Seed the database: run supabase/seed.sql in the Supabase SQL editor, or `npm run db:reset` locally."
      );
    }
    return formError(planError);
  }

  if (!planId) {
    return formError("Failed to generate plan proposal");
  }

  if (!isRetake) {
    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq("id", user.id);

    if (profileUpdateError) {
      return formError(profileUpdateError.message);
    }
  }

  redirect("/plan?proposal=1");
}
