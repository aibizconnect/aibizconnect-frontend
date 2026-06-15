import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Per-recipient marketing unsubscribe (D-360, compliance). The signed token encrypts
 * { tenant, contact }. Acting on it adds the "Unsubscribed" tag to that contact — which the
 * campaign audience guard (GUARD_TAGS) excludes from EVERY future send. It can ONLY opt a
 * contact out; it never opts anyone in. Supports both the click link (GET) and Gmail/Apple
 * one-click List-Unsubscribe (POST, RFC 8058).
 */
async function applyUnsubscribe(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const { decryptSecret } = await import("@/lib/server/encryption");
    const p = JSON.parse(decryptSecret(Buffer.from(token, "base64url").toString("utf8")));
    if (p?.k !== "marketing_unsub" || !p?.t) return false;
    const tenantId = String(p.t), contactId = String(p.c ?? "");
    if (contactId && contactId !== "preview") {
      const sb = createSupabaseServiceClient();
      const { data: c } = await sb.from("tenant_contacts").select("tags").eq("tenant_id", tenantId).eq("id", contactId).maybeSingle();
      const tags: string[] = Array.isArray(c?.tags) ? c!.tags : [];
      if (!tags.some((t) => String(t).toLowerCase() === "unsubscribed")) tags.push("Unsubscribed");
      await sb.from("tenant_contacts").update({ tags }).eq("tenant_id", tenantId).eq("id", contactId);
      try {
        const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
        await logPlatformEvent({ action: "marketing.unsubscribe", actorEmail: "email_link", meta: { tenantId, contactId } });
      } catch { /* best effort */ }
    }
    return true;
  } catch { return false; }
}

const PAGE = (ok: boolean) => ok
  ? "<html><body style='font-family:sans-serif;padding:40px;text-align:center'><h2>You're unsubscribed</h2><p>You won't receive any more marketing emails from this sender. You may still receive replies to messages you start.</p></body></html>"
  : "<html><body style='font-family:sans-serif;padding:40px;text-align:center'><h2>Invalid link</h2></body></html>";

export async function GET(req: NextRequest) {
  const ok = await applyUnsubscribe(new URL(req.url).searchParams.get("token") || "");
  return new NextResponse(PAGE(ok), { status: ok ? 200 : 400, headers: { "content-type": "text/html" } });
}

// RFC 8058 one-click: the List-Unsubscribe-Post body POSTs to the same URL (token in the query).
export async function POST(req: NextRequest) {
  let token = new URL(req.url).searchParams.get("token") || "";
  if (!token) { try { token = String((await req.formData()).get("token") || ""); } catch { /* no form body */ } }
  const ok = await applyUnsubscribe(token);
  return new NextResponse(null, { status: ok ? 200 : 400 });
}
