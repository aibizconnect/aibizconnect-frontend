import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * One-click unsubscribe (compliance, RULING 49). The token is the encrypted tenant id we put in the
 * email footer. Visiting it turns OFF launchpad follow-ups for that tenant and cancels pending rows.
 * No auth needed (the signed token IS the authorization), but it can ONLY disable sending.
 */
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token") || "";
  try {
    const { decryptSecret } = await import("@/lib/server/encryption");
    const payload = JSON.parse(decryptSecret(Buffer.from(token, "base64url").toString("utf8")));
    if (payload?.k !== "launchpad_followup" || !payload?.t) throw new Error("bad token");
    const tenantId = String(payload.t);
    const supabase = createSupabaseServiceClient();
    const nowIso = new Date().toISOString();
    await supabase.from("tenant_settings").upsert(
      { tenant_id: tenantId, setting_key: "launchpad_followup_enabled", setting_value: false, updated_at: nowIso },
      { onConflict: "tenant_id,setting_key" }
    );
    await supabase.from("tenant_onboarding_followups").update({ status: "canceled", updated_at: nowIso }).eq("tenant_id", tenantId).in("status", ["draft", "scheduled", "sending"]);
    try {
      const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
      await logPlatformEvent({ action: "followup.unsubscribe", actorEmail: "email_link", meta: { tenantId } });
    } catch { /* best effort */ }
    return new NextResponse("<html><body style='font-family:sans-serif;padding:40px;text-align:center'><h2>You're unsubscribed</h2><p>You won't receive any more setup reminders. You can re-enable them anytime from your Launchpad.</p></body></html>", { status: 200, headers: { "content-type": "text/html" } });
  } catch {
    return new NextResponse("<html><body style='font-family:sans-serif;padding:40px;text-align:center'><h2>Invalid link</h2></body></html>", { status: 400, headers: { "content-type": "text/html" } });
  }
}
