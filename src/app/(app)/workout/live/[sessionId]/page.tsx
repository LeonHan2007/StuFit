import { redirect, notFound } from "next/navigation";
import {
  createClient,
  getRequestProfile,
  getRequestUser,
} from "@/lib/supabase/server";
import { fetchExerciseCatalog } from "@/lib/exercises/catalog";
import { Page } from "@/components/layout/page";
import { LiveWorkoutClient } from "@/components/workout/live-workout-client";
import type { SessionSet } from "@/types/database";

export default async function LiveWorkoutPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const user = await getRequestUser();
  if (!user) redirect("/auth/login");

  const [
    { data: session },
    exerciseCatalog,
    { count: locationCount },
    profile,
  ] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("id, user_id, plan_day_id, status")
      .eq("id", sessionId)
      .single(),
    fetchExerciseCatalog(supabase, { includeDetails: true }),
    supabase
      .from("workout_locations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    getRequestProfile(),
  ]);

  if (!session || session.user_id !== user.id) notFound();

  const [{ data: sessionExercises }, { data: planEx }] = await Promise.all([
    supabase
      .from("session_exercises")
      .select(
        `
        id,
        exercise_id,
        order_index,
        exercises (*),
        session_sets ( id, session_exercise_id, set_number, weight_kg, reps, rpe, completed_at )
      `
      )
      .eq("session_id", sessionId)
      .order("order_index"),
    session.plan_day_id
      ? supabase
          .from("plan_day_exercises")
          .select("exercise_id, sets, rest_seconds")
          .eq("plan_day_id", session.plan_day_id)
      : Promise.resolve({ data: [] as Array<{ exercise_id: string; sets: number; rest_seconds: number }> }),
  ]);

  const planExerciseMeta = Object.fromEntries(
    (planEx ?? []).map((p) => [
      p.exercise_id,
      { sets: p.sets, rest_seconds: p.rest_seconds },
    ])
  );

  const initialSets: Record<string, SessionSet[]> = {};
  const exercises = (sessionExercises ?? []).map((se) => {
    const meta = planExerciseMeta[se.exercise_id] ?? {
      sets: 3,
      rest_seconds: 90,
    };
    const ex = Array.isArray(se.exercises) ? se.exercises[0] : se.exercises;
    const sets = (
      (se.session_sets as SessionSet[] | null) ?? []
    ).sort((a, b) => a.set_number - b.set_number);
    initialSets[se.id] = sets;
    return {
      id: se.id,
      exercise_id: se.exercise_id,
      order_index: se.order_index,
      exercises: ex,
      target_sets: meta.sets,
      rest_seconds: meta.rest_seconds,
    };
  });

  return (
    <Page title="Live workout">
      <LiveWorkoutClient
        sessionId={sessionId}
        exercises={exercises}
        initialSets={initialSets}
        exerciseCatalog={exerciseCatalog ?? []}
        hasWorkoutLocations={(locationCount ?? 0) > 0}
        isPlannedWorkout={!!session.plan_day_id}
        accountabilityEnabled={profile?.streak_accountability_enabled !== false}
      />
    </Page>
  );
}
