import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listListings, municipalityFromSlug, communityFromSlug } from "@/lib/server/idx/store";
import { getFeed } from "@/lib/server/idx/feeds";
import { getBlogBrand } from "@/lib/server/blog";
import ListingGrid, { AttributionFooter } from "@/components/idx/ListingGrid";

export async function generateMetadata({ params }: { params: Promise<{ tenantId: string; municipality: string; community: string }> }): Promise<Metadata> {
  const { tenantId, municipality, community } = await params;
  const brand = await getBlogBrand(tenantId).catch(() => ({ businessName: "Listings", accent: "#1e3a8a" }));
  const m = await municipalityFromSlug(tenantId, municipality).catch(() => null);
  const c = m ? await communityFromSlug(tenantId, m.name, community).catch(() => null) : null;
  const where = c && m ? `${c.name}, ${m.name}` : "this community";
  return { title: `Homes for sale in ${where} | ${brand.businessName}`, description: `Current MLS® listings for sale in ${where} — ${c?.count ?? ""} homes from ${brand.businessName}.` };
}

/** Community page — listings in a community, with GEO JSON-LD (G4 community search leaf). */
export default async function CommunityPage({ params, searchParams }: { params: Promise<{ tenantId: string; municipality: string; community: string }>; searchParams: Promise<{ page?: string }> }) {
  const { tenantId, municipality, community } = await params;
  const { page } = await searchParams;
  const feed = await getFeed(tenantId).catch(() => null);
  if (feed?.status !== "active") notFound();
  const m = await municipalityFromSlug(tenantId, municipality).catch(() => null);
  if (!m) notFound();
  const c = await communityFromSlug(tenantId, m.name, community).catch(() => null);
  if (!c) notFound();
  const [{ rows, total }, brand] = await Promise.all([
    listListings(tenantId, { municipality: m.name, community: c.name, page: page ? Number(page) : 0, pageSize: 24 }),
    getBlogBrand(tenantId).catch(() => ({ businessName: "Listings", accent: "#1e3a8a" })),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList", name: `Homes for sale in ${c.name}, ${m.name}`, numberOfItems: total,
    itemListElement: rows.slice(0, 20).map((l, i) => ({ "@type": "ListItem", position: i + 1, url: `/sites/${tenantId}/listings/${l.id}`, name: `${l.beds ?? ""} bed home in ${c.name}` })),
  };
  const crumbs = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Cities", item: `/sites/${tenantId}/areas` },
      { "@type": "ListItem", position: 2, name: m.name, item: `/sites/${tenantId}/areas/${m.slug}` },
      { "@type": "ListItem", position: 3, name: c.name, item: `/sites/${tenantId}/areas/${m.slug}/${c.slug}` },
    ],
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <header className="border-b border-slate-200 bg-white" style={{ borderTopColor: brand.accent, borderTopWidth: 3 }}>
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href={`/sites/${tenantId}/areas`} className="hover:text-slate-700">Cities</Link><span>/</span>
            <Link href={`/sites/${tenantId}/areas/${m.slug}`} className="hover:text-slate-700">{m.name}</Link><span>/</span><span className="text-slate-600">{c.name}</span>
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Homes for sale in {c.name}</h1>
          <p className="mt-1 text-slate-500">{total} active listing{total === 1 ? "" : "s"} in {c.name}, {m.name}.</p>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <ListingGrid tenantId={tenantId} rows={rows} accent={brand.accent} />
        <AttributionFooter />
      </main>
    </div>
  );
}
