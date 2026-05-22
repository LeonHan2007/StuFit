import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createOAuth2Client } from "@/lib/calendar/google";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const userId = searchParams.get("state");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!code || !userId) {
    return NextResponse.redirect(
      `${baseUrl}/settings/accountability?error=missing_params`
    );
  }

  try {
    const oauth2 = createOAuth2Client();
    const { tokens } = await oauth2.getToken(code);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        `${baseUrl}/settings/accountability?error=no_refresh_token`
      );
    }

    const supabase = await createServiceClient();
    const { error } = await supabase.from("user_integrations").upsert(
      {
        user_id: userId,
        provider: "google_calendar",
        refresh_token: tokens.refresh_token,
        calendar_id: "primary",
        scopes: tokens.scope?.split(" ") ?? [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    );

    if (error) {
      return NextResponse.redirect(
        `${baseUrl}/settings/accountability?error=${encodeURIComponent(error.message)}`
      );
    }

    return NextResponse.redirect(`${baseUrl}/settings/accountability?connected=1`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "oauth_failed";
    return NextResponse.redirect(
      `${baseUrl}/settings/accountability?error=${encodeURIComponent(msg)}`
    );
  }
}
