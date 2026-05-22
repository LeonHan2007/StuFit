import type { SupabaseClient, User } from "@supabase/supabase-js";

/** Creates a profile row if the auth trigger did not (e.g. user signed up before migrations). */
export async function ensureProfile(
  supabase: SupabaseClient,
  user: User
): Promise<{ error?: string }> {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) return {};

  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "Athlete";

  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    display_name: displayName,
  });

  if (error) return { error: error.message };
  return {};
}
