import Link from "next/link";
import { listSitePages, getSiteSettings } from "../actions";
import { listWebsites } from "../website-actions";
import WebsiteWorkspace from "./WebsiteWorkspace";

/**
 * Website editor view, SCOPED BY websiteId (Copilot ruling: /website/{websiteId} is
 * the page editor for one website). Shows that website's pages + the polished tab row.
 * The Pages and Settings tabs are live (Settings wires the site-wide SiteSettings store);
 * the rest are "soon". (Page rows are still tenant-scoped until the 0016 migration adds
 * website_id filtering — this route is the canonical entry now and stays correct after.)
 */
export default async function WebsiteByIdPage({
  params,
}: {
  params: Promise<{ tenantId: string; websiteId: string }>;
}) {
  const { tenantId, websiteId } = await params;
  const [pages, websites, settings] = await Promise.all([listSitePages(tenantId, websiteId), listWebsites(tenantId), getSiteSettings(tenantId)]);
  const site = websites.find((w) => w.id === websiteId) ?? websites[0];
  // The tenant's connected/paid domain — the SEO & GEO analyzer is locked to this.
  const paidDomain = site?.primary_domain || settings?.customDomain || null;

  return (
    <div className="w-full px-2">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href={`/tenants/${tenantId}/sites`} className="text-sm text-[#1e3a8a] hover:underline">← Back to Sites</Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{site?.name ?? "Website"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/tenants/${tenantId}/website/${websiteId}/studio`}
            className="rounded-lg bg-[#1e3a8a] px-3 py-2 text-sm font-medium text-white hover:opacity-90">✨ AI Studio</Link>
          <a href={`/sites/${tenantId}`} target="_blank" rel="noreferrer"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Open live site ↗
          </a>
        </div>
      </div>

      <WebsiteWorkspace tenantId={tenantId} websiteId={websiteId} pages={pages} websiteName={site?.name}
        subdomain={site?.subdomain ?? site?.slug ?? null} isPrimary={!!site?.is_primary} websiteCount={websites.length}
        paidDomain={paidDomain} />
    </div>
  );
}
