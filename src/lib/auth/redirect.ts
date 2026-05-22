import type { SupabaseClient } from "@supabase/supabase-js";

export async function getPostAuthRedirect(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", userId)
    .single();

  if (!profile?.onboarding_completed_at) {
    return "/onboarding";
  }

  return "/dashboard";
}
