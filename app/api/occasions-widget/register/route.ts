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
    else if (ctype.includes("form")) { const fd = await req.formData(); fd.forEach((v, k) => { body[k] = typeof v === "string" ? v : ""; }); }
  } catch { /* tolerate empty / non-parseable bodies — fall back to query params below */ }
  if (!body || typeof body !== "object") body = {};

  // GHL's basic "Webhook" action is inconsistent about where it puts our custom key-value pairs:
  // top-level JSON body, nested under `customData`/`contact`, or appended as query-string params.
  // Read from all of them (plus the Authorization header for the secret) so any shape works.
  const qp: Record<string, any> = {};
  try { new URL(req.url).searchParams.forEach((v, k) => { qp[k] = v; }); } catch { /* no-op */ }
  const nestedKeys = ["customData", "custom_data", "contact", "data"] as const;
  const pick = (...keys: string[]): string => {
    for (const k of keys) {
      if (body[k] != null && body[k] !== "") return String(body[k]);
      for (const n of nestedKeys) { const nv = body[n]?.[k]; if (nv != null && nv !== "") return String(nv); }
      if (qp[k] != null && qp[k] !== "") return String(qp[k]);
    }
    return "";
  };

  // Guard: a shared secret in the body, a nested field, a query param, or the Authorization header.
  // If no secret is configured on the server, refuse (fail closed) so we never accept anonymous regs.
  const provided = pick("secret").trim() || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!secret || provided !== secret) return unauthorized();

  const domain = pick("domain", "website", "url").trim();
  if (!domain) return NextResponse.json({ ok: false, error: "domain is required." }, { status: 400 });

  const name = (pick("name", "full_name", "fullName") || [pick("first_name", "firstName"), pick("last_name", "lastName")].filter(Boolean).join(" ")).trim();
  const res = await registerWidgetSite({ name: name || undefined, email: pick("email").trim() || undefined, domain, source: pick("source") || "ghl_funnel" });
  if (!res.ok) return NextResponse.json(res, { status: 400 });
  return NextResponse.json(res);
}
