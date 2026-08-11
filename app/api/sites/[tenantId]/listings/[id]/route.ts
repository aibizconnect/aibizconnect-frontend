import { NextResponse } from "next/server";
import { getListing } from "@/lib/server/idx/store";
import { getFeed } from "@/lib/server/idx/feeds";

/**
 * Public JSON detail for one listing — the read-only twin of /sites/<t>/listings/<id>. Powers the
 * embeddable weblet's in-place detail view (D-361) so a visitor never leaves the host page. Only
 * display-safe columns are projected; raw feed payloads stay server-side. Gated on an active feed.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ tenantId: string; id: string }> }) {
  const { tenantId, id } = await params;
  const feed = await getFeed(tenantId).catch(() => null);
  if (feed?.status !== "active") return NextResponse.json({ listing: null }, { status: 404 });
  const r = await getListing(tenantId, id).catch(() => null);
  if (!r) return NextResponse.json({ listing: null }, { status: 404 });
  const l = r.listing;
  return NextResponse.json({
    listing: {
      id: l.id,
      mlsNumber: l.mls_number ?? null,
      status: l.status ?? null,
      propertyType: l.property_type ?? null,
      propertyClass: l.property_class ?? null,
      transactionType: l.transaction_type ?? null,
      listPrice: l.list_price != null ? Number(l.list_price) : null,
      currency: l.currency ?? "CAD",
      addressStreet: l.address_street ?? null,
      addressUnit: l.address_unit ?? null,
      city: l.address_city ?? null,
      province: l.address_province ?? null,
      postalCode: l.address_postal_code ?? null,
      community: l.community ?? null,
      beds: l.bedrooms ?? null,
      baths: l.bathrooms != null ? Number(l.bathrooms) : null,
      sqft: l.sqft_total != null ? Number(l.sqft_total) : null,
      lotSizeSqft: l.lot_size_sqft != null ? Number(l.lot_size_sqft) : null,
      yearBuilt: l.year_built ?? null,
      associationFee: l.association_fee != null ? Number(l.association_fee) : null,
      parkingTotal: l.parking_total ?? null,
      publicRemarks: l.public_remarks ?? null,
      brokerage: l.listing_brokerage_name ?? null,
      agent: l.listing_agent_name ?? null,
      modifiedAt: l.modification_timestamp,
    },
    media: r.media.map((m) => m.url),
  }, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
