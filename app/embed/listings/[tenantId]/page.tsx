import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFeed } from "@/lib/server/idx/feeds";
import { getBlogBrand } from "@/lib/server/blog";
import { parseBlockConfig } from "@/lib/idx/block-config";
import EmbedListings from "@/components/idx/EmbedListings";

/**
 * Chrome-less, framable listings surface — the document the GHL block's iframe loads. Same data and
 * gating as /sites/<t>/listings, but no site header/footer and every knob comes from the query
 * string so one URL is both the published block and the config page's live preview.
 *
 * `tenantId` is the agent: it resolves to that agent's own idx_feeds row, so an embed can never
 * show another agent's feed.
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

  const { filter, options } = parseBlockConfig((k) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  });
  const brand = await getBlogBrand(tenantId).catch(() => ({ businessName: "Listings", accent: "#1e3a8a" }));

  return (
    <EmbedListings
      tenantId={tenantId}
      initialFilter={filter}
      options={options}
      brandAccent={brand.accent}
      businessName={brand.businessName}
    />
  );
}
