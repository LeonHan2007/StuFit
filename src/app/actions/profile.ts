"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeUsername, validateUsername } from "@/lib/profile/username";
import {
  avatarUrlSchema,
  checkUsernameSchema,
  togglePrivacySchema,
  updateProfileSchema,
} from "@/lib/validations/profile";

type ProfileActionResult = { ok: true } | { ok?: false; error: string };

function actionError(message: string): ProfileActionResult {
  return { error: message };
}

export async function updateProfile(input: unknown) {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(parsed.error.flatten().fieldErrors.username?.[0] ?? "Invalid profile data");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("Not signed in");

  const updates: Record<string, string | null> = {};

  if (parsed.data.displayName !== undefined) {
    updates.display_name = parsed.data.displayName;
  }
  if (parsed.data.bio !== undefined) {
    updates.bio = parsed.data.bio;
  }
  if (parsed.data.timezone !== undefined) {
    updates.timezone = parsed.data.timezone;
  }
  if (parsed.data.username !== undefined) {
    const err = validateUsername(parsed.data.username);
    if (err) return actionError(err);

    const { data: taken } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", parsed.data.username)
      .neq("id", user.id)
      .maybeSingle();

    if (taken) return actionError("Username already taken");
    updates.username = parsed.data.username;
  }

  if (Object.keys(updates).length === 0) {
    return { ok: true };
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) return actionError(error.message);

  revalidatePath("/account");
  revalidatePath("/social");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function checkUsernameAvailable(username: string) {
  const parsed = checkUsernameSchema.safeParse({ username });
  if (!parsed.success) {
    return { available: false, error: "Invalid username" };
  }

  const normalized = normalizeUsername(parsed.data.username);
  const validationError = validateUsername(normalized);
  if (validationError) {
    return { available: false, error: validationError };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { available: false, error: "Not signed in" };

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", normalized)
    .maybeSingle();

  if (existing && existing.id !== user.id) {
    return { available: false, error: "Username already taken" };
  }

  return { available: true };
}

export async function updateAvatarUrl(input: unknown) {
  const parsed = avatarUrlSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid avatar URL");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("Not signed in");

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: parsed.data.avatarUrl })
    .eq("id", user.id);

  if (error) return actionError(error.message);

  revalidatePath("/account");
  revalidatePath("/social");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function removeAvatar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("Not signed in");

  await supabase.storage.from("avatars").remove([`${user.id}/avatar.webp`]);

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);

  if (error) return actionError(error.message);

  revalidatePath("/account");
  revalidatePath("/social");
  return { ok: true as const };
}

export async function togglePrivacy(input: unknown) {
  const parsed = togglePrivacySchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid privacy setting");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("Not signed in");

  const { error } = await supabase
    .from("profiles")
    .update({ is_public: parsed.data.isPublic })
    .eq("id", user.id);

  if (error) return actionError(error.message);

  revalidatePath("/account");
  revalidatePath("/social");
  return { ok: true as const };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
