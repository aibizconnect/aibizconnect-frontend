import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listListings, type ListingFilter } from "@/lib/server/idx/store";
import { getFeed } from "@/lib/server/idx/feeds";
import { getBlogBrand } from "@/lib/server/blog";
import ListingSearch from "@/components/idx/ListingSearch";
import ListingGrid, { AttributionFooter } from "@/components/idx/ListingGrid";

export const metadata: Metadata = { title: "Listings" };

/** Public IDX search (G4). Class-tabbed filters (Residential · Condo & Other · Commercial). */
export default async function PublicListings({ params, searchParams }: { params: Promise<{ tenantId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { tenantId } = await params;
  const sp = await searchParams;
  const feed = await getFeed(tenantId).catch(() => null);
  if (feed?.status !== "active") notFound();

  const filter: ListingFilter = {
    propertyClass: sp.class || undefined, transactionType: sp.t || undefined, city: sp.city || undefined,
    minPrice: sp.min ? Number(sp.min) : undefined, maxPrice: sp.max ? Number(sp.max) : undefined,
    beds: sp.beds ? Number(sp.beds) : undefined, baths: sp.baths ? Number(sp.baths) : undefined,
    maxFee: sp.fee ? Number(sp.fee) : undefined, page: sp.page ? Number(sp.page) : 0,
  };
  const [{ rows, total }, brand] = await Promise.all([listListings(tenantId, filter), getBlogBrand(tenantId).catch(() => ({ businessName: "Listings", accent: "#1e3a8a" }))]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white" style={{ borderTopColor: brand.accent, borderTopWidth: 3 }}>
        <div className="mx-auto max-w-6xl px-6 py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: brand.accent }}>{brand.businessName}</div>
            <Link href={`/sites/${tenantId}/areas`} className="text-sm font-medium hover:underline" style={{ color: brand.accent }}>Browse by city &amp; community →</Link>
          </div>
          <h1 className="mb-4 mt-1 text-3xl font-bold tracking-tight text-slate-900">Listings</h1>
          <ListingSearch tenantId={tenantId} accent={brand.accent} initial={sp} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-4 text-sm text-slate-500">{total} listing{total === 1 ? "" : "s"}{sp.class ? ` · ${sp.class}` : ""}{sp.t ? ` · ${sp.t}` : ""}</div>
        <ListingGrid tenantId={tenantId} rows={rows} accent={brand.accent} />
        <AttributionFooter />
      </main>
    </div>
  );
}
