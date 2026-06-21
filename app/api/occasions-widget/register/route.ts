import { NextResponse } from "next/server";
import { registerWidgetSite } from "@/lib/server/occasion-widget";

/**
 * GHL funnel → Occasions Widget intake (D-399). On the lead form submit, GHL posts the registrant's
 * name/email/domain here with a shared secret; we create the registration and return the embed
 * snippet + manage URL (show them on the GHL thank-you page). The lead is also mirrored to our CRM.
 *
 * POST JSON: { name?, email?, domain, secret }   (secret = OCCASIONS_WIDGET_SECRET)
 * Accepts form-encoded too (GHL custom webhooks sometimes send form data).
 */
export const runtime = "nodejs";

function unauthorized() { return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 }); }

export async function POST(req: Request) {
  const secret = process.env.OCCASIONS_WIDGET_SECRET;
  let body: Record<string, any> = {};
  const ctype = req.headers.get("content-type") || "";
  try {
    if (ctype.includes("application/json")) body = await req.json();
    else { const fd = await req.formData(); fd.forEach((v, k) => { body[k] = typeof v === "string" ? v : ""; }); }
  } catch { return NextResponse.json({ ok: false, error: "Bad request body." }, { status: 400 }); }

  // Guard: a shared secret in the body or the Authorization header. If no secret is configured on
  // the server, refuse (fail closed) so we never accept anonymous registrations by accident.
  const provided = String(body.secret ?? "").trim() || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!secret || provided !== secret) return unauthorized();

  const domain = String(body.domain ?? body.website ?? body.url ?? "").trim();
  if (!domain) return NextResponse.json({ ok: false, error: "domain is required." }, { status: 400 });

  const res = await registerWidgetSite({ name: String(body.name ?? "").trim() || undefined, email: String(body.email ?? "").trim() || undefined, domain, source: String(body.source ?? "ghl_funnel") });
  if (!res.ok) return NextResponse.json(res, { status: 400 });
  return NextResponse.json(res);
}
