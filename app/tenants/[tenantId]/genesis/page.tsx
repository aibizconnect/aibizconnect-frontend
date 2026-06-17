import Link from "next/link";
import { getGenesisReport, type GenesisReport } from "@/lib/server/tenant-blueprint";

/**
 * Genesis Report v2 (A-1, D-380/381). The tenant-facing "here's everything we set up for you" surface:
 * the canonical blueprint that landed at provisioning — which capability modules are ON, which need a
 * tenant action (IDX board approval, Stripe connect), which are available to switch on, plus the sample
 * listings seeded so the site is live on demo data. Reads LIVE state via getGenesisReport so it stays
 * accurate after the fact. Degrades gracefully if the blueprint never ran (migration 0076 not applied).
 */

async function safe<T>(fn: () => Promise<T>): Promise<T | null> { try { return await fn(); } catch { return null; } }

const STATUS_META: Record<GenesisReport["modules"][number]["status"], { label: string; cls: string; dot: string }> = {
  enabled:      { label: "On",            cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  needs_action: { label: "Action needed", cls: "bg-amber-50 text-amber-700 ring-amber-600/20",       dot: "bg-amber-500" },
  available:    { label: "Available",     cls: "bg-slate-100 text-slate-500 ring-slate-400/20",      dot: "bg-slate-300" },
};

export default async function GenesisPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const base = `/tenants/${tenantId}`;
  const report = await safe<GenesisReport>(() => getGenesisReport(tenantId));

  const on = report?.modules.filter((m) => m.status === "enabled").length ?? 0;
  const action = report?.modules.filter((m) => m.status === "needs_action").length ?? 0;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Setup report</h1>
          <p className="text-sm text-slate-500">
            Everything we configured for your workspace{report?.industryName ? <> — <span className="font-medium text-slate-700">{report.industryName}</span></> : null}.
          </p>
        </div>
        <Link href={`${base}/launchpad`} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1e40af]">Continue setup →</Link>
      </div>

      {!report || !report.provisioned ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">Your setup report will appear here once your workspace finishes provisioning.</p>
          <Link href={`${base}/dashboard`} className="mt-4 inline-block text-sm font-medium text-[#1e3a8a] hover:underline">Go to dashboard →</Link>
        </div>
      ) : (
        <>
          {/* G1-A1: IDX/VOW is on but no live DDF feed → the site is on sample data, not live MLS. */}
          {report.sampleMode && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <span className="mt-0.5 text-lg leading-none">🧪</span>
              <div className="text-sm text-amber-800">
                <span className="font-semibold">Running in sample-data mode.</span> Your listings, search and area pages are live on demo MLS data so you can build and launch now. Live CREA listings activate only after your IDX/VOW board approval and DDF credentials are in place.
              </div>
            </div>
          )}

          {/* summary tiles */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Tile label="Features on" value={String(on)} accent="emerald" />
            <Tile label="Need an action" value={String(action)} accent={action ? "amber" : "slate"} />
            <Tile label="Sample listings" value={String(report.sampleListings)} accent={report.sampleListings ? "indigo" : "slate"}
                  href={report.sampleListings ? `${base}/sites` : undefined} hint={report.sampleListings ? "Live on demo data" : undefined} />
          </div>

          {/* modules */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">Your features</h2>
              <p className="mt-0.5 text-xs text-slate-500">Core tools (contacts, site, forms, booking, AI agent, automations) are always on. These are the extras for your industry.</p>
            </div>
            <ul className="divide-y divide-slate-100">
              {report.modules.map((m) => {
                const meta = STATUS_META[m.status];
                return (
                  <li key={m.key} className="flex items-start gap-3 px-6 py-4">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-900">{m.name}</div>
                      {m.reason ? <div className="mt-0.5 text-xs text-slate-500">{m.reason}</div> : null}
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${meta.cls}`}>{meta.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* system status */}
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
            <span className={`h-1.5 w-1.5 rounded-full ${report.customerContact ? "bg-emerald-400" : "bg-slate-300"}`} />
            {report.customerContact ? "Account registered with AIBizConnect." : "Account registration pending."}
          </div>
        </>
      )}
    </div>
  );
}

function Tile({ label, value, accent, href, hint }: { label: string; value: string; accent: "emerald" | "amber" | "indigo" | "slate"; href?: string; hint?: string }) {
  const ring: Record<string, string> = {
    emerald: "text-emerald-600", amber: "text-amber-600", indigo: "text-[#1e3a8a]", slate: "text-slate-400",
  };
  const body = (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#1e3a8a]/30">
      <div className={`text-3xl font-semibold tracking-tight ${ring[accent]}`}>{value}</div>
      <div className="mt-1 text-sm text-slate-600">{label}</div>
      {hint ? <div className="mt-0.5 text-[11px] text-slate-400">{hint}</div> : null}
    </div>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}
