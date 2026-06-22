import { NextResponse } from "next/server";
import { getActiveForKey } from "@/lib/server/occasion-widget";

/**
 * Gated active-occasions feed for the embed (D-400). The widget fetches this cross-origin with its
 * key + the page host. Returns the active occasions ONLY if the key is registered + active AND the
 * host matches the registered domain; otherwise an empty payload → nothing renders. CORS open (it's
 * read-only, gated, public).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "*", "Cache-Control": "no-store" };

export function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("k") || "";
  const host = url.searchParams.get("host") || "";
  const localDate = url.searchParams.get("d") || ""; // visitor's local calendar date (YYYY-MM-DD)
  let active: any = null;
  try { active = await getActiveForKey(key, host, localDate); } catch { active = null; }
  // Empty (not just null) so the client always gets a valid shape.
  const payload = active ?? { banners: [] };
  return NextResponse.json(payload, { headers: CORS });
}
