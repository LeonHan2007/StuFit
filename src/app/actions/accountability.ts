"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setStreakAccountability(enabled: boolean) {
  if (typeof enabled !== "boolean") {
    return { ok: false as const, error: "Invalid setting" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const { error } = await supabase
    .from("profiles")
    .update({ streak_accountability_enabled: enabled })
    .eq("id", user.id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/settings/accountability");
  revalidatePath("/workout");
  return { ok: true as const };
}
