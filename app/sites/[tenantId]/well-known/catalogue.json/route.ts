import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadPublishedCatalogue } from "@/lib/catalogue/store";
import { toPublicView } from "@/lib/catalogue/schema";

/**
 * Full machine-readable Knowledge Catalogue — served at /.well-known/catalogue.json on the
 * tenant domain (middleware rewrites that path here). This is the "be cited" surface: the
 * complete structured business record for AI engines. Regulated fields (license number,
 * aggregate ratings) are redacted unless verification is fresh (toPublicView). 404s when the
 * tenant has no published catalogue.
 */
export async function GET(req: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const supabase = await createSupabaseServerClient();

  const catalogue = await loadPublishedCatalogue(supabase, tenantId);
  if (!catalogue) {
    return new Response(JSON.stringify({ error: "no_catalogue" }), {
      status: 404,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const publicDoc = toPublicView(catalogue);

  return new Response(JSON.stringify(publicDoc, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300",
    },
  });
}
