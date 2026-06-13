import Link from "next/link";
import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { usageSummary, type UsageSummary } from "@/lib/server/ai-metering";

/** Usage & Costs (D-335) — this month's metered usage by channel: what it costs us (provider)
 *  and what's billable to the tenant (cost × markup). Meter + display now; billing is a separate
 *  gated step (no auto-charge). */
const money = (n: number) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function UsagePage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  await requireTenantAccess(tenantId);
  let s: UsageSummary | null = null;
  try { s = await usageSummary(tenantId); } catch { /* table not applied yet */ }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-1 flex items-center gap-2 text-sm">
        <Link href={`/tenants/${tenantId}/dashboard`} className="text-slate-400 hover:text-slate-700">Dashboard</Link>
        <span className="text-slate-300">/</span><span className="text-slate-600">Usage &amp; Costs</span>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Usage &amp; Costs</h1>
      <p className="mb-5 text-sm text-slate-500">{s?.monthLabel ?? "This month"} · metered usage across SMS, WhatsApp, email and AI. Billable = our cost + {s?.markupPercent ?? 30}% margin. Nothing is charged automatically.</p>

      {!s || s.rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-400">No metered usage yet this month. Sends and AI runs will appear here with their cost.</div>
      ) : (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-xs text-slate-500">Provider cost</div><div className="mt-1 text-2xl font-semibold text-slate-900">{money(s.totals.providerCost)}</div><div className="text-[11px] text-slate-400">what these channels cost us</div></div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-xs text-slate-500">Billable to tenant</div><div className="mt-1 text-2xl font-semibold text-emerald-600">{money(s.totals.billable)}</div><div className="text-[11px] text-slate-400">cost + {s.markupPercent}% margin</div></div>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2.5">Channel</th><th className="px-4 py-2.5 text-right">Units</th><th className="px-4 py-2.5 text-right">Cost</th><th className="px-4 py-2.5 text-right">Billable</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {s.rows.map((r) => (
                  <tr key={r.category} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{r.category}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{r.units.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{money(r.providerCost)}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-900">{money(r.billable)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-400">Costs are estimates where a provider didn&apos;t return an exact amount. Auto-invoicing of usage into Payments is the next step.</p>
        </>
      )}
    </div>
  );
}
