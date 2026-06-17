import Link from "next/link";
import { getLaunchpadState, type LaunchpadState } from "../launchpad/actions";
import { buildReport, buildDashboard, type DashboardData, type Report } from "@/lib/reporting";
import DashboardCharts from "@/components/dashboard/DashboardCharts";

/**
 * Tenant dashboard (D-326): live stats + graphs (chart.js) powered by buildDashboard — pipeline
 * by stage, revenue collected, new contacts, opp status, lead sources — plus a Launchpad
 * "Resume setup" card, recent activity, and quick links. All read-only aggregates; degrades
 * gracefully when a table isn't applied.
 */

async function safe<T>(fn: () => Promise<T>): Promise<T | null> { try { return await fn(); } catch { return null; } }

export default async function DashboardPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const base = `/tenants/${tenantId}`;
  const [launchpad, dashboard, report] = await Promise.all([
    safe<LaunchpadState>(() => getLaunchpadState(tenantId)),
    safe<DashboardData>(() => buildDashboard(tenantId)),
    safe<Report>(() => buildReport(tenantId)),
  ]);

  const tools = [
    { label: "Conversations", desc: "Your unified inbox", href: `${base}/conversations` },
    { label: "AI Agents", desc: "Your AI team across web, email & social", href: `${base}/agents` },
    { label: "Contacts", desc: "Manage leads and customers", href: `${base}/contacts` },
    { label: "Opportunities", desc: "Track deals through your pipeline", href: `${base}/pipelines` },
    { label: "Payments", desc: "Invoices, estimates & products", href: `${base}/payments` },
    { label: "Marketing", desc: "Email & SMS campaigns", href: `${base}/marketing` },
    { label: "Setup report", desc: "What we configured for you", href: `${base}/genesis` },
    { label: "Usage & Costs", desc: "Metered usage by channel", href: `${base}/usage` },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Welcome back — here&apos;s your business at a glance.</p>
        </div>
        <Link href={`${base}/pipelines`} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1e40af]">View pipeline →</Link>
      </div>

      {dashboard ? <DashboardCharts data={dashboard} /> : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-400">Stats will appear here as your contacts, deals and payments come in.</div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <LaunchpadCard base={base} state={launchpad} />
        <RecentActivity items={report?.recent ?? []} />
        <ToolsCard tools={tools} />
      </div>
    </div>
  );
}

const ACTIVITY_ICON: Record<string, string> = { contact: "👤", booking: "📅", review: "⭐" };
function RecentActivity({ items }: { items: { kind: string; label: string; at: string }[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Recent activity</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">No activity yet.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {items.slice(0, 7).map((a, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="text-base leading-none">{ACTIVITY_ICON[a.kind] ?? "•"}</span>
              <span className="min-w-0 flex-1 truncate text-slate-700">{a.label}</span>
              <span className="shrink-0 text-[11px] text-slate-400">{a.at ? new Date(a.at).toLocaleDateString([], { month: "short", day: "numeric" }) : ""}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ToolsCard({ tools }: { tools: { label: string; desc: string; href: string }[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Your tools</h2>
      <div className="mt-3 grid gap-2">
        {tools.map((t) => (
          <Link key={t.label} href={t.href} className="rounded-lg border border-slate-200 p-3 transition hover:border-[#1e3a8a]/40 hover:bg-slate-50">
            <div className="text-sm font-medium text-slate-900">{t.label}</div>
            <div className="mt-0.5 text-xs text-slate-500">{t.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Dashboard "Resume setup" card — mirrors the Launchpad progress and surfaces the next steps. */
function LaunchpadCard({ base, state }: { base: string; state: LaunchpadState | null }) {
  if (!state) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Get started</h2>
        <p className="mb-4 text-sm text-slate-500">Finish setup to launch your business.</p>
        <Link href={`${base}/launchpad`} className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e40af]">Open Launchpad →</Link>
      </div>
    );
  }
  const next = state.steps.filter((s) => !s.optional && s.status !== "complete" && s.status !== "skipped").slice(0, 3);
  const allDone = state.progress >= 100;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
