import { NextRequest, NextResponse } from "next/server";
import { readDriveState, completeDriveConnectCore } from "@/lib/server/google-drive";

/** Google Drive OAuth callback. Session-less: tenant binding comes from our encrypted state only.
 *  Exchanges the code for tokens (stored encrypted per tenant) and 302s back to the Media Library. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const base = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || url.origin).replace(/\/+$/, "");
  const params = url.searchParams;
  const err = params.get("error");
  const code = params.get("code");
  const state = params.get("state");

  const parsed = state ? readDriveState(state) : null;
  if (!parsed) return NextResponse.redirect(`${base}/?drive_error=invalid_or_expired_state`, 302);
  const { tenantId } = parsed;
  const dest = (qs: string) => NextResponse.redirect(`${base}/tenants/${tenantId}/website/media?${qs}`, 302);

  if (err) return dest(`drive_error=${encodeURIComponent(err)}`);
  if (!code) return dest("drive_error=missing_code");
  try {
    const r = await completeDriveConnectCore(tenantId, code);
    return r.ok ? dest(`drive_connected=${encodeURIComponent(r.email ?? "1")}`) : dest(`drive_error=${encodeURIComponent(r.message ?? "connect_failed")}`);
  } catch (e: any) { return dest(`drive_error=${encodeURIComponent(e?.message ?? "connect_failed")}`); }
}
