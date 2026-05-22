import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createOAuth2Client, CALENDAR_SCOPES } from "@/lib/calendar/google";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/auth/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
    );
  }

  const oauth2 = createOAuth2Client();
  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: CALENDAR_SCOPES,
    state: user.id,
  });

  return NextResponse.redirect(url);
}
