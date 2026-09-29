import {
  differenceInCalendarDays,
  parseISO,
  subDays,
} from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import type { SupabaseClient } from "@supabase/supabase-js";
import { calendarWeekdayIndex } from "@/lib/plan/build-seven-day-week";

const DEFAULT_TIMEZONE = "UTC";

function localDateKey(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

function parseLocalDate(dateStr: string): Date {
  return parseISO(`${dateStr}T12:00:00`);
}

async function loadActivePlanRestWeekdays(
  supabase: SupabaseClient,
  userId: string
): Promise<Set<number>> {
  const { data: plan } = await supabase
    .from("workout_plans")
    .select("id, plan_days ( day_index, is_rest_day )")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const days = plan?.plan_days;
  const rows = Array.isArray(days) ? days : days ? [days] : [];
  return new Set(
    rows.filter((d) => d.is_rest_day).map((d) => d.day_index)
  );
}

async function loadQualifyingWorkoutDates(
  supabase: SupabaseClient,
  userId: string,
  timezone: string
): Promise<Set<string>> {
  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("ended_at, started_at")
    .eq("user_id", userId)
    .eq("status", "completed")
    .eq("qualifies_for_streak", true)
    .order("ended_at", { ascending: false });

  const dates = new Set<string>();
  for (const s of sessions ?? []) {
    const raw = s.ended_at ?? s.started_at;
    if (!raw) continue;
    dates.add(localDateKey(parseISO(raw), timezone));
  }
  return dates;
}

function restDatesInRange(
  restWeekdays: Set<number>,
  timezone: string,
  start: Date,
  end: Date
): Set<string> {
  const dates = new Set<string>();
  let cursor = start;
  while (cursor <= end) {
    const zoned = toZonedTime(cursor, timezone);
    if (restWeekdays.has(calendarWeekdayIndex(zoned))) {
      dates.add(localDateKey(cursor, timezone));
    }
    cursor = subDays(cursor, -1);
  }
  return dates;
}

export async function getStreakDays(
  supabase: SupabaseClient,
  userId: string,
  timezone = DEFAULT_TIMEZONE
): Promise<Set<string>> {
  const tz = timezone || DEFAULT_TIMEZONE;
  const [workoutDates, restWeekdays] = await Promise.all([
    loadQualifyingWorkoutDates(supabase, userId, tz),
    loadActivePlanRestWeekdays(supabase, userId),
  ]);

  if (restWeekdays.size === 0) {
    return workoutDates;
  }

  const now = new Date();
  const earliestWorkout = [...workoutDates].sort()[0];
  const rangeStart = earliestWorkout
    ? parseLocalDate(earliestWorkout)
    : subDays(now, 400);
  const restDates = restDatesInRange(restWeekdays, tz, rangeStart, now);

  return new Set([...workoutDates, ...restDates]);
}

export function getCurrentStreak(activeDays: Set<string>, timezone: string): number {
  if (activeDays.size === 0) return 0;

  const sorted = [...activeDays].sort().reverse();
  const today = localDateKey(new Date(), timezone);
  const yesterday = localDateKey(subDays(new Date(), 1), timezone);

  if (sorted[0] !== today && sorted[0] !== yesterday) {
    return 0;
  }

  let streak = 0;
  let expected = sorted[0] === today ? today : yesterday;

  for (const day of sorted) {
    if (day === expected) {
      streak++;
      expected = localDateKey(subDays(parseLocalDate(expected), 1), timezone);
    } else if (day < expected) {
      break;
    }
  }

  return streak;
}

export function getBestStreak(activeDays: Set<string>): number {
  if (activeDays.size === 0) return 0;

  const asc = [...activeDays].sort();
  let streak = 1;
  let best = 1;

  for (let i = 1; i < asc.length; i++) {
    const diff = differenceInCalendarDays(
      parseLocalDate(asc[i]),
      parseLocalDate(asc[i - 1])
    );
    if (diff === 1) {
      streak++;
      best = Math.max(best, streak);
    } else {
      streak = 1;
    }
  }

  return best;
}

export async function getStreakDaysForUsers(
  supabase: SupabaseClient,
  userIds: string[],
  timezoneByUserId: Map<string, string>
): Promise<Map<string, Set<string>>> {
  const uniqueIds = [...new Set(userIds)];
  const result = new Map<string, Set<string>>();
  if (uniqueIds.length === 0) return result;

  const [{ data: sessions }, { data: plans }] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("user_id, ended_at, started_at")
      .in("user_id", uniqueIds)
      .eq("status", "completed")
      .eq("qualifies_for_streak", true),
    supabase
      .from("workout_plans")
      .select("id, user_id")
      .in("user_id", uniqueIds)
      .eq("is_active", true),
  ]);

  const planIds = (plans ?? []).map((plan) => plan.id);
  const { data: restDays } = planIds.length
    ? await supabase
        .from("plan_days")
        .select("plan_id, day_index")
        .in("plan_id", planIds)
        .eq("is_rest_day", true)
    : { data: [] as Array<{ plan_id: string; day_index: number }> };

  const restByPlan = new Map<string, Set<number>>();
  for (const day of restDays ?? []) {
    const set = restByPlan.get(day.plan_id) ?? new Set<number>();
    set.add(day.day_index);
    restByPlan.set(day.plan_id, set);
  }

  const restByUser = new Map<string, Set<number>>();
  for (const plan of plans ?? []) {
    const days = restByPlan.get(plan.id);
    if (!days) continue;
    const existing = restByUser.get(plan.user_id) ?? new Set<number>();
    for (const day of days) existing.add(day);
    restByUser.set(plan.user_id, existing);
  }

  const workoutsByUser = new Map<string, Set<string>>();
  for (const id of uniqueIds) workoutsByUser.set(id, new Set());
  for (const session of sessions ?? []) {
    const raw = session.ended_at ?? session.started_at;
    if (!raw || !session.user_id) continue;
    const tz = timezoneByUserId.get(session.user_id) ?? DEFAULT_TIMEZONE;
    workoutsByUser.get(session.user_id)?.add(localDateKey(parseISO(raw), tz));
  }

  for (const id of uniqueIds) {
    const tz = timezoneByUserId.get(id) ?? DEFAULT_TIMEZONE;
    const workoutDates = workoutsByUser.get(id) ?? new Set<string>();
    const restWeekdays = restByUser.get(id) ?? new Set<number>();
    if (restWeekdays.size === 0) {
      result.set(id, workoutDates);
      continue;
    }
    const now = new Date();
    const earliestWorkout = [...workoutDates].sort()[0];
    const rangeStart = earliestWorkout
      ? parseLocalDate(earliestWorkout)
      : subDays(now, 400);
    const restDates = restDatesInRange(restWeekdays, tz, rangeStart, now);
    result.set(id, new Set([...workoutDates, ...restDates]));
  }

  return result;
}

export async function isStreakEligibleToday(
  supabase: SupabaseClient,
  userId: string,
  timezone = DEFAULT_TIMEZONE
): Promise<boolean> {
  const days = await getStreakDays(supabase, userId, timezone);
  const today = localDateKey(new Date(), timezone);
  return days.has(today);
}
