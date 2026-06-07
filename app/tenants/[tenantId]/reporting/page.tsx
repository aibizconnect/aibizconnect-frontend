import Link from "next/link";
import { buildReport } from "@/lib/reporting";

/** Reporting capstone — read-only aggregation across the platform. No DDL, no writes. */
export default async function ReportingPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const r = await buildReport(tenantId);
  const base = `/tenants/${tenantId}`;
  const fmt = (n: number) => n ? `$${n.toLocaleString()}` : "$0";
  const ago = (iso: string) => { const d = (Date.now() - new Date(iso).getTime()) / 1000; return d < 3600 ? `${Math.max(1, Math.round(d / 60))}m ago` : d < 86400 ? `${Math.round(d / 3600)}h ago` : `${Math.round(d / 86400)}d ago`; };

  const kpis = [
    { label: "Contacts", value: r.contacts, sub: "total leads", href: `${base}/contacts` },
    { label: "Pipeline value", value: fmt(r.opportunities.value), sub: `${r.opportunities.count} open deals`, href: `${base}/pipelines` },
    { label: "Upcoming bookings", value: r.appointmentsUpcoming, sub: "scheduled", href: `${base}/calendars` },
    { label: "Avg rating", value: r.reviews.avg || "—", sub: `${r.reviews.count} reviews`, href: `${base}/reputation` },
    { label: "Live pages", value: r.sitesPublished, sub: "published", href: `${base}/sites` },
    { label: "Funnels", value: r.funnels, sub: "built", href: `${base}/sites/funnels` },
    { label: "Workflows", value: `${r.workflows.published}/${r.workflows.total}`, sub: "active / total", href: `${base}/automations` },
  ];
  const maxStage = Math.max(1, ...r.opportunities.byStage.map((s) => s.value));

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Reporting</h1>
        <p className="text-sm text-slate-500">Your whole business at a glance — leads, pipeline, bookings, reviews, and what&apos;s live.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#1e3a8a]/40">
            <div className="text-sm text-slate-500">{k.label}</div>
            <div className="mt-1 text-3xl font-semibold text-slate-900">{k.value}</div>
            <div className="mt-1 text-xs text-slate-400">{k.sub}</div>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Pipeline by stage</h2>
          {r.opportunities.byStage.length === 0 ? <p className="text-sm text-slate-400">No open deals yet.</p> : (
            <div className="space-y-3">
              {r.opportunities.byStage.map((s) => (
                <div key={s.stage}>
                  <div className="mb-1 flex justify-between text-xs"><span className="text-slate-600">{s.stage}</span><span className="text-slate-400">{s.count} · {fmt(s.value)}</span></div>
                  <div className="h-2 overflow-hidden rounded bg-slate-100"><div className="h-full bg-[#1e3a8a]" style={{ width: `${(s.value / maxStage) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Recent activity</h2>
          {r.recent.length === 0 ? <p className="text-sm text-slate-400">No activity yet. As leads, bookings, and reviews arrive, they&apos;ll show here.</p> : (
            <ul className="space-y-2">
              {r.recent.map((a, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-700">
                    <span className={`h-2 w-2 rounded-full ${a.kind === "contact" ? "bg-sky-500" : a.kind === "booking" ? "bg-violet-500" : "bg-amber-500"}`} />
                    {a.label}
                  </span>
                  <span className="text-xs text-slate-400">{ago(a.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
