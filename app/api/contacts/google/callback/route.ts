import { NextRequest, NextResponse } from "next/server";
import { readContactsState, completeContactsConnectCore } from "@/lib/server/google-contacts";

/**
 * Google Contacts OAuth callback (D-258). Session-less: the tenant binding comes ONLY from
 * our encrypted `state` (15-min TTL). Exchanges the code for tokens (stored encrypted) and
 * 302s back to the tenant's Contacts page with a connected/error flag.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const base = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || url.origin).replace(/\/+$/, "");
  const params = url.searchParams;
  const err = params.get("error");
  const code = params.get("code");
  const state = params.get("state");

  const parsed = state ? readContactsState(state) : null;
  if (!parsed) return NextResponse.redirect(`${base}/?contacts_error=invalid_or_expired_state`, 302);
  const { tenantId } = parsed;
  const dest = (qs: string) => NextResponse.redirect(`${base}/tenants/${tenantId}/contacts?${qs}`, 302);

  if (err) return dest(`gc_error=${encodeURIComponent(err)}`);
  if (!code) return dest("gc_error=missing_code");

  try {
    const r = await completeContactsConnectCore(tenantId, code);
    if (!r.ok) return dest(`gc_error=${encodeURIComponent(r.message ?? "connect_failed")}`);
    return dest(`gc_connected=${encodeURIComponent(r.email ?? "1")}`);
  } catch (e: any) {
    return dest(`gc_error=${encodeURIComponent(e?.message ?? "connect_failed")}`);
  }
}
