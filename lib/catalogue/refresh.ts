import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { parseCatalogue, safeParseCatalogue, type Catalogue } from "@/lib/catalogue/schema";
import { extractJsonLdGraph, buildDraftCatalogue } from "@/lib/catalogue/extract";
import { enforceEmailHygiene } from "@/lib/catalogue/hygiene";
import { publishCatalogueToEdge, resolvePublishHosts } from "@/lib/catalogue/publish-edge";

/**
 * Scheduled catalogue refresh — keeps every published Knowledge Catalogue fresh:
 *  1) Re-extracts CONTENT from the live site and merges non-regulated fields (services, FAQs,
 *     areas, bio) into the stored doc — but ONLY for catalogues that are NOT manually verified,
 *     so human curation / regulated data (license, ratings) is never clobbered.
 *  2) Re-publishes the (possibly updated) doc to the Cloudflare edge KV so the served surface
 *     always matches the DB.
 * Fire from the Cloudflare cron worker on a schedule (e.g. weekly) via the cron route.
 */

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": BROWSER_UA }, redirect: "follow" });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

/** Merge freshly-extracted CONTENT into a stored catalogue without touching curated/regulated data. */
function mergeContent(stored: Catalogue, fresh: Catalogue): Catalogue {
  return {
    ...stored,
    identity: {
      ...stored.identity,
      short_bio: fresh.identity.short_bio || stored.identity.short_bio,
      long_bio: fresh.identity.long_bio || stored.identity.long_bio,
      professional_role: fresh.identity.professional_role || stored.identity.professional_role,
    },
    services: fresh.services.length ? fresh.services : stored.services,
    faqs: fresh.faqs.length ? fresh.faqs : stored.faqs,
    service_areas: fresh.service_areas.length ? fresh.service_areas : stored.service_areas,
    // verification, credentials, reviews, performance_metrics, policies, citations: keep the stored (curated) values.
  };
}

export interface RefreshResult {
  checked: number;
  reextracted: number;
  updated: number;
  republished: number;
  errors: string[];
}

export async function refreshCatalogues(opts?: { reextract?: boolean }): Promise<RefreshResult> {
  const reextract = opts?.reextract ?? true;
  const supabase = createSupabaseServiceClient();
  const res: RefreshResult = { checked: 0, reextracted: 0, updated: 0, republished: 0, errors: [] };

  const { data, error } = await supabase
    .from("tenant_catalogues")
    .select("id, tenant_id, doc")
    .eq("status", "published");
  if (error) {
    res.errors.push(error.message);
    return res;
  }

  for (const row of (data ?? []) as Array<{ id: string; tenant_id: string; doc: unknown }>) {
    res.checked++;
    const parsed = safeParseCatalogue(row.doc);
    if (!parsed.success) {
      res.errors.push(`invalid stored doc for tenant ${row.tenant_id}`);
      continue;
    }
    let doc = parsed.data;

    // 1) Re-extract content — only for non-verified (auto-managed) catalogues.
    if (reextract && !doc.verification.verified) {
      const url = doc.citations?.canonical_url || doc.identity.brand?.site_url;
      if (url) {
        res.reextracted++;
        const html = await fetchHtml(url);
        if (html) {
          const fresh = enforceEmailHygiene(
            parseCatalogue(
              buildDraftCatalogue({ jsonLd: extractJsonLdGraph(html), siteUrl: url, vertical: doc.vertical })
            )
          );
          const merged = mergeContent(doc, fresh);
          if (JSON.stringify(merged) !== JSON.stringify(doc)) {
            doc = merged;
            const { error: upErr } = await supabase
              .from("tenant_catalogues")
              .update({ doc: merged, updated_at: new Date().toISOString() })
              .eq("id", row.id);
            if (upErr) res.errors.push(`update ${row.tenant_id}: ${upErr.message}`);
            else res.updated++;
          }
        }
      }
    }

    // 2) Refresh the edge snapshot from the (possibly updated) doc.
    try {
      const hosts = await resolvePublishHosts(supabase, row.tenant_id);
      if (hosts.length) {
        await publishCatalogueToEdge({ hosts, catalogue: doc, tenantId: row.tenant_id });
        res.republished++;
      }
    } catch (e) {
      res.errors.push(`publish ${row.tenant_id}: ${(e as Error).message}`);
    }
  }

  return res;
}
