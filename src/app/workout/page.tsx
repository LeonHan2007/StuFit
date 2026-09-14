import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPlan } from "@/lib/plan/current-plan";
import { AppShell } from "@/components/layout/app-shell";
import { startWorkout } from "@/app/actions/workout";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { weekdayName } from "@/lib/plan/build-seven-day-week";

export default async function WorkoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const plan = await getCurrentPlan(supabase, user.id);

  const { data: planDays } = plan
    ? await supabase
        .from("plan_days")
        .select("id, label, day_index, is_rest_day")
        .eq("plan_id", plan.id)
        .order("day_index")
    : { data: null };

  const todayIndex =
    new Date().getDay() === 0 ? 7 : new Date().getDay();
  const todayDay =
    planDays?.find((d) => d.day_index === todayIndex) ?? planDays?.[0];
  const isRestToday = Boolean(todayDay?.is_rest_day);

  const { data: activeSession } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "in_progress")
    .maybeSingle();

  const weekDays = planDays ?? [];

  return (
    <AppShell title="Workout">
      <div className="space-y-4">
        {activeSession && (
          <Card className="border-orange-500/50 bg-orange-500/10">
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-medium">You have a workout in progress</p>
              <Link
                href={`/workout/live/${activeSession.id}`}
                className={cn(buttonVariants(), "h-11 w-full sm:w-auto")}
              >
                Resume
              </Link>
            </CardContent>
          </Card>
        )}

        {isRestToday && todayDay && (
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {weekdayName(todayDay.day_index)} · Rest day
                <Badge variant="secondary">Streak</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Rest day — counts toward your streak. No workout required today.
              </p>
              <form action={startWorkout.bind(null, todayDay.id)}>
                <Button type="submit" variant="outline" className="w-full">
                  Work out anyway
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Quick start</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayDay && !isRestToday && (
              <form action={startWorkout.bind(null, todayDay.id)}>
                <Button type="submit" className="h-12 w-full">
                  Start today&apos;s workout
                </Button>
              </form>
            )}
            <form action={startWorkout.bind(null, undefined)}>
              <Button type="submit" variant="outline" className="h-12 w-full">
                Empty workout (add exercises as you go)
              </Button>
            </form>
          </CardContent>
        </Card>

        {weekDays.length > 0 && (
          <>
            <h2 className="text-lg font-semibold">This week</h2>
            {weekDays.map((day) => {
              const isToday = day.id === todayDay?.id;
              const isRest = Boolean(day.is_rest_day);
              return (
                <Card
                  key={day.id}
                  className={cn(
                    isToday && !isRest && "border-primary/20 bg-primary/5",
                    isToday && isRest && "border-emerald-500/30 bg-emerald-500/5"
                  )}
                >
                  <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium">
                        {weekdayName(day.day_index)}
                        {isToday && <Badge variant="secondary">Today</Badge>}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {day.label}
                      </p>
                    </div>
                    {!isRest && (
                      <form
                        action={startWorkout.bind(null, day.id)}
                        className="w-full sm:w-auto"
                      >
                        <Button type="submit" className="h-11 w-full sm:w-auto">
                          Start
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}

        {!plan && (
          <p className="text-center text-muted-foreground">
            <Link href="/onboarding" className="text-primary underline">
              Complete onboarding
            </Link>{" "}
            to get a structured plan.
          </p>
        )}
      </div>
    </AppShell>
  );
}
