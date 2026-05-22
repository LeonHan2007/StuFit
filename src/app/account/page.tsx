import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { ProfileForm } from "@/components/account/profile-form";
import { getStreakStats } from "@/lib/dashboard/stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Flame, Trophy, ShieldCheck, ListChecks } from "lucide-react";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "username, display_name, avatar_url, bio, timezone, is_public, onboarding_completed_at"
    )
    .eq("id", user.id)
    .single();

  if (!profile?.onboarding_completed_at) redirect("/onboarding");

  const streak = await getStreakStats(
    supabase,
    user.id,
    profile.timezone ?? "UTC"
  );

  return (
    <AppShell title="Account">
      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Flame className="h-5 w-5 text-orange-500" />
                Current streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{streak.current}</p>
              <p className="text-sm text-muted-foreground">active days</p>
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
              <p className="text-3xl font-bold">{streak.best}</p>
              <p className="text-sm text-muted-foreground">days</p>
            </CardContent>
          </Card>
        </div>

        <ProfileForm userId={user.id} profile={profile} />

        <div className="space-y-3 border-t pt-6">
          <h2 className="text-lg font-semibold">Settings</h2>
          <Link
            href="/settings/accountability"
            className={buttonVariants({ variant: "outline", className: "w-full justify-start gap-2" })}
          >
            <ShieldCheck className="h-4 w-4" />
            Accountability & locations
          </Link>
          <Link
            href="/onboarding?retake=1"
            className={buttonVariants({ variant: "outline", className: "w-full justify-start gap-2" })}
          >
            <ListChecks className="h-4 w-4" />
            Retake plan questionnaire
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
