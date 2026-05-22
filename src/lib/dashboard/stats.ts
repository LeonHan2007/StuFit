import { format, startOfDay, subDays } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getBestStreak,
  getCurrentStreak,
  getStreakDays,
} from "@/lib/streak/streak-days";

export interface StreakStats {
  current: number;
  best: number;
}

export async function getStreakStats(
  supabase: SupabaseClient,
  userId: string,
  timezone = "UTC"
): Promise<StreakStats> {
  const activeDays = await getStreakDays(supabase, userId, timezone);
  const current = getCurrentStreak(activeDays, timezone);
  const best = Math.max(getBestStreak(activeDays), current);
  return { current, best };
}

export async function getWeeklySessionCount(
  supabase: SupabaseClient,
  userId: string
): Promise<{ completed: number; target: number }> {
  const weekStart = format(
    startOfDay(subDays(new Date(), new Date().getDay())),
    "yyyy-MM-dd"
  );

  const { count } = await supabase
    .from("workout_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "completed")
    .gte("ended_at", weekStart);

  const { data: onboarding } = await supabase
    .from("user_onboarding")
    .select("days_per_week")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return {
    completed: count ?? 0,
    target: onboarding?.days_per_week ?? 3,
  };
}
