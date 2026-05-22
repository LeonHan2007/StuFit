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
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (!plan) return new Set();

  const { data: days } = await supabase
    .from("plan_days")
    .select("day_index, is_rest_day")
    .eq("plan_id", plan.id)
    .eq("is_rest_day", true);

  return new Set((days ?? []).map((d) => d.day_index));
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
  const workoutDates = await loadQualifyingWorkoutDates(supabase, userId, tz);
  const restWeekdays = await loadActivePlanRestWeekdays(supabase, userId);

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

export async function isStreakEligibleToday(
  supabase: SupabaseClient,
  userId: string,
  timezone = DEFAULT_TIMEZONE
): Promise<boolean> {
  const days = await getStreakDays(supabase, userId, timezone);
  const today = localDateKey(new Date(), timezone);
  return days.has(today);
}
