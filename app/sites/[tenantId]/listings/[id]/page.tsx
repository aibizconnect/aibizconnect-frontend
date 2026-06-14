import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { idxEnabled } from "@/lib/flags";
import { getListing } from "@/lib/server/idx/store";
import { getFeed } from "@/lib/server/idx/feeds";
import { getBlogBrand } from "@/lib/server/blog";
import ListingInquiry from "@/components/idx/ListingInquiry";

const price = (n: any, ccy: string) => (n == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: ccy || "CAD", maximumFractionDigits: 0 }).format(Number(n)));

export async function generateMetadata({ params }: { params: Promise<{ tenantId: string; id: string }> }): Promise<Metadata> {
  const { tenantId, id } = await params;
  const r = await getListing(tenantId, id).catch(() => null);
  if (!r) return { title: "Listing" };
  const l = r.listing;
  return { title: `${price(l.list_price, l.currency)} — ${[l.address_city, l.address_province].filter(Boolean).join(", ")}`, description: (l.public_remarks ?? "").slice(0, 160) };
}

/** Public IDX listing detail + CRM inquiry (G4). Gated on IDX enabled + active feed. */
export default async function ListingDetail({ params }: { params: Promise<{ tenantId: string; id: string }> }) {
  const { tenantId, id } = await params;
  const feed = await getFeed(tenantId).catch(() => null);
  if (!idxEnabled() || feed?.status !== "active") notFound();
  const [r, brand] = await Promise.all([getListing(tenantId, id), getBlogBrand(tenantId).catch(() => ({ businessName: "Listings", accent: "#1e3a8a" }))]);
  if (!r) notFound();
  const l = r.listing;
  const ref = l.mls_number ? `MLS® ${l.mls_number}` : [l.address_street, l.address_city].filter(Boolean).join(", ");
  const addr = [l.address_street, l.address_unit && `#${l.address_unit}`, l.address_city, l.address_province, l.address_postal_code].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <Link href={`/sites/${tenantId}/listings`} className="text-sm font-medium" style={{ color: brand.accent }}>← All listings</Link>
        {r.media.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {r.media.slice(0, 6).map((m, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={m.url} alt="" className={`w-full rounded-lg object-cover ${i === 0 ? "col-span-2 row-span-2 aspect-[4/3] sm:col-span-2" : "aspect-square"}`} />
            ))}
          </div>
        )}
        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="text-3xl font-bold text-slate-900">{price(l.list_price, l.currency)}</div>
            <div className="mt-1 text-slate-600">{[l.bedrooms && `${l.bedrooms} beds`, l.bathrooms && `${Number(l.bathrooms)} baths`, l.sqft_total && `${Number(l.sqft_total)} sqft`, l.year_built && `built ${l.year_built}`].filter(Boolean).join(" · ")}</div>
            <div className="mt-1 text-slate-500">{addr}</div>
            {l.status && <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{l.status}</span>}
            {l.public_remarks && <p className="mt-5 whitespace-pre-wrap leading-relaxed text-slate-700">{l.public_remarks}</p>}
            <p className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-400">
              {ref}{l.listing_brokerage_name ? ` · Listed by ${l.listing_brokerage_name}` : ""}. Data provided by CREA DDF®; deemed reliable but not guaranteed. Last updated {new Date(l.modification_timestamp).toLocaleDateString()}.
            </p>
          </div>
          <div><ListingInquiry tenantId={tenantId} listingRef={ref} accent={brand.accent} /></div>
        </div>
      </div>
    </div>
  );
}
