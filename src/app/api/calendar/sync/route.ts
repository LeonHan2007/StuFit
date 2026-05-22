import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { syncWorkoutsToCalendar } from "@/lib/calendar/scheduler";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: integration } = await supabase
    .from("user_integrations")
    .select("refresh_token, calendar_id")
    .eq("user_id", user.id)
    .eq("provider", "google_calendar")
    .single();

  if (!integration?.refresh_token) {
    return NextResponse.json(
      { error: "Google Calendar not connected" },
      { status: 400 }
    );
  }

  const { data: plan } = await supabase
    .from("workout_plans")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!plan) {
    return NextResponse.json({ error: "No active plan" }, { status: 400 });
  }

  const [{ data: planDays }, { data: onboarding }] = await Promise.all([
    supabase
      .from("plan_days")
      .select("id, label, day_index")
      .eq("plan_id", plan.id)
      .order("day_index"),
    supabase
      .from("user_onboarding")
      .select("session_minutes, days_per_week")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
  ]);

  const admin = await createServiceClient();

  const result = await syncWorkoutsToCalendar({
    refreshToken: integration.refresh_token,
    calendarId: integration.calendar_id ?? "primary",
    planDays: (planDays ?? []).map((d) => ({
      planDayId: d.id,
      label: d.label,
      dayIndex: d.day_index,
    })),
    sessionMinutes: onboarding?.session_minutes ?? 45,
    daysPerWeek: onboarding?.days_per_week ?? 3,
    userId: user.id,
    supabaseAdmin: admin,
  });

  return NextResponse.json(result);
}
