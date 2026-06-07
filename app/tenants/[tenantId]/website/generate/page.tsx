import { primaryWebsiteId } from "@/lib/server/launchpad";
import GenerateSiteFlow from "@/components/sites/GenerateSiteFlow";

/**
 * "Build my site" — the real AI website generator. Learns the tenant's existing site, then builds a
 * superior, on-brand draft (rebuilt pages + funnel/SEO pages). Drafts-only; review in the editor.
 */
export default async function GenerateSitePage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const websiteId = await primaryWebsiteId(tenantId).catch(() => null);
  return <GenerateSiteFlow tenantId={tenantId} websiteId={websiteId} />;
}
