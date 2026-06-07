import { NextRequest, NextResponse } from "next/server";
import { listIndustryTemplates, getIndustryTemplate, instantiateTemplate, validateTemplate } from "@/lib/design/templates";

/**
 * GET  /api/agent/templates                      -> list all industry templates (catalog)
 * GET  /api/agent/templates?key=real-estate      -> full template blueprint
 * GET  /api/agent/templates?key=real-estate&businessName=Ali%20Realty
 *                                                 -> instantiated blueprint + validation
 *
 * Read-only. Templates produce DRAFTS downstream; this endpoint never writes, publishes,
 * sends, or spends. Live-go for any resulting site still runs through supervisedPublish
 * (O-3 hard critic gate) per tenant.
 */
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const businessName = req.nextUrl.searchParams.get("businessName");

  if (!key) {
    return NextResponse.json({ status: "ok", templates: listIndustryTemplates() });
  }

  const base = getIndustryTemplate(key);
  if (!base) {
    return NextResponse.json({ status: "error", error: `unknown template "${key}"` }, { status: 404 });
  }

  const validation = validateTemplate(key);
  const template = businessName ? instantiateTemplate(key, { businessName }) : base;
  return NextResponse.json({ status: "ok", template, validation });
}
