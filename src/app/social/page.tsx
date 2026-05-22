import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { UserSearch } from "@/components/social/user-search";
import { FriendRequestList } from "@/components/social/friend-request-list";
import { FriendsList } from "@/components/social/friends-list";
import { getFriendStreaksForUser } from "@/lib/social/friend-streak";
import type { FriendRequestRow } from "@/components/social/friend-request-list";
import type { FriendListItem } from "@/components/social/friends-list";

export default async function SocialPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at, timezone")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarding_completed_at) redirect("/onboarding");

  const { data: friendships } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  const rows = friendships ?? [];
  const pending = rows.filter((f) => f.status === "pending");
  const accepted = rows.filter((f) => f.status === "accepted");

  const otherIds = [
    ...new Set(
      rows.map((f) =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      )
    ),
  ];

  const { data: profiles } = otherIds.length
    ? await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", otherIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const incoming: FriendRequestRow[] = pending
    .filter((f) => f.addressee_id === user.id)
    .map((f) => {
      const p = profileMap.get(f.requester_id);
      return {
        friendshipId: f.id,
        userId: f.requester_id,
        username: p?.username ?? null,
        displayName: p?.display_name ?? null,
        avatarUrl: p?.avatar_url ?? null,
      };
    });

  const outgoing: FriendRequestRow[] = pending
    .filter((f) => f.requester_id === user.id)
    .map((f) => {
      const p = profileMap.get(f.addressee_id);
      return {
        friendshipId: f.id,
        userId: f.addressee_id,
        username: p?.username ?? null,
        displayName: p?.display_name ?? null,
        avatarUrl: p?.avatar_url ?? null,
      };
    });

  const streaks = await getFriendStreaksForUser(
    supabase,
    user.id,
    accepted,
    profile.timezone ?? "UTC"
  );
  const streakMap = new Map(streaks.map((s) => [s.friendId, s]));

  const friends: FriendListItem[] = accepted.map((f) => {
    const friendId =
      f.requester_id === user.id ? f.addressee_id : f.requester_id;
    const p = profileMap.get(friendId);
    const streak = streakMap.get(friendId);
    return {
      friendshipId: f.id,
      userId: friendId,
      username: p?.username ?? null,
      displayName: p?.display_name ?? null,
      avatarUrl: p?.avatar_url ?? null,
      friendStreak: streak?.current ?? 0,
      bothActiveToday: streak?.bothActiveToday ?? false,
    };
  });

  return (
    <AppShell title="Social">
      <div className="space-y-10">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Find friends</h2>
          <UserSearch />
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Friend requests</h2>
          <FriendRequestList incoming={incoming} outgoing={outgoing} />
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Friends</h2>
          <FriendsList friends={friends} />
        </section>
      </div>
    </AppShell>
  );
}
