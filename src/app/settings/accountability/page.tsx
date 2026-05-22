import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { WorkoutLocationsManager } from "@/components/settings/workout-locations";
import { CalendarSyncButton } from "@/components/settings/calendar-sync-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default async function AccountabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: integration }, { data: locations }] = await Promise.all([
    supabase
      .from("user_integrations")
      .select("id, provider, calendar_id, updated_at")
      .eq("user_id", user.id)
      .eq("provider", "google_calendar")
      .maybeSingle(),
    supabase
      .from("workout_locations")
      .select("id, name, latitude, longitude, radius_meters")
      .eq("user_id", user.id)
      .order("created_at"),
  ]);

  const connected = !!integration;

  return (
    <AppShell title="Accountability">
      <div className="space-y-4">
        {params.connected && (
          <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
            Google Calendar connected successfully.
          </p>
        )}
        {params.error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Error: {decodeURIComponent(params.error)}
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Workout locations</CardTitle>
            <CardDescription>
              Define where you are allowed to train. Your phone checks in
              periodically during live workouts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WorkoutLocationsManager
              locations={(locations ?? []).map((l) => ({
                id: l.id,
                name: l.name,
                latitude: Number(l.latitude),
                longitude: Number(l.longitude),
                radius_meters: l.radius_meters,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Google Calendar
              {connected ? (
                <Badge variant="secondary">Connected</Badge>
              ) : (
                <Badge variant="outline">Not connected</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Schedule workouts in free slots around your classes and events.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!connected ? (
              <Link
                href="/api/google/connect"
                className={cn(buttonVariants(), "inline-flex h-12 w-full")}
              >
                Connect Google Calendar
              </Link>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Calendar: {integration.calendar_id ?? "primary"}
                </p>
                <CalendarSyncButton />
                <Link
                  href="/api/google/connect"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "inline-flex w-full"
                  )}
                >
                  Reconnect
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">What counts for a streak?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>Scheduled rest days on your plan count automatically</li>
              <li>Training days: start from your plan and complete every exercise</li>
              <li>Log at least the target sets for each planned exercise</li>
              <li>Spend a reasonable amount of time for that day&apos;s workout</li>
              <li>Remain inside an approved location for the entire workout</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
