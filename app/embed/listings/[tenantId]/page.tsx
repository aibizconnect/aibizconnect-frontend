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
 *               registered block domains, and that domain's saved search scopes the block. Builder
 *               hosts (GHL preview, our studio) and test mode render as an unscoped PREVIEW instead,
 *               so a GHL test site works before the real domain is registered or even chosen.
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
  const testMode = !!(feed.config as { blockTestMode?: boolean } | undefined)?.blockTestMode;
  const scope = await resolveDomainScope(tenantId, host, { testMode }).catch(() => ({ mode: "unrestricted" as const, filter: {}, matched: null }));

  const brand = await getBlogBrand(tenantId).catch(() => ({ businessName: "Listings", accent: "#1e3a8a" }));

  if (scope.mode === "blocked") {
    return (
      <div className="bg-white px-6 py-10 text-center text-slate-600">
        <p className="text-sm font-medium">This listings block isn’t authorized for {host || "this domain"}.</p>
        <p className="mt-1 text-xs text-slate-400">Add the domain under Sites → Listings (IDX) → Block domains, or switch on testing mode there while you build.</p>
      </div>
    );
  }

  return (
    <>
      {scope.mode === "preview" && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-[11px] text-amber-800">
          Preview — {host || "this domain"} isn’t a registered block domain, so the whole feed is showing. Register it to scope these listings.
        </div>
      )}
      <EmbedListings
        tenantId={tenantId}
        initialFilter={narrowFilter(scope.filter, pageFilter)}
        scopeFilter={scope.filter}
        options={options}
        brandAccent={brand.accent}
        businessName={brand.businessName}
      />
    </>
  );
}
