import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listCommunities, listListings, municipalityFromSlug } from "@/lib/server/idx/store";
import { getFeed } from "@/lib/server/idx/feeds";
import { getBlogBrand } from "@/lib/server/blog";
import ListingGrid, { AttributionFooter } from "@/components/idx/ListingGrid";

export async function generateMetadata({ params }: { params: Promise<{ tenantId: string; municipality: string }> }): Promise<Metadata> {
  const { tenantId, municipality } = await params;
  const [brand, m] = await Promise.all([getBlogBrand(tenantId).catch(() => ({ businessName: "Listings", accent: "#1e3a8a" })), municipalityFromSlug(tenantId, municipality).catch(() => null)]);
  const name = m?.name ?? "this city";
  return { title: `Homes for sale in ${name} | ${brand.businessName}`, description: `Browse ${m?.count ?? ""} homes for sale in ${name} by community, with current MLS® listings from ${brand.businessName}.` };
}

/** Municipality page — its communities + a featured grid (G4 community search). */
export default async function MunicipalityPage({ params }: { params: Promise<{ tenantId: string; municipality: string }> }) {
  const { tenantId, municipality } = await params;
  const feed = await getFeed(tenantId).catch(() => null);
  if (feed?.status !== "active") notFound();
  const m = await municipalityFromSlug(tenantId, municipality).catch(() => null);
  if (!m) notFound();
  const [communities, featured, brand] = await Promise.all([
    listCommunities(tenantId, m.name),
    listListings(tenantId, { municipality: m.name, pageSize: 9 }),
    getBlogBrand(tenantId).catch(() => ({ businessName: "Listings", accent: "#1e3a8a" })),
  ]);

  const jsonLd = {
    "@context": "https://schema.org", "@type": "Place", name: m.name, address: { "@type": "PostalAddress", addressLocality: m.name, addressRegion: "ON", addressCountry: "CA" },
  };
  return (
    <div className="min-h-screen bg-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="border-b border-slate-200 bg-white" style={{ borderTopColor: brand.accent, borderTopWidth: 3 }}>
        <div className="mx-auto max-w-5xl px-6 py-8">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href={`/sites/${tenantId}/areas`} className="hover:text-slate-700">Cities</Link><span>/</span><span className="text-slate-600">{m.name}</span>
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Homes for sale in {m.name}</h1>
          <p className="mt-1 text-slate-500">{m.count} active listings across {communities.length} communities.</p>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        {communities.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Communities in {m.name}</h2>
            <div className="flex flex-wrap gap-2">
              {communities.map((c) => (
                <Link key={c.slug} href={`/sites/${tenantId}/areas/${m.slug}/${c.slug}`} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400">
                  {c.name} <span className="text-slate-400">({c.count})</span>
                </Link>
              ))}
            </div>
          </section>
        )}
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Featured in {m.name}</h2>
        <ListingGrid tenantId={tenantId} rows={featured.rows} accent={brand.accent} />
        <AttributionFooter />
      </main>
    </div>
  );
}
