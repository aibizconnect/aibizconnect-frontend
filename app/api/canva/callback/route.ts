import { NextRequest, NextResponse } from "next/server";
import { readCanvaState, completeCanvaConnectCore } from "@/lib/server/canva";

/** Canva OAuth callback. Session-less: tenant + PKCE verifier come from our encrypted state.
 *  Exchanges the code for tokens (stored encrypted per tenant) and 302s back to the Media Library. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const base = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || url.origin).replace(/\/+$/, "");
  const params = url.searchParams;
  const err = params.get("error");
  const code = params.get("code");
  const state = params.get("state");

  const parsed = state ? readCanvaState(state) : null;
  if (!parsed) return NextResponse.redirect(`${base}/?canva_error=invalid_or_expired_state`, 302);
  const { tenantId, verifier } = parsed;
  const dest = (qs: string) => NextResponse.redirect(`${base}/tenants/${tenantId}/website/media?${qs}`, 302);

  if (err) return dest(`canva_error=${encodeURIComponent(err)}`);
  if (!code) return dest("canva_error=missing_code");
  try {
    const r = await completeCanvaConnectCore(tenantId, code, verifier);
    return r.ok ? dest(`canva_connected=${encodeURIComponent(r.name ?? "1")}`) : dest(`canva_error=${encodeURIComponent(r.message ?? "connect_failed")}`);
  } catch (e: any) { return dest(`canva_error=${encodeURIComponent(e?.message ?? "connect_failed")}`); }
}
