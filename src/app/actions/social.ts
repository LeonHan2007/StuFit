"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  friendRequestSchema,
  friendshipActionSchema,
  searchUsersSchema,
} from "@/lib/validations/social";

type SocialActionResult = { ok: true } | { error: string };

function actionError(message: string): SocialActionResult {
  return { error: message };
}

export async function searchUsers(input: unknown) {
  const parsed = searchUsersSchema.safeParse(input);
  if (!parsed.success) return { users: [], error: "Invalid search" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { users: [], error: "Not signed in" };

  const term = parsed.data.query.replace(/[%_,]/g, "");
  const pattern = `%${term}%`;

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio")
    .eq("is_public", true)
    .not("username", "is", null)
    .neq("id", user.id)
    .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
    .limit(20);

  if (error) return { users: [], error: error.message };

  const { data: friendships } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id, status")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  const blocked = new Set<string>();
  for (const f of friendships ?? []) {
    const other =
      f.requester_id === user.id ? f.addressee_id : f.requester_id;
    if (f.status === "accepted" || f.status === "pending" || f.status === "declined") {
      blocked.add(other);
    }
  }

  const users = (profiles ?? []).filter((p) => !blocked.has(p.id));

  return { users };
}

export async function sendFriendRequest(input: unknown) {
  const parsed = friendRequestSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid request");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("Not signed in");

  if (parsed.data.addresseeId === user.id) {
    return actionError("Cannot add yourself");
  }

  const { data: target } = await supabase
    .from("profiles")
    .select("id, is_public, username")
    .eq("id", parsed.data.addresseeId)
    .single();

  if (!target?.is_public || !target.username) {
    return actionError("User is not discoverable");
  }

  const { error } = await supabase.from("friendships").insert({
    requester_id: user.id,
    addressee_id: parsed.data.addresseeId,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") {
      return actionError("Friend request already exists");
    }
    return actionError(error.message);
  }

  revalidatePath("/social");
  return { ok: true as const };
}

export async function acceptFriendRequest(input: unknown) {
  const parsed = friendshipActionSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid request");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("Not signed in");

  const { error } = await supabase
    .from("friendships")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.friendshipId)
    .eq("addressee_id", user.id)
    .eq("status", "pending");

  if (error) return actionError(error.message);

  revalidatePath("/social");
  return { ok: true as const };
}

export async function declineFriendRequest(input: unknown) {
  const parsed = friendshipActionSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid request");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("Not signed in");

  const { error } = await supabase
    .from("friendships")
    .update({
      status: "declined",
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.friendshipId)
    .eq("addressee_id", user.id)
    .eq("status", "pending");

  if (error) return actionError(error.message);

  revalidatePath("/social");
  return { ok: true as const };
}

export async function cancelFriendRequest(input: unknown) {
  const parsed = friendshipActionSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid request");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("Not signed in");

  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", parsed.data.friendshipId)
    .eq("requester_id", user.id)
    .eq("status", "pending");

  if (error) return actionError(error.message);

  revalidatePath("/social");
  return { ok: true as const };
}
