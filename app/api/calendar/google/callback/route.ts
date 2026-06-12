import { NextRequest, NextResponse } from "next/server";
import { readGoogleState, completeGoogleConnectCore } from "@/lib/server/google-calendar";
import { readContactsState, completeContactsConnectCore } from "@/lib/server/google-contacts";

/**
 * Google OAuth callback — shared by the CALENDAR and CONTACTS flows (the platform OAuth
 * client registers exactly this redirect URI; a second one 400s redirect_uri_mismatch).
 * Session-less: the tenant binding comes ONLY from our encrypted `state` (15-min TTL),
 * whose shape disambiguates the flow. Exchanges the code for tokens (stored encrypted)
 * and 302s back to the right tenant page with a connected/error flag.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const base = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || url.origin).replace(/\/+$/, "");
  const params = url.searchParams;
  const err = params.get("error");
  const code = params.get("code");
  const state = params.get("state");

  // Contacts flow (D-258): state carries flow="contacts" and no calendarId.
  const cParsed = state ? readContactsState(state) : null;
  if (cParsed) {
    const dest = (qs: string) => NextResponse.redirect(`${base}/tenants/${cParsed.tenantId}/contacts?${qs}`, 302);
    if (err) return dest(`gc_error=${encodeURIComponent(err)}`);
    if (!code) return dest("gc_error=missing_code");
    try {
      const r = await completeContactsConnectCore(cParsed.tenantId, code);
      if (!r.ok) return dest(`gc_error=${encodeURIComponent(r.message ?? "connect_failed")}`);
      return dest(`gc_connected=${encodeURIComponent(r.email ?? "1")}`);
    } catch (e: any) {
      return dest(`gc_error=${encodeURIComponent(e?.message ?? "connect_failed")}`);
    }
  }

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
