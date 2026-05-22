import Link from "next/link";
import { redirect } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Flame, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { VolumeChart } from "@/components/dashboard/volume-chart";
import { AppShell } from "@/components/layout/app-shell";
import {
  getStreakStats,
  getWeeklySessionCount,
} from "@/lib/dashboard/stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPlanDayLabel } from "@/lib/utils/plan-day";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at, display_name, timezone")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarding_completed_at) redirect("/onboarding");

  const [streak, weekly, { data: weeklyStats }, { data: recentSessions }] =
    await Promise.all([
      getStreakStats(supabase, user.id, profile?.timezone ?? "UTC"),
      getWeeklySessionCount(supabase, user.id),
      supabase
        .from("user_weekly_stats")
        .select("*")
        .eq("user_id", user.id)
        .order("week_start", { ascending: false })
        .limit(8),
      supabase
        .from("workout_sessions")
        .select("id, started_at, ended_at, status, qualifies_for_streak, plan_days ( label )")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("ended_at", { ascending: false })
        .limit(5),
    ]);

  const chartData = (weeklyStats ?? [])
    .slice()
    .reverse()
    .map((w) => ({
      week: format(parseISO(w.week_start), "MMM d"),
      volume: Math.round(Number(w.total_volume_kg)),
      workouts: w.workout_count,
    }));

  return (
    <AppShell title={`Hey, ${profile.display_name ?? "athlete"}`}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Flame className="h-5 w-5 text-orange-500" />
                Current streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{streak.current}</p>
              <p className="text-sm text-muted-foreground">
                active days ·{" "}
                <Link
                  href="/settings/accountability"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  rules
                </Link>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Best streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{streak.best}</p>
              <p className="text-sm text-muted-foreground">days</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">This week</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {weekly.completed} / {weekly.target} sessions
            </p>
            <Link
              href="/workout"
              className={cn(buttonVariants(), "mt-4 h-12 w-full")}
            >
              Start workout
            </Link>
          </CardContent>
        </Card>

        {chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Weekly volume (kg)</CardTitle>
            </CardHeader>
            <CardContent className="h-56">
              <VolumeChart data={chartData} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent workouts</CardTitle>
            <Link
              href="/workout/history"
              className={buttonVariants({ variant: "link", size: "sm" })}
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentSessions?.length ? (
              recentSessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/workout/history?session=${s.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">
                      {getPlanDayLabel(s.plan_days)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(
                        parseISO(s.ended_at ?? s.started_at),
                        "MMM d, yyyy"
                      )}
                    </p>
                  </div>
                  <Badge
                    variant={s.qualifies_for_streak ? "default" : "secondary"}
                  >
                    {s.qualifies_for_streak ? "Streak" : "Done"}
                  </Badge>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No workouts yet. Start your first session!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
