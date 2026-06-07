import Link from "next/link";
import { getLaunchpadState, type LaunchpadState } from "../launchpad/actions";

/**
 * GHL-style tenant dashboard overview (Ali's direction). KPI cards + a live Launchpad
 * "Resume setup" card + quick links to the built tools. Data points show as zero/“—” until
 * wired to live sources (honest placeholders), matching the GoHighLevel home feel.
 */

const KPIS = [
  { label: "Contacts", value: "0", sub: "total leads & customers" },
  { label: "Opportunities", value: "0", sub: "in your pipeline" },
  { label: "Pipeline value", value: "$0", sub: "open opportunities" },
  { label: "Appointments", value: "0", sub: "upcoming" },
];

/** Live onboarding state for the dashboard card — null if not yet available (e.g. migration pending). */
async function loadLaunchpad(tenantId: string): Promise<LaunchpadState | null> {
  try { return await getLaunchpadState(tenantId); } catch { return null; }
}

export default async function DashboardPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const base = `/tenants/${tenantId}`;
  const launchpad = await loadLaunchpad(tenantId);

  const tools = [
    { label: "AI Agents", desc: "Your AI team across web, email & social", href: `${base}/agents` },
    { label: "Sites", desc: "Build & publish websites from templates", href: `${base}/website` },
    { label: "Contacts", desc: "Manage leads and customers", href: `${base}/contacts` },
    { label: "Opportunities", desc: "Track deals through your pipeline", href: `${base}/pipelines` },
    { label: "Automation", desc: "Workflows that run themselves", href: `${base}/automations` },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Welcome back — here&apos;s your business at a glance.</p>
        </div>
        <Link href={`${base}/agents`} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1e40af]">Build my site</Link>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">{k.label}</div>
            <div className="mt-1 text-3xl font-semibold text-slate-900">{k.value}</div>
            <div className="mt-1 text-xs text-slate-400">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Launchpad — live setup progress */}
        <LaunchpadCard base={base} state={launchpad} />

        {/* Tools */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-900">Your tools</h2>
          <p className="mb-4 text-sm text-slate-500">Jump into any part of your business.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {tools.map((t) => (
              <Link key={t.label} href={t.href} className="rounded-lg border border-slate-200 p-4 transition hover:border-[#1e3a8a]/40 hover:bg-slate-50">
                <div className="font-medium text-slate-900">{t.label}</div>
                <div className="mt-0.5 text-xs text-slate-500">{t.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Dashboard "Resume setup" card — mirrors the Launchpad progress and surfaces the next steps. */
function LaunchpadCard({ base, state }: { base: string; state: LaunchpadState | null }) {
  // Fallback when onboarding isn't available yet (e.g. migration 0034 not applied).
  if (!state) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
        <h2 className="text-base font-semibold text-slate-900">Get started</h2>
        <p className="mb-4 text-sm text-slate-500">Finish setup to launch your business.</p>
        <Link href={`${base}/launchpad`} className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e40af]">Open Launchpad →</Link>
      </div>
    );
  }

  const next = state.steps.filter((s) => !s.optional && s.status !== "complete" && s.status !== "skipped").slice(0, 3);
  const allDone = state.progress >= 100;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">{allDone ? "You're all set 🎉" : "Resume setup"}</h2>
        <span className="text-sm font-semibold text-[#1e3a8a]">{state.progress}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-[#1e3a8a] to-[#22d3ee] transition-all" style={{ width: `${state.progress}%` }} />
      </div>

      {allDone ? (
        <p className="mt-4 text-sm text-slate-500">Every required step is done. Review anything anytime from the Launchpad.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {next.map((s) => (
            <li key={s.step_key}>
              <Link href={s.route} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm transition hover:border-[#1e3a8a]/40 hover:bg-slate-50">
                <span className="grid h-5 w-5 place-items-center rounded-full border border-slate-300 text-transparent">✓</span>
                <span className="flex-1 text-slate-700">{s.title}</span>
                <span className="text-slate-400">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link href={`${base}/launchpad`} className="mt-4 inline-block text-sm font-medium text-[#1e3a8a] hover:underline">Open Launchpad →</Link>
    </div>
  );
}
