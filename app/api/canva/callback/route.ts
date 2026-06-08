import { NextRequest, NextResponse } from "next/server";
import { readCanvaState, completeCanvaConnectCore } from "@/lib/server/canva";
import { decryptSecret } from "@/lib/server/encryption";

/** Canva OAuth callback. Session-less: tenant + nonce come from the encrypted state; the PKCE
 *  verifier comes from the short-lived HttpOnly cookie we set when building the auth URL (Canva
 *  forbids storing the verifier in state). We verify the nonce matches before exchanging the code. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const base = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || url.origin).replace(/\/+$/, "");
  const params = url.searchParams;
  const err = params.get("error");
  const code = params.get("code");
  const state = params.get("state");

  const parsed = state ? readCanvaState(state) : null;
  if (!parsed) return NextResponse.redirect(`${base}/?canva_error=invalid_or_expired_state`, 302);
  const { tenantId, nonce } = parsed;
  const dest = (qs: string) => {
    const r = NextResponse.redirect(`${base}/tenants/${tenantId}/website/media?${qs}`, 302);
    r.cookies.delete("canva_pkce"); // one-time use
    return r;
  };

  if (err) return dest(`canva_error=${encodeURIComponent(err)}`);
  if (!code) return dest("canva_error=missing_code");

  // Recover the PKCE verifier from the cookie and verify CSRF nonce.
  let verifier = "";
  try {
    const raw = req.cookies.get("canva_pkce")?.value;
    if (raw) { const c = JSON.parse(decryptSecret(raw)); if (c?.tenantId === tenantId && c?.nonce === nonce) verifier = c.verifier; }
  } catch { /* invalid cookie */ }
  if (!verifier) return dest("canva_error=pkce_mismatch");

  try {
    const r = await completeCanvaConnectCore(tenantId, code, verifier);
    return r.ok ? dest(`canva_connected=${encodeURIComponent(r.name ?? "1")}`) : dest(`canva_error=${encodeURIComponent(r.message ?? "connect_failed")}`);
  } catch (e: any) { return dest(`canva_error=${encodeURIComponent(e?.message ?? "connect_failed")}`); }
}
