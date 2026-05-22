import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchExerciseCatalog } from "@/lib/exercises/catalog";
import { AppShell } from "@/components/layout/app-shell";
import { LiveWorkoutClient } from "@/components/workout/live-workout-client";

export default async function LiveWorkoutPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("id, user_id, plan_day_id, status")
    .eq("id", sessionId)
    .single();

  if (!session || session.user_id !== user.id) notFound();

  const { data: sessionExercises } = await supabase
    .from("session_exercises")
    .select(
      `
      id,
      exercise_id,
      order_index,
      exercises (*)
    `
    )
    .eq("session_id", sessionId)
    .order("order_index");

  let planExerciseMeta: Record<
    string,
    { sets: number; rest_seconds: number }
  > = {};

  if (session.plan_day_id) {
    const { data: planEx } = await supabase
      .from("plan_day_exercises")
      .select("exercise_id, sets, rest_seconds")
      .eq("plan_day_id", session.plan_day_id);

    planExerciseMeta = Object.fromEntries(
      (planEx ?? []).map((p) => [
        p.exercise_id,
        { sets: p.sets, rest_seconds: p.rest_seconds },
      ])
    );
  }

  const exercises = (sessionExercises ?? []).map((se) => {
    const meta = planExerciseMeta[se.exercise_id] ?? {
      sets: 3,
      rest_seconds: 90,
    };
    const ex = Array.isArray(se.exercises) ? se.exercises[0] : se.exercises;
    return {
      id: se.id,
      exercise_id: se.exercise_id,
      order_index: se.order_index,
      exercises: ex,
      target_sets: meta.sets,
      rest_seconds: meta.rest_seconds,
    };
  });

  const [exerciseCatalog, { count: locationCount }] = await Promise.all([
    fetchExerciseCatalog(supabase),
    supabase
      .from("workout_locations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  return (
    <AppShell title="Live workout">
      <LiveWorkoutClient
        sessionId={sessionId}
        exercises={exercises}
        exerciseCatalog={exerciseCatalog ?? []}
        hasWorkoutLocations={(locationCount ?? 0) > 0}
        isPlannedWorkout={!!session.plan_day_id}
      />
    </AppShell>
  );
}
