import Link from "next/link";
import { listWebsites } from "../website/website-actions";
import AddWebsiteButton from "@/components/sites/AddWebsiteButton";
import StartFromTemplate from "@/components/sites/StartFromTemplate";
import { funnelsEnabled } from "@/lib/flags";

/**
 * Sites HUB (Copilot ruling): the canonical entry for the Sites module. A trimmed,
 * polished tab row (Websites · Funnels · Blogs · Forms · Client Portal) — only the
 * tabs we actually support. The Websites tab lists the tenant's WEBSITES (not pages);
 * clicking a website opens its editor at /tenants/{id}/website/{websiteId}.
 */
const TABS = [
  { key: "websites", label: "Websites" },
  { key: "funnels", label: "Funnels" },
  { key: "blogs", label: "Blogs" },
  { key: "store", label: "Store" },
  { key: "listings", label: "Listings" },
  { key: "forms", label: "Forms" },
  { key: "redirects", label: "Redirects" },
  { key: "portal", label: "Client Portal" },
] as const;

export default async function SitesPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const websites = await listWebsites(tenantId);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sites</h1>
      <p className="mb-5 text-sm text-slate-500">Your websites, funnels and more — all in one place.</p>

      {/* Trimmed polished tab row */}
      <div className="mb-6 flex gap-6 border-b border-slate-200 text-sm">
        {TABS.map((t) =>
          t.key === "websites" ? (
            <span key={t.key} className="border-b-2 border-[#1e3a8a] pb-2 font-semibold text-[#1e3a8a]">{t.label}</span>
          ) : t.key === "funnels" && funnelsEnabled() ? (
            <Link key={t.key} href={`/tenants/${tenantId}/sites/funnels`} className="pb-2 text-slate-500 hover:text-slate-800">{t.label}</Link>
          ) : t.key === "forms" ? (
            <Link key={t.key} href={`/tenants/${tenantId}/sites/forms`} className="pb-2 text-slate-500 hover:text-slate-800">{t.label}</Link>
          ) : t.key === "blogs" ? (
            <Link key={t.key} href={`/tenants/${tenantId}/sites/blog`} className="pb-2 text-slate-500 hover:text-slate-800">{t.label}</Link>
          ) : t.key === "store" ? (
            <Link key={t.key} href={`/tenants/${tenantId}/sites/store`} className="pb-2 text-slate-500 hover:text-slate-800">{t.label}</Link>
          ) : t.key === "listings" ? (
            <Link key={t.key} href={`/tenants/${tenantId}/sites/listings`} className="pb-2 text-slate-500 hover:text-slate-800">{t.label}</Link>
          ) : t.key === "redirects" ? (
            <Link key={t.key} href={`/tenants/${tenantId}/sites/redirects`} className="pb-2 text-slate-500 hover:text-slate-800">{t.label}</Link>
          ) : t.key === "portal" ? (
            <Link key={t.key} href={`/tenants/${tenantId}/sites/portal`} className="pb-2 text-slate-500 hover:text-slate-800">{t.label}</Link>
          ) : (
            <span key={t.key} className="pb-2 text-slate-400">{t.label}<span className="ml-1 text-[10px] uppercase tracking-wide text-slate-300">soon</span></span>
          )
        )}
      </div>

      {/* Start a new site from an industry template (or rebuild an existing one) */}
      <div className="mb-6"><StartFromTemplate tenantId={tenantId} websites={websites.map((w) => ({ id: w.id, name: w.name }))} /></div>

      {/* Websites list */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Websites</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">{websites.length} {websites.length === 1 ? "website" : "websites"}</span>
          <AddWebsiteButton tenantId={tenantId} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {websites.map((w) => (
          <Link key={w.id} href={`/tenants/${tenantId}/website/${w.id}`}
            className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#1e3a8a]/40 hover:shadow">
            <div className="flex items-start justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#1e3a8a]/10 text-[#1e3a8a]">🌐</div>
              {w.is_primary && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700">Primary</span>}
            </div>
            <h3 className="mt-3 font-semibold text-slate-800 group-hover:text-[#1e3a8a]">{w.name}</h3>
            <p className="text-xs text-slate-400">{w.primary_domain || `/${w.slug}`}</p>
            <span className="mt-3 inline-block text-sm font-medium text-[#1e3a8a]">Open editor →</span>
          </Link>
        ))}
      </div>

      {websites.some((w) => w.synthetic) && (
        <p className="mt-4 text-xs text-slate-400">
          Showing a default website. Apply the <code>0016_websites</code> migration to manage multiple websites per tenant.
        </p>
      )}
    </div>
  );
}
