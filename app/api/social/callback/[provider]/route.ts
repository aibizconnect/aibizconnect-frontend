import { NextRequest, NextResponse } from "next/server";
import { isSocialProvider, readOAuthState, completeOAuthCore } from "@/lib/server/social";

/**
 * Social OAuth callback (RULING 31). Session-less by nature: the ONLY trust anchor is the encrypted
 * `state` we issued in getOAuthStartUrl (which was admin-gated). We validate state, take tenantId +
 * provider FROM the validated state (never from a cookie/session), then run the gate-free
 * completeOAuthCore. Always 302 back to the tenant Settings hub with a success/error flag. No token
 * or secret is ever placed in the redirect URL.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const url = new URL(req.url);
  const base = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || url.origin).replace(/\/+$/, "");
  const settings = (tenantId: string, qs: string) => NextResponse.redirect(`${base}/tenants/${tenantId}/settings?${qs}`, 302);
  const fallbackError = (reason: string) => NextResponse.redirect(`${base}/?social_error=${encodeURIComponent(reason)}`, 302);

  const err = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  // Validate state first — it carries the only trustworthy tenant binding.
  const parsed = state ? readOAuthState(state) : null;
  if (!parsed || !isSocialProvider(provider) || parsed.provider !== provider) {
    return fallbackError("invalid_or_expired_state");
  }
  const { tenantId } = parsed;

  // Provider returned an error (user denied, etc.) — bounce back with the reason.
  if (err) return settings(tenantId, `error=${encodeURIComponent(err)}&provider=${provider}`);
  if (!code) return settings(tenantId, `error=missing_code&provider=${provider}`);

  try {
    const r = await completeOAuthCore(tenantId, provider, code, "oauth_callback");
    // Audit the callback receipt explicitly (SOC-CB-V10), independent of the core's completion log.
    try {
      const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
      await logPlatformEvent({ action: "social.oauth_callback_received", actorEmail: "oauth_callback", meta: { tenantId, provider, ok: r.ok, connected: r.connected } });
    } catch { /* best effort */ }
    if (!r.ok) return settings(tenantId, `error=${encodeURIComponent(r.message ?? "connect_failed")}&provider=${provider}`);
    return settings(tenantId, `connected=${provider}&n=${r.connected}`);
  } catch (e: any) {
    return settings(tenantId, `error=${encodeURIComponent(e?.message ?? "connect_failed")}&provider=${provider}`);
  }
}
