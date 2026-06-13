import { NextRequest, NextResponse } from "next/server";
import { resolveAndRecordClick } from "@/lib/server/trigger-links";

/**
 * Public trigger-link redirect (D-319): GET /l/<slug>[?c=<contactId>]. Records the click,
 * applies the link's tags to the contact when ?c is present, then 302-redirects. Unknown slug →
 * bounce to the app home. PUBLIC route (no session). /api is excluded from middleware; /l is not
 * tenant-routed because it resolves by global slug.
 */
export const runtime = "nodejs";

const HOME = (process.env.APP_BASE_URL || "https://app.aibizconnect.app").replace(/\/+$/, "");

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const contactId = req.nextUrl.searchParams.get("c");
  let dest: string | null = null;
  try { dest = await resolveAndRecordClick(slug, contactId); } catch { /* fall through to home */ }
  const url = dest && /^https?:\/\//i.test(dest) ? dest : HOME;
  return NextResponse.redirect(url, 302);
}
