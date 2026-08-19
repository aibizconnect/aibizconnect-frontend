import type { Metadata } from "next";
import Link from "next/link";
import { listPurchases } from "@/lib/marketplace/entitlements";
import { getMarketplaceItem } from "@/lib/marketplace/catalog";
import ManageAddonControls from "@/components/marketplace/ManageAddonControls";

export const metadata: Metadata = { title: "My Add-ons — AIBizConnect" };

/**
 * My Add-ons — the management surface for purchased add-ons: status, next renewal,
 * configure, add more, cancel. Data is marketplace_purchases (degrades to empty until 0085).
 */

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  past_due: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  canceled: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
  incomplete: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default async function ManageAddonsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ added?: string; error?: string }>;
}) {
  const { tenantId } = await params;
  const sp = await searchParams;
  const purchases = await listPurchases(tenantId);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">My Add-ons</h1>
          <p className="text-sm text-slate-500">Manage what you&apos;ve added — configure, add more, or cancel.</p>
        </div>
        <Link href={`/tenants/${tenantId}/marketplace`} className="rounded-lg bg-[#3D49C4] px-3 py-2 text-sm font-semibold text-white hover:brightness-110">
          + Add more
        </Link>
      </div>

      {sp.added && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          🎉 Add-on activated. It&apos;s ready to use.
        </div>
      )}
      {sp.error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          We couldn&apos;t confirm that purchase. If you were charged, it will appear shortly — or contact support.
        </div>
      )}

      {purchases.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="text-3xl">🧩</div>
          <p className="mt-2 font-medium text-slate-700">No add-ons yet</p>
          <p className="mt-1 text-sm text-slate-500">Browse the marketplace to add SEO, content, social, and more.</p>
          <Link href={`/tenants/${tenantId}/marketplace`} className="mt-4 inline-block rounded-lg bg-[#3D49C4] px-4 py-2 text-sm font-semibold text-white hover:brightness-110">
            Open the marketplace →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {purchases.map((p) => {
            const item = getMarketplaceItem(p.itemKey);
            const label = typeof p.config?.label === "string" ? (p.config.label as string) : "";
            return (
              <div key={p.itemKey} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-50 text-2xl">{item?.icon ?? "🧩"}</div>
                    <div>
                      <div className="font-semibold text-slate-900">{item?.name ?? p.itemKey}{label && <span className="ml-2 text-sm font-normal text-slate-400">· {label}</span>}</div>
                      <div className="text-sm text-slate-500">
                        {p.amountCents > 0 ? `$${(p.amountCents / 100).toFixed(0)} ${p.currency}/${p.billingInterval ?? "mo"}` : "—"}
                        {p.status === "active" && p.currentPeriodEnd ? ` · renews ${fmtDate(p.currentPeriodEnd)}` : ""}
                        {p.status === "canceled" ? " · canceled" : ""}
                      </div>
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLE[p.status] ?? STATUS_STYLE.incomplete}`}>
                    {p.status.replace("_", " ")}
                  </span>
                </div>

                {item?.unlocks?.navRoute && p.status === "active" && (
                  <Link href={`/tenants/${tenantId}/${item.unlocks.navRoute}`} className="mt-3 inline-block text-sm font-semibold text-[#3D49C4] hover:underline">
                    Open {item.name} →
                  </Link>
                )}

                {p.status === "active" && (
                  <ManageAddonControls tenantId={tenantId} itemKey={p.itemKey} initialLabel={label} />
                )}
                {p.status !== "active" && (
                  <Link href={`/tenants/${tenantId}/marketplace`} className="mt-3 inline-block text-sm font-medium text-slate-500 hover:text-slate-700">
                    Re-add →
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
