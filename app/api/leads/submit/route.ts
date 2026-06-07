import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createContact } from "@/lib/crm";

/**
 * POST /api/leads/submit — public lead capture (Copilot-ratified, store-only). Used by the
 * site contact form AND popups. A site/funnel VISITOR submits their own details; we persist
 * one row into `form_submissions` (the durable, applied lead store) capturing ALL fields
 * including the message + any custom fields, then best-effort create a CRM Contact. Nothing
 * is sent or charged. Rate-limited per IP+tenant (5/min, SOFT drop — over-limit still
 * returns ok so we never leak limits to bots). Degrades gracefully if a table is missing.
 */
export const runtime = "nodejs";

// Best-effort in-memory limiter (per server instance). v1 — fine for soft protection.
const HITS = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const LIMIT = 5;
function rateOk(key: string): boolean {
  const now = Date.now();
  const arr = (HITS.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  HITS.set(key, arr);
  if (HITS.size > 5000) { for (const k of HITS.keys()) { HITS.delete(k); if (HITS.size <= 4000) break; } }
  return arr.length <= LIMIT;
}

const str = (v: unknown, max = 2000): string | undefined => {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s ? s.slice(0, max) : undefined;
};

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 }); }

  const tenantId = str(body?.tenantId, 64);
  if (!tenantId) return NextResponse.json({ ok: false, error: "Missing tenant." }, { status: 400 });

  // Soft rate limit (per IP + tenant). Over-limit → pretend success, store nothing.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";
  if (!rateOk(`${ip}:${tenantId}`)) return NextResponse.json({ ok: true });

  // Collect the standard fields + any custom fields under `fields`.
  const data: Record<string, string> = {};
  for (const k of ["name", "email", "phone", "message"]) { const v = str(body?.[k]); if (v) data[k] = v; }
  if (body?.fields && typeof body.fields === "object") {
    for (const [k, v] of Object.entries(body.fields)) { const s = str(v); if (s) data[k] = s; }
  }
  if (!data.email && !data.phone && !Object.keys(data).length) {
    return NextResponse.json({ ok: false, error: "Please provide your contact details." }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  let stored = false;
  // 1) Durable store — form_submissions (captures everything, incl. message + custom fields).
  try {
    const { error } = await supabase.from("form_submissions").insert({
      tenant_id: tenantId,
      website_id: str(body?.websiteId, 64) ?? null,
      page_id: str(body?.pageId, 64) ?? null,
      form_name: str(body?.source, 80) ?? "website form",
      data,
      source_url: str(body?.sourceUrl, 1000) ?? req.headers.get("referer") ?? null,
    });
    stored = !error;
    if (error) console.error("[leads/submit] form_submissions insert failed:", error.message);
  } catch (e: any) { console.error("[leads/submit] form_submissions error:", e?.message); }

  // 2) Best-effort CRM contact (non-fatal if the CRM tables aren't applied yet).
  try { await createContact(tenantId, { name: data.name, email: data.email, phone: data.phone, source: str(body?.source, 80) || "website form" }); }
  catch (e: any) { console.error("[leads/submit] createContact error:", e?.message); }

  // Never fail the visitor for backend storage issues — the submission UX must feel solid.
  return NextResponse.json({ ok: true, stored });
}
