import { redirect } from "next/navigation";
import { getRequestProfile, getRequestUser } from "@/lib/supabase/server";
import { Page } from "@/components/layout/page";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ retake?: string }>;
}) {
  const { retake } = await searchParams;
  const isRetake = retake === "1";

  const user = await getRequestUser();
  if (!user) redirect("/auth/login");

  const profile = await getRequestProfile(user.id);

  if (profile?.onboarding_completed_at && !isRetake) {
    redirect("/dashboard");
  }

  return (
    <Page title={isRetake ? "Update your plan" : "Get started"}>
      <OnboardingForm isRetake={isRetake} />
    </Page>
  );
}
