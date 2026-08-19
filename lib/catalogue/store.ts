import type { SupabaseClient } from "@supabase/supabase-js";
import { safeParseCatalogue, type Catalogue } from "@/lib/catalogue/schema";

/**
 * Load a tenant's latest PUBLISHED catalogue, or null if none/invalid. Shared by the
 * passive surfaces (llms.txt, .well-known/agent-card, .well-known/catalogue). Resilient
 * by design: a missing table (migration not yet applied), no row, or a row that fails
 * schema validation all degrade to null so the caller can fall back — never throws.
 */
export async function loadPublishedCatalogue(
  supabase: SupabaseClient,
  tenantId: string
): Promise<Catalogue | null> {
  const { data, error } = await supabase
    .from("tenant_catalogues")
    .select("doc")
    .eq("tenant_id", tenantId)
    .eq("status", "published")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data?.doc) return null;
  const parsed = safeParseCatalogue(data.doc);
  return parsed.success ? parsed.data : null;
}
