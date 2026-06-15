import { NextRequest, NextResponse } from "next/server";
import { listListings, getSyncState, type ListingFilter } from "@/lib/server/idx/store";
import { getFeed } from "@/lib/server/idx/feeds";

/**
 * Public JSON feed for the live Listings weblet (D-361). Same read-only data as the public
 * /sites/<t>/listings page, but JSON so the website element can fetch + paginate client-side
 * (works in the editor, preview, and on any published/custom domain). Gated on an active feed.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const feed = await getFeed(tenantId).catch(() => null);
  if (feed?.status !== "active") return NextResponse.json({ rows: [], total: 0, updatedAt: null });

  const sp = new URL(req.url).searchParams;
  const num = (k: string) => { const v = sp.get(k); return v != null && v !== "" ? Number(v) : undefined; };
  const filter: ListingFilter = {
    city: sp.get("city") || undefined,
    municipality: sp.get("municipality") || undefined,
    community: sp.get("community") || undefined,
    propertyClass: sp.get("class") || undefined,
    transactionType: sp.get("t") || undefined,
    propertyUse: sp.get("use") || undefined,
    minPrice: num("min"), maxPrice: num("max"),
    beds: num("beds"), baths: num("baths"), minSqft: num("sqft"),
    sort: sp.get("sort") || undefined,
    page: num("page") ?? 0,
    pageSize: Math.min(Math.max(num("limit") ?? 6, 1), 24),
  };
  const [{ rows, total }, sync] = await Promise.all([
    listListings(tenantId, filter),
    getSyncState(tenantId, "ddf").catch(() => ({ lastModificationTs: null })),
  ]);
  return NextResponse.json({ rows, total, updatedAt: sync.lastModificationTs }, {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
  });
}
