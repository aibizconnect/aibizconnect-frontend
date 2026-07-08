import type { Metadata } from "next";
import Link from "next/link";
import { listMarketplaceItems, type MarketplaceItem } from "@/lib/marketplace/catalog";
import { listPurchases } from "@/lib/marketplace/entitlements";
import { platformStripeReady } from "@/lib/server/platform-stripe";
import AddAddonButton from "@/components/marketplace/AddAddonButton";

export const metadata: Metadata = { title: "App Marketplace — AIBizConnect" };

/**
 * App Marketplace (tenant dashboard). One place to buy add-ons; each unlocks a capability
 * and is managed under "My Add-ons". Catalog is typed code (lib/marketplace/catalog.ts);
 * per-tenant state is marketplace_purchases. "Soon" items show the roadmap before they ship.
 */

const STATUS_BADGE: Record<string, string> = {
  available: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  beta: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  soon: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
};
const STATUS_LABEL: Record<string, string> = { available: "Available", beta: "Beta", soon: "Coming soon" };

export default async function MarketplacePage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const items = listMarketplaceItems();
  const purchases = await listPurchases(tenantId);
  const activeKeys = new Set(purchases.filter((p) => p.status === "active").map((p) => p.itemKey));
  const checkoutReady = platformStripeReady();

  const price = (i: MarketplaceItem) => (i.priceCents > 0 ? `$${(i.priceCents / 100).toFixed(0)}/mo` : "");

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">App Marketplace</h1>
          <p className="text-sm text-slate-500">One login, one bill. Add the powers you need — manage them anytime.</p>
        </div>
        <Link href={`/tenants/${tenantId}/marketplace/manage`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          My Add-ons
        </Link>
      </div>

      {!checkoutReady && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Checkout isn&apos;t enabled yet. Browsing is on; purchasing turns on once the platform payment key is connected.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const isActive = activeKeys.has(item.key);
          const isSoon = item.status === "soon";
          return (
            <div key={item.key} className={`flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${isSoon ? "opacity-80" : ""}`}>
              <div className="flex items-start justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-50 text-2xl">{item.icon}</div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_BADGE[item.status]}`}>
                  {STATUS_LABEL[item.status]}
                </span>
              </div>
              <div className="mt-3 font-semibold text-slate-900">{item.name}</div>
              <p className="mt-1 flex-1 text-sm text-slate-500">{item.blurb}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">{price(item) || <span className="text-slate-400">—</span>}</span>
                {isSoon ? (
                  <span className="text-sm font-medium text-slate-400">Coming soon</span>
                ) : isActive ? (
                  <Link href={`/tenants/${tenantId}/marketplace/manage`} className="text-sm font-semibold text-emerald-600">Active ✓ · Manage</Link>
                ) : checkoutReady ? (
                  <AddAddonButton tenantId={tenantId} itemKey={item.key} />
                ) : (
                  <span className="text-sm font-medium text-slate-400">Unavailable</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
