import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createOAuth2Client } from "@/lib/calendar/google";
import { readOAuthState } from "@/lib/calendar/oauth-state";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/settings/accountability?error=missing_params`
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const claimed = readOAuthState(state);

  if (!user || !claimed || claimed.uid !== user.id) {
    return NextResponse.redirect(
      `${baseUrl}/settings/accountability?error=state_mismatch`
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

    const admin = await createServiceClient();
    const { error } = await admin.from("user_integrations").upsert(
      {
        user_id: user.id,
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
