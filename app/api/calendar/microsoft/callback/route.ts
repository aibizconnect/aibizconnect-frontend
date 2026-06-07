import { NextRequest, NextResponse } from "next/server";
import { readMsState, completeMsConnectCore } from "@/lib/server/microsoft-calendar";

/** Outlook (Microsoft) Calendar OAuth callback. Session-less: tenant + calendar binding from our
 *  encrypted state only. Exchanges the code for tokens (encrypted) and 302s back to Calendars. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const base = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || url.origin).replace(/\/+$/, "");
  const params = url.searchParams;
  const err = params.get("error");
  const code = params.get("code");
  const state = params.get("state");

  const parsed = state ? readMsState(state) : null;
  if (!parsed) return NextResponse.redirect(`${base}/?calendar_error=invalid_or_expired_state`, 302);
  const { tenantId, calendarId } = parsed;
  const dest = (qs: string) => NextResponse.redirect(`${base}/tenants/${tenantId}/calendars?${qs}`, 302);

  if (err) return dest(`mcal_error=${encodeURIComponent(err)}`);
  if (!code) return dest("mcal_error=missing_code");
  try {
    const r = await completeMsConnectCore(tenantId, calendarId, code);
    return r.ok ? dest(`mcal_connected=${encodeURIComponent(r.email ?? "1")}`) : dest(`mcal_error=${encodeURIComponent(r.message ?? "connect_failed")}`);
  } catch (e: any) { return dest(`mcal_error=${encodeURIComponent(e?.message ?? "connect_failed")}`); }
}
