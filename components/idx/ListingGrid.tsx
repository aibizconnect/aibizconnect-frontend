import Link from "next/link";
import type { ListingCard } from "@/lib/server/idx/store";

const price = (n: number | null, ccy: string) => (n == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: ccy || "CAD", maximumFractionDigits: 0 }).format(n));

/** Shared IDX listing card grid (G4). Used by the search page + community/area pages. */
export default function ListingGrid({ tenantId, rows, accent }: { tenantId: string; rows: ListingCard[]; accent: string }) {
  if (rows.length === 0) return <p className="py-16 text-center text-slate-400">No listings here right now — check back soon.</p>;
  return (
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
  );
}

export function AttributionFooter() {
  return (
    <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4 text-xs text-slate-400">
      <a href="https://www.realtor.ca/en" target="_blank" rel="noreferrer" aria-label="Powered by REALTOR.ca">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img width={125} src="https://www.realtor.ca/images/en-ca/powered_by_realtor.svg" alt="Powered by REALTOR.ca" />
      </a>
      <span>Listing data provided by CREA DDF®. Information is deemed reliable but not guaranteed accurate. Listings are owned by the respective listing brokerages.</span>
    </div>
  );
}
