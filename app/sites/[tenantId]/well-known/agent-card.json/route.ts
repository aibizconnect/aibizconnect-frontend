import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadPublishedCatalogue } from "@/lib/catalogue/store";
import { buildAgentCard } from "@/lib/catalogue/agent-card";

/**
 * A2A Agent Card — served at /.well-known/agent-card.json on the tenant domain (middleware
 * rewrites that path here; this app folder is `well-known` without the leading dot so Next's
 * file scanner indexes it reliably). Tells external agents what this business agent can do and
 * how to reach it. 404s when the tenant has no published catalogue.
 */
export async function GET(req: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const origin = new URL(req.url).origin;
  const supabase = await createSupabaseServerClient();

  const catalogue = await loadPublishedCatalogue(supabase, tenantId);
  if (!catalogue) {
    return new Response(JSON.stringify({ error: "no_catalogue" }), {
      status: 404,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const a2aBase = process.env.NEXT_PUBLIC_A2A_BASE || undefined;
  const card = buildAgentCard(catalogue, origin, tenantId, a2aBase);

  return new Response(JSON.stringify(card, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*", // agents on any origin must be able to fetch this
      "Cache-Control": "public, max-age=300",
    },
  });
}
