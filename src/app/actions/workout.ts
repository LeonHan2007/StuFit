"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  checkCoordinatesWithinLocations,
  validateStreakQualification,
} from "@/lib/workout/streak-validation";

async function getExpectedDurationSeconds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data: onboarding } = await supabase
    .from("user_onboarding")
    .select("session_minutes")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return (onboarding?.session_minutes ?? 45) * 60;
}

export async function startWorkout(planDayId?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const expectedDurationSeconds = await getExpectedDurationSeconds(supabase, user.id);

  const { data: session, error } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: user.id,
      plan_day_id: planDayId ?? null,
      status: "in_progress",
      expected_duration_seconds: expectedDurationSeconds,
    })
    .select("id")
    .single();

  if (error || !session) {
    throw new Error(error?.message ?? "Failed to start session");
  }

  if (planDayId) {
    const { data: planExercises } = await supabase
      .from("plan_day_exercises")
      .select("exercise_id, order_index")
      .eq("plan_day_id", planDayId)
      .order("order_index");

    if (planExercises?.length) {
      await supabase.from("session_exercises").insert(
        planExercises.map((pe) => ({
          session_id: session.id,
          exercise_id: pe.exercise_id,
          order_index: pe.order_index,
        }))
      );
    }
  }

  redirect(`/workout/live/${session.id}`);
}

export async function recordLocationSample(
  sessionId: string,
  latitude: number,
  longitude: number
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("id, user_id, status")
    .eq("id", sessionId)
    .single();

  if (!session || session.user_id !== user.id || session.status !== "in_progress") {
    throw new Error("Session not found");
  }

  const { data: locations } = await supabase
    .from("workout_locations")
    .select("latitude, longitude, radius_meters")
    .eq("user_id", user.id);

  const withinBounds = checkCoordinatesWithinLocations(
    latitude,
    longitude,
    (locations ?? []).map((l) => ({
      latitude: Number(l.latitude),
      longitude: Number(l.longitude),
      radius_meters: l.radius_meters,
    }))
  );

  const { error } = await supabase.from("session_location_samples").insert({
    session_id: sessionId,
    latitude,
    longitude,
    within_bounds: withinBounds,
  });

  if (error) throw new Error(error.message);

  return { withinBounds };
}

export async function completeWorkout(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("id, user_id, plan_day_id, started_at, expected_duration_seconds, status")
    .eq("id", sessionId)
    .single();

  if (!session || session.user_id !== user.id) {
    throw new Error("Session not found");
  }
  if (session.status !== "in_progress") {
    throw new Error("Session already finished");
  }

  const endedAt = new Date().toISOString();

  const [{ data: planExercises }, { data: sessionExercises }, { data: locations }, { data: samples }] =
    await Promise.all([
      session.plan_day_id
        ? supabase
            .from("plan_day_exercises")
            .select("exercise_id, sets, rest_seconds")
            .eq("plan_day_id", session.plan_day_id)
        : Promise.resolve({
            data: [] as { exercise_id: string; sets: number; rest_seconds: number }[],
          }),
      supabase
        .from("session_exercises")
        .select("id, exercise_id, session_sets ( id )")
        .eq("session_id", sessionId),
      supabase
        .from("workout_locations")
        .select("latitude, longitude, radius_meters")
        .eq("user_id", user.id),
      supabase
        .from("session_location_samples")
        .select("within_bounds, recorded_at")
        .eq("session_id", sessionId)
        .order("recorded_at"),
    ]);

  const sessionProgress = (sessionExercises ?? []).map((se) => ({
    exercise_id: se.exercise_id,
    logged_sets: Array.isArray(se.session_sets) ? se.session_sets.length : 0,
  }));

  const validation = validateStreakQualification({
    planDayId: session.plan_day_id,
    startedAt: session.started_at,
    endedAt,
    planExercises: (planExercises ?? []).map((p) => ({
      exercise_id: p.exercise_id,
      sets: p.sets,
      rest_seconds: p.rest_seconds,
    })),
    sessionExercises: sessionProgress,
    locationSamples: samples ?? [],
    workoutLocations: (locations ?? []).map((l) => ({
      latitude: Number(l.latitude),
      longitude: Number(l.longitude),
      radius_meters: l.radius_meters,
    })),
  });

  const { error } = await supabase
    .from("workout_sessions")
    .update({
      status: "completed",
      ended_at: endedAt,
      qualifies_for_streak: validation.qualifies,
      streak_qualify_reasons: validation.reasons,
    })
    .eq("id", sessionId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/workout");
  revalidatePath("/workout/history");
  return {
    qualifiesForStreak: validation.qualifies,
    reasons: validation.reasons,
  };
}

export async function discardWorkout(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("id, user_id, status")
    .eq("id", sessionId)
    .single();

  if (!session || session.user_id !== user.id) {
    throw new Error("Session not found");
  }
  if (session.status !== "in_progress") {
    throw new Error("Session already finished");
  }

  const { error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", sessionId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/workout");
  revalidatePath("/workout/history");
}

export async function deleteWorkout(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("id, user_id, status")
    .eq("id", sessionId)
    .single();

  if (!session || session.user_id !== user.id) {
    throw new Error("Session not found");
  }
  if (session.status !== "completed") {
    throw new Error("Only completed workouts can be deleted");
  }

  const { error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", sessionId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/workout/history");
}
