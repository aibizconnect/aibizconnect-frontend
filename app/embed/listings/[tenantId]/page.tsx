import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getFeed } from "@/lib/server/idx/feeds";
import { getBlogBrand } from "@/lib/server/blog";
import { parseBlockConfig, narrowFilter } from "@/lib/idx/block-config";
import { resolveDomainScope, canonicalHost } from "@/lib/server/idx/block-domains";
import EmbedListings from "@/components/idx/EmbedListings";

/**
 * Chrome-less, framable listings surface — the document the GHL block's iframe loads. Same data and
 * gating as /sites/<t>/listings, but no site header/footer and every knob comes from the query
 * string so one URL is both the published block and the config page's live preview.
 *
 * The three layers all resolve here:
 *   1. AGENT  — `tenantId` picks that agent's own idx_feeds row (must be `active`), so an embed can
 *               never show another agent's feed.
 *   2. DOMAIN — the embedding hostname (`?host=`, else the Referer) must match one of the agent's
 *               registered block domains, and that domain's saved search scopes the block.
 *   3. PAGE   — the snippet's filters, which may only narrow the domain's scope.
 */
export const metadata: Metadata = { title: "Listings", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ListingsEmbed({ params, searchParams }: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { tenantId } = await params;
  const sp = await searchParams;
  const feed = await getFeed(tenantId).catch(() => null);
  if (feed?.status !== "active") notFound();

  const one = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const { filter: pageFilter, options } = parseBlockConfig(one);

  // Prefer the hostname the loader reported; fall back to the Referer for hand-written iframes.
  const h = await headers();
  const host = canonicalHost(one("host") || h.get("referer") || "");
  const scope = await resolveDomainScope(tenantId, host).catch(() => ({ allowed: true, filter: {}, matched: null, unrestricted: true }));

  const brand = await getBlogBrand(tenantId).catch(() => ({ businessName: "Listings", accent: "#1e3a8a" }));

  if (!scope.allowed) {
    return (
      <div className="bg-white px-6 py-10 text-center text-slate-600">
        <p className="text-sm font-medium">This listings block isn’t authorized for {host || "this domain"}.</p>
        <p className="mt-1 text-xs text-slate-400">Add the domain under Sites → Listings (IDX) → Block domains to activate it here.</p>
      </div>
    );
  }

  return (
    <EmbedListings
      tenantId={tenantId}
      initialFilter={narrowFilter(scope.filter, pageFilter)}
      scopeFilter={scope.filter}
      options={options}
      brandAccent={brand.accent}
      businessName={brand.businessName}
    />
  );
}
