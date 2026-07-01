import type { Metadata } from "next";
import {
  upsertAccount, listSitesForLocation, signLocationToken, verifyLocationToken, decodeGhlSso, siteCapFor,
} from "@/lib/server/occasion-widget-accounts";
import OccasionsDashboard from "./OccasionsDashboard";

/**
 * The Occasions account dashboard — surfaced inside GHL as a new menu (Custom Menu Link /
 * Marketplace custom page). Identity is resolved server-side from, in order:
 *   1) a GHL SSO blob (?ssoData=…) — the real GHL menu path (dormant until the app is registered),
 *   2) a signed session token (?t=…) we minted — for testing / direct links,
 *   3) ?loc=<locationId>(&name=…) — Option A custom menu link: GHL server-substitutes
 *      {{location.id}}, so we trust it and bootstrap the account on first open (low-sensitivity
 *      data + unguessable ids; use Option B / SSO for hardened paid rollout).
 * See docs/occasions-service/GHL-MENU-SETUP.md.
 */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Occasions — AIBizConnect", robots: { index: false } };

function NotConnected() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#F8F9FC", padding: "24px", fontFamily: "system-ui,-apple-system,Segoe UI,Roboto,sans-serif" }}>
      <div style={{ maxWidth: 440, textAlign: "center", background: "#fff", border: "1px solid #ECEEF4", borderRadius: 16, padding: "36px 28px", boxShadow: "0 1px 3px rgba(18,22,74,.06)" }}>
        <div style={{ width: 44, height: 44, borderRadius: 11, background: "linear-gradient(135deg,#2F399D,#555FC4)", display: "grid", placeItems: "center", margin: "0 auto 16px", color: "#fff", fontWeight: 700 }}>▶</div>
        <h1 style={{ fontSize: 19, color: "#12123A", margin: "0 0 8px" }}>Open Occasions from your menu</h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "#75788C", margin: 0 }}>This page opens from the <b>Occasions</b> item in your AIBizConnect / GHL menu, which signs you in to your account automatically.</p>
      </div>
    </main>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string; loc?: string; name?: string; ssoData?: string }> }) {
  const sp = await searchParams;

  let locationId: string | null = null;
  let name: string | undefined;
  let companyId: string | undefined;

  if (sp.ssoData) {
    const d = await decodeGhlSso(sp.ssoData);
    if (d?.locationId) { locationId = d.locationId; name = d.name; companyId = d.companyId; }
  }
  if (!locationId && sp.t) {
    const v = verifyLocationToken(sp.t);
    if (v) locationId = v.locationId;
  }
  if (!locationId && sp.loc) {
    locationId = sp.loc;
    if (sp.name) name = sp.name;
  }

  if (!locationId) return <NotConnected />;

  const account = await upsertAccount({ locationId, companyId, name });
  const token = signLocationToken(locationId);
  const sites = await listSitesForLocation(locationId);
  const appBase = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.aibizconnect.app").replace(/\/+$/, "");
  const cap = siteCapFor(locationId, account.plan);
  const unlimited = !Number.isFinite(cap);

  return <OccasionsDashboard token={token} account={account} initialSites={sites} appBase={appBase} siteCap={unlimited ? undefined : cap} unlimited={unlimited} />;
}
