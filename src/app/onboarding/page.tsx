import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ retake?: string }>;
}) {
  const { retake } = await searchParams;
  const isRetake = retake === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_completed_at && !isRetake) {
    redirect("/dashboard");
  }

  return (
    <AppShell title={isRetake ? "Update your plan" : "Get started"}>
      <OnboardingForm isRetake={isRetake} />
    </AppShell>
  );
}
