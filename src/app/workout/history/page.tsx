import { redirect } from "next/navigation";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import {
  WorkoutHistoryList,
  type HistorySession,
} from "@/components/workout/workout-history-list";
import { getPlanDayLabel } from "@/lib/utils/plan-day";

export default async function WorkoutHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select(
      `
      id,
      started_at,
      ended_at,
      plan_days ( label, day_index ),
      session_exercises (
        id,
        order_index,
        exercises ( name ),
        session_sets ( set_number, weight_kg, reps )
      )
    `
    )
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("ended_at", { ascending: false })
    .limit(30);

  const history: HistorySession[] = (sessions ?? []).map((s) => {
    const durationMinutes =
      s.ended_at && s.started_at
        ? differenceInMinutes(parseISO(s.ended_at), parseISO(s.started_at))
        : null;

    const exercises = (
      (s.session_exercises as Array<{
        id: string;
        order_index: number;
        exercises: { name: string } | { name: string }[];
        session_sets: Array<{
          set_number: number;
          weight_kg: number;
          reps: number;
        }>;
      }>) ?? []
    )
      .sort((a, b) => a.order_index - b.order_index)
      .map((se) => {
        const exercise = Array.isArray(se.exercises)
          ? se.exercises[0]
          : se.exercises;
        const sets = (se.session_sets ?? [])
          .sort((a, b) => a.set_number - b.set_number)
          .map((set) => ({
            setNumber: set.set_number,
            weightKg: Number(set.weight_kg),
            reps: set.reps,
          }));
        return {
          id: se.id,
          name: exercise?.name ?? "Exercise",
          sets,
        };
      });

    return {
      id: s.id,
      title: getPlanDayLabel(s.plan_days),
      dateLabel: format(
        parseISO(s.ended_at ?? s.started_at),
        "EEEE, MMM d, yyyy"
      ),
      durationMinutes,
      exercises,
    };
  });

  return (
    <AppShell title="Workout history">
      <WorkoutHistoryList sessions={history} />
    </AppShell>
  );
}
