import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { idxEnabled } from "@/lib/flags";
import { listListings, type ListingFilter } from "@/lib/server/idx/store";
import { getFeed } from "@/lib/server/idx/feeds";
import { getBlogBrand } from "@/lib/server/blog";

export const metadata: Metadata = { title: "Listings" };
const price = (n: number | null, ccy: string) => (n == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: ccy || "CAD", maximumFractionDigits: 0 }).format(n));

/** Public IDX search (G4). Gated: only renders when IDX is enabled and the feed is active. */
export default async function PublicListings({ params, searchParams }: { params: Promise<{ tenantId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { tenantId } = await params;
  const sp = await searchParams;
  const feed = await getFeed(tenantId).catch(() => null);
  if (!idxEnabled() || feed?.status !== "active") notFound();

  const filter: ListingFilter = {
    city: sp.city || undefined, minPrice: sp.min ? Number(sp.min) : undefined, maxPrice: sp.max ? Number(sp.max) : undefined,
    beds: sp.beds ? Number(sp.beds) : undefined, propertyType: sp.type || undefined,
    page: sp.page ? Number(sp.page) : 0,
  };
  const [{ rows, total }, brand] = await Promise.all([listListings(tenantId, filter), getBlogBrand(tenantId).catch(() => ({ businessName: "Listings", accent: "#1e3a8a" }))]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white" style={{ borderTopColor: brand.accent, borderTopWidth: 3 }}>
        <div className="mx-auto max-w-6xl px-6 py-6">
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: brand.accent }}>{brand.businessName}</div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Listings</h1>
          <form className="mt-4 flex flex-wrap gap-2 text-sm">
            <input name="city" defaultValue={sp.city ?? ""} placeholder="City" className="rounded-lg border border-slate-300 px-3 py-1.5" />
            <input name="min" defaultValue={sp.min ?? ""} placeholder="Min $" className="w-28 rounded-lg border border-slate-300 px-3 py-1.5" />
            <input name="max" defaultValue={sp.max ?? ""} placeholder="Max $" className="w-28 rounded-lg border border-slate-300 px-3 py-1.5" />
            <input name="beds" defaultValue={sp.beds ?? ""} placeholder="Beds" className="w-20 rounded-lg border border-slate-300 px-3 py-1.5" />
            <button className="rounded-lg px-4 py-1.5 font-medium text-white" style={{ background: brand.accent }}>Search</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-4 text-sm text-slate-500">{total} listing{total === 1 ? "" : "s"}</div>
        {rows.length === 0 ? <p className="py-16 text-center text-slate-400">No listings match.</p> : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((l) => (
              <Link key={l.id} href={`/sites/${tenantId}/listings/${l.id}`} className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:shadow">
                {l.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.cover} alt="" className="aspect-[4/3] w-full object-cover" />
                ) : <div className="flex aspect-[4/3] w-full items-center justify-center bg-slate-100 text-4xl text-slate-300">🏡</div>}
                <div className="p-4">
                  <div className="text-lg font-semibold text-slate-900">{price(l.listPrice, l.currency)}</div>
                  <div className="text-sm text-slate-600">{[l.beds && `${l.beds} bd`, l.baths && `${l.baths} ba`, l.sqft && `${l.sqft} sqft`].filter(Boolean).join(" · ")}</div>
                  <div className="truncate text-sm text-slate-500">{[l.city, l.province].filter(Boolean).join(", ")}</div>
                  {l.brokerage && <div className="mt-1 truncate text-[11px] text-slate-400">Listed by {l.brokerage}</div>}
                </div>
              </Link>
            ))}
          </div>
        )}
        <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4 text-xs text-slate-400">
          <a href="https://www.realtor.ca/en" target="_blank" rel="noreferrer" aria-label="Powered by REALTOR.ca">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img width={125} src="https://www.realtor.ca/images/en-ca/powered_by_realtor.svg" alt="Powered by REALTOR.ca" />
          </a>
          <span>Listing data provided by CREA DDF®. Information is deemed reliable but not guaranteed accurate. Listings are owned by the respective listing brokerages.</span>
        </div>
      </main>
    </div>
  );
}
