import { NextRequest, NextResponse } from "next/server";
import { readGoogleState, completeGoogleConnectCore } from "@/lib/server/google-calendar";

/**
 * Google Calendar OAuth callback. Session-less: the tenant + calendar binding comes ONLY from our
 * encrypted `state` (15-min TTL). Exchanges the code for tokens (stored encrypted) and 302s back to
 * the tenant's Calendars page with a connected/error flag.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const base = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || url.origin).replace(/\/+$/, "");
  const params = url.searchParams;
  const err = params.get("error");
  const code = params.get("code");
  const state = params.get("state");

  const parsed = state ? readGoogleState(state) : null;
  if (!parsed) return NextResponse.redirect(`${base}/?calendar_error=invalid_or_expired_state`, 302);
  const { tenantId, calendarId } = parsed;
  const dest = (qs: string) => NextResponse.redirect(`${base}/tenants/${tenantId}/calendars?${qs}`, 302);

  if (err) return dest(`gcal_error=${encodeURIComponent(err)}`);
  if (!code) return dest("gcal_error=missing_code");

  try {
    const r = await completeGoogleConnectCore(tenantId, calendarId, code);
    if (!r.ok) return dest(`gcal_error=${encodeURIComponent(r.message ?? "connect_failed")}`);
    return dest(`gcal_connected=${encodeURIComponent(r.email ?? "1")}`);
  } catch (e: any) {
    return dest(`gcal_error=${encodeURIComponent(e?.message ?? "connect_failed")}`);
  }
}
