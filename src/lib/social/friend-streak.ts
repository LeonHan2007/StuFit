import { parseISO, subDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStreakDays, getStreakDaysForUsers } from "@/lib/streak/streak-days";

export interface FriendStreakInfo {
  friendshipId: string;
  friendId: string;
  current: number;
  bothActiveToday: boolean;
}

function localToday(timezone: string): string {
  return formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
}

function prevLocalDate(dateStr: string, timezone: string): string {
  return formatInTimeZone(
    subDays(parseISO(`${dateStr}T12:00:00`), 1),
    timezone,
    "yyyy-MM-dd"
  );
}

function mutualStreakFromOverlap(
  overlapSortedDesc: string[],
  timezone: string,
  myDays: Set<string>,
  friendDays: Set<string>
): { current: number; bothActiveToday: boolean } {
  const today = localToday(timezone);
  const yesterday = localToday(timezone) === today
    ? prevLocalDate(today, timezone)
    : formatInTimeZone(subDays(new Date(), 1), timezone, "yyyy-MM-dd");

  const bothActiveToday = myDays.has(today) && friendDays.has(today);

  if (overlapSortedDesc.length === 0) {
    return { current: 0, bothActiveToday };
  }

  if (overlapSortedDesc[0] !== today && overlapSortedDesc[0] !== yesterday) {
    return { current: 0, bothActiveToday };
  }

  let streak = 0;
  let expected =
    overlapSortedDesc[0] === today ? today : yesterday;

  for (const day of overlapSortedDesc) {
    if (day === expected) {
      streak++;
      expected = prevLocalDate(expected, timezone);
    } else if (day < expected) {
      break;
    }
  }

  return { current: streak, bothActiveToday };
}

export async function getFriendStreak(
  supabase: SupabaseClient,
  userId: string,
  friendId: string,
  myTimezone: string,
  friendTimezone: string
): Promise<{ current: number; bothActiveToday: boolean }> {
  const [myDays, friendDays] = await Promise.all([
    getStreakDays(supabase, userId, myTimezone),
    getStreakDays(supabase, friendId, friendTimezone),
  ]);

  const overlap = [...myDays]
    .filter((d) => friendDays.has(d))
    .sort()
    .reverse();

  return mutualStreakFromOverlap(overlap, myTimezone, myDays, friendDays);
}

export async function getFriendStreaksForUser(
  supabase: SupabaseClient,
  userId: string,
  friendships: Array<{
    id: string;
    requester_id: string;
    addressee_id: string;
  }>,
  timezoneByUserId: Map<string, string>
): Promise<FriendStreakInfo[]> {
  const friendIds = friendships.map((f) =>
    f.requester_id === userId ? f.addressee_id : f.requester_id
  );
  const daysByUser = await getStreakDaysForUsers(
    supabase,
    [userId, ...friendIds],
    timezoneByUserId
  );
  const myTz = timezoneByUserId.get(userId) ?? "UTC";
  const myDays = daysByUser.get(userId) ?? new Set<string>();

  return friendships.map((f) => {
    const friendId =
      f.requester_id === userId ? f.addressee_id : f.requester_id;
    const friendDays = daysByUser.get(friendId) ?? new Set<string>();
    const overlap = [...myDays]
      .filter((d) => friendDays.has(d))
      .sort()
      .reverse();
    const streak = mutualStreakFromOverlap(overlap, myTz, myDays, friendDays);
    return {
      friendshipId: f.id,
      friendId,
      current: streak.current,
      bothActiveToday: streak.bothActiveToday,
    };
  });
}
