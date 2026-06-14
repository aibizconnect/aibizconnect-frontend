"use client";

import { useState } from "react";
import Link from "next/link";
import { setStoreConfigAction } from "@/app/tenants/[tenantId]/sites/store/actions";
import type { StoreConfig, StoreOrder } from "@/lib/server/store";
import type { Product } from "@/lib/server/billing";

const money = (cents: number, ccy: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: ccy || "USD" }).format(cents / 100);

/** Store admin (D-350): on/off + title, product roster (managed in Payments), orders, public link. */
export default function StoreAdmin({ tenantId, origin, initial }: { tenantId: string; origin: string; initial: { config: StoreConfig; products: Product[]; orders: StoreOrder[]; stripeReady: boolean } }) {
  const [config, setConfig] = useState(initial.config);
  const [title, setTitle] = useState(initial.config.title);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const storeUrl = `${origin}/sites/${tenantId}/store`;

  async function save(patch: { enabled?: boolean; title?: string }) {
    setBusy(true); setSaved(false);
    const c = await setStoreConfigAction(tenantId, patch);
    setConfig(c); setTitle(c.title); setBusy(false); setSaved(true);
  }

  return (
    <div className="space-y-5">
      {!initial.stripeReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <b>Online payments aren&apos;t connected.</b> Connect Stripe in <Link href={`/tenants/${tenantId}/settings?tab=integrations`} className="underline">Settings → Integrations</Link> so customers can check out.
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-800">Store {config.enabled ? "is live" : "is off"}</div>
            <p className="text-xs text-slate-400">{config.enabled ? "Customers can browse and buy." : "Turn on to publish your storefront."}</p>
          </div>
          <button onClick={() => save({ enabled: !config.enabled })} disabled={busy} className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${config.enabled ? "bg-slate-500" : "bg-emerald-600"}`}>{config.enabled ? "Turn off" : "Turn on"}</button>
        </div>
        <div className="mt-3 flex items-end gap-2">
          <label className="flex flex-1 flex-col gap-1 text-xs text-slate-500">Store title<input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
          <button onClick={() => save({ title })} disabled={busy} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">Save</button>
          {saved && <span className="pb-2 text-xs text-emerald-600">Saved ✓</span>}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{storeUrl}</code>
          <a href={storeUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white">Preview ↗</a>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-800">Products ({initial.products.length})</div>
          <Link href={`/tenants/${tenantId}/payments`} className="text-xs font-medium text-[#1e3a8a] hover:underline">Manage in Payments →</Link>
        </div>
        {initial.products.length === 0 ? <p className="text-sm text-slate-400">No active products. Add products in Payments — active ones appear in your store automatically.</p> : (
          <div className="space-y-1">
            {initial.products.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                <span className="truncate text-slate-700">{p.name}</span>
                <span className="font-medium text-slate-500">{new Intl.NumberFormat("en-US", { style: "currency", currency: p.currency || "USD" }).format(p.price)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 text-sm font-semibold text-slate-800">Orders ({initial.orders.length})</div>
        {initial.orders.length === 0 ? <p className="text-sm text-slate-400">No orders yet.</p> : (
          <div className="overflow-hidden rounded-lg border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">Product</th><th className="px-3 py-2">Customer</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2">When</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {initial.orders.map((o) => (
                  <tr key={o.id}><td className="px-3 py-2 text-slate-700">{o.productName}</td><td className="px-3 py-2 text-slate-500">{o.email ?? "—"}</td><td className="px-3 py-2 text-right font-medium text-slate-700">{money(o.amountCents, o.currency)}</td><td className="px-3 py-2 text-slate-400">{new Date(o.createdAt).toLocaleDateString()}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
