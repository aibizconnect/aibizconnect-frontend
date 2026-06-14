import { NextRequest, NextResponse } from "next/server";
import { readPortalToken, issuePortalToken } from "@/lib/server/portal";

/**
 * Magic-link landing (D-348). Verifies the token from the sign-in email, drops an httpOnly
 * session cookie scoped to this tenant's portal, and bounces to the dashboard.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const token = req.nextUrl.searchParams.get("token") || "";
  const dash = new URL(`/portal/${tenantId}`, req.url);
  const v = readPortalToken(token, tenantId);
  if (!v) { dash.searchParams.set("e", "invalid"); return NextResponse.redirect(dash); }
  const fresh = issuePortalToken(tenantId, v.contactId, v.email) ?? token;
  const res = NextResponse.redirect(dash);
  res.cookies.set("abizportal", fresh, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 30 * 24 * 60 * 60 });
  return res;
}
