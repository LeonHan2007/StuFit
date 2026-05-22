import { addDays, addMinutes, format, setHours, setMinutes, startOfDay } from "date-fns";
import type { calendar_v3 } from "googleapis";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCalendarClient } from "./google";

export interface ScheduleSlot {
  start: Date;
  end: Date;
}

export interface PlanDaySchedule {
  planDayId: string;
  label: string;
  dayIndex: number;
}

function parseEventTime(
  event: calendar_v3.Schema$Event
): { start: Date; end: Date } | null {
  const startRaw = event.start?.dateTime ?? event.start?.date;
  const endRaw = event.end?.dateTime ?? event.end?.date;
  if (!startRaw || !endRaw) return null;
  return { start: new Date(startRaw), end: new Date(endRaw) };
}

function overlaps(a: ScheduleSlot, b: ScheduleSlot): boolean {
  return a.start < b.end && b.start < a.end;
}

function buildBusySlots(events: calendar_v3.Schema$Event[]): ScheduleSlot[] {
  return events
    .map(parseEventTime)
    .filter((x): x is ScheduleSlot => x !== null);
}

function preferredSlots(
  day: Date,
  durationMinutes: number
): ScheduleSlot[] {
  const morning = setMinutes(setHours(startOfDay(day), 7), 0);
  const evening = setMinutes(setHours(startOfDay(day), 18), 0);
  return [
    { start: morning, end: addMinutes(morning, durationMinutes) },
    { start: evening, end: addMinutes(evening, durationMinutes) },
  ];
}

function findFreeSlot(
  day: Date,
  busy: ScheduleSlot[],
  durationMinutes: number
): ScheduleSlot | null {
  const candidates = preferredSlots(day, durationMinutes);
  for (const slot of candidates) {
    if (!busy.some((b) => overlaps(slot, b))) {
      return slot;
    }
  }

  // Fallback: scan hourly from 6am
  let cursor = setMinutes(setHours(startOfDay(day), 6), 0);
  const endOfDay = setMinutes(setHours(startOfDay(day), 21), 0);
  while (cursor < endOfDay) {
    const slot = { start: cursor, end: addMinutes(cursor, durationMinutes) };
    if (!busy.some((b) => overlaps(slot, b))) {
      return slot;
    }
    cursor = addMinutes(cursor, 30);
  }
  return null;
}

export async function syncWorkoutsToCalendar(params: {
  refreshToken: string;
  calendarId: string;
  planDays: PlanDaySchedule[];
  sessionMinutes: number;
  daysPerWeek: number;
  userId: string;
  supabaseAdmin: SupabaseClient;
}): Promise<{ scheduled: number; errors: string[] }> {
  const calendar = getCalendarClient(params.refreshToken);
  const now = new Date();
  const rangeEnd = addDays(now, 14);

  const { data: eventsRes } = await calendar.events.list({
    calendarId: params.calendarId,
    timeMin: now.toISOString(),
    timeMax: rangeEnd.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  const busy = buildBusySlots(eventsRes.items ?? []);
  const errors: string[] = [];
  let scheduled = 0;

  const daysToSchedule = Math.min(params.planDays.length, params.daysPerWeek);
  let dayOffset = 0;

  for (let i = 0; i < daysToSchedule; i++) {
    const planDay = params.planDays[i];
    let slot: ScheduleSlot | null = null;

    while (dayOffset < 14 && !slot) {
      const targetDay = addDays(startOfDay(now), dayOffset);
      dayOffset++;
      const dayBusy = busy.filter(
        (b) => format(b.start, "yyyy-MM-dd") === format(targetDay, "yyyy-MM-dd")
      );
      slot = findFreeSlot(targetDay, dayBusy, params.sessionMinutes);
      if (slot) {
        busy.push(slot);
      }
    }

    if (!slot) {
      errors.push(`No free slot for ${planDay.label}`);
      continue;
    }

    try {
      const event = await calendar.events.insert({
        calendarId: params.calendarId,
        requestBody: {
          summary: `StuFit: ${planDay.label}`,
          description: "Scheduled by StuFit — student workout app",
          start: { dateTime: slot.start.toISOString() },
          end: { dateTime: slot.end.toISOString() },
        },
      });

      const { error } = await params.supabaseAdmin
        .from("scheduled_workouts")
        .insert({
        user_id: params.userId,
        plan_day_id: planDay.planDayId,
        google_event_id: event.data.id ?? null,
        scheduled_start: slot.start.toISOString(),
        scheduled_end: slot.end.toISOString(),
        status: "scheduled",
        });

      if (error) errors.push(error.message);
      else scheduled++;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "Calendar insert failed");
    }
  }

  return { scheduled, errors };
}
