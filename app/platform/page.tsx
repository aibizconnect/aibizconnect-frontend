import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getPlatformRole, isPlatformSuperAdmin, isOwner } from "@/lib/auth/platform-admin";
import { listTeam } from "@/lib/auth/team";
import { getPlatformAudit, getAllAiUsage } from "@/app/tenants/[tenantId]/website/actions";
import { resolveDefaultTenantId } from "@/lib/tenant-resolve";
import TeamConsole from "@/components/team/TeamConsole";
import PlatformApps from "@/components/platform/PlatformApps";
import KycReview from "@/components/platform/KycReview";
import BulkStrategy from "@/components/platform/BulkStrategy";
import { listPlatformApps } from "./platform-apps-actions";

/**
 * Platform panel — the tenant-LESS admin console for the AI Biz Connect team. Reached from a
 * sidebar link (admins/sysadmins), NOT the post-login landing. Bare-minimum platform controls:
 * team, AI usage, audit log. Has a clear link back to the workspace dashboard.
 */
export default async function PlatformPanel() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/platform");

  const role = await getPlatformRole();
  if (!role) {
    return (
      <main className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="text-xl font-semibold text-slate-900">No platform access</h1>
        <p className="mt-2 text-sm text-slate-500">You&apos;re signed in as <b>{user.email}</b>, but this account isn&apos;t a platform team member.</p>
        <Link href="/home" className="mt-6 inline-block rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Go to dashboard</Link>
      </main>
    );
  }

  const superadmin = await isPlatformSuperAdmin();
  const owner = await isOwner();
  const [team, audit, usage, tenantId, platformApps] = await Promise.all([
    superadmin ? listTeam() : Promise.resolve([]),
    getPlatformAudit(25),
    getAllAiUsage(),
    resolveDefaultTenantId(),
    superadmin ? listPlatformApps() : Promise.resolve([]),
  ]);
  const appBase = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.aibizconnect.app").replace(/\/+$/, "");

  const roleBadge = role === "superadmin" ? "bg-violet-100 text-violet-700"
    : role === "admin" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700";

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href={tenantId ? `/tenants/${tenantId}/dashboard` : "/home"} className="text-sm text-slate-500 hover:text-slate-900">← Dashboard</Link>
            <span className="text-base font-semibold text-slate-900">Platform</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${roleBadge}`}>{role}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">{user.name} · {user.email}</span>
            <form action="/auth/signout" method="post"><button className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">Sign out</button></form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        <section>
          <h2 className="mb-1 text-lg font-semibold text-slate-900">Tools</h2>
          <p className="mb-3 text-sm text-slate-500">Internal utilities — available to every platform team member.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/platform/seo-tools" className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#1e3a8a]/40 hover:shadow">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#1e3a8a]/10 text-lg text-[#1e3a8a]">⚡</div>
              <h3 className="mt-3 font-semibold text-slate-800 group-hover:text-[#1e3a8a]">SEO + GEO Analyzer</h3>
              <p className="mt-1 text-xs text-slate-500">Audit <b>any</b> domain — SEO + AI/answer-engine (GEO) readiness, with a prioritized fix list.</p>
            </Link>
          </div>
        </section>

        {(role === "admin" || role === "superadmin") && (
          <section>
            <h2 className="mb-1 text-lg font-semibold text-slate-900">Administration</h2>
            <p className="mb-3 text-sm text-slate-500">Manage all tenants and user accounts on the platform.</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link href="/platform/tenants" className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#1e3a8a]/40 hover:shadow">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#1e3a8a]/10 text-lg text-[#1e3a8a]">🏢</div>
                <h3 className="mt-3 font-semibold text-slate-800 group-hover:text-[#1e3a8a]">Tenants</h3>
                <p className="mt-1 text-xs text-slate-500">Every workspace — view and delete (the platform tenant is protected).</p>
              </Link>
              <Link href="/platform/users" className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#1e3a8a]/40 hover:shadow">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#1e3a8a]/10 text-lg text-[#1e3a8a]">👤</div>
                <h3 className="mt-3 font-semibold text-slate-800 group-hover:text-[#1e3a8a]">Users</h3>
                <p className="mt-1 text-xs text-slate-500">Every sign-in account — ban, reactivate, or delete.</p>
              </Link>
            </div>
          </section>
        )}

        {superadmin && (
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Team</h2>
            <TeamConsole initial={team} isOwner={owner} />
          </section>
        )}

        {superadmin && (
          <section>
            <h2 className="mb-1 text-lg font-semibold text-slate-900">Connected apps (platform OAuth)</h2>
            <p className="mb-3 text-sm text-slate-500">Enter each provider&apos;s app credentials once — this enables the Connect buttons in every tenant&apos;s Settings. Stored encrypted; equivalent to the env vars, no restart needed. Requires SETTINGS_ENCRYPTION_KEY.</p>
            <PlatformApps apps={platformApps} baseUrl={appBase} />
          </section>
        )}

        <section>
          <h2 className="mb-1 text-lg font-semibold text-slate-900">Identity verification (KYC)</h2>
          <p className="mb-3 text-sm text-slate-500">Review provider-hosted identity checks and approve / reject / override. No documents or PII are stored — only status and a non-PII summary.</p>
          <KycReview />
        </section>

        <section>
          <h2 className="mb-1 text-lg font-semibold text-slate-900">Content strategies</h2>
          <p className="mb-3 text-sm text-slate-500">Generate a deterministic SEO/content strategy for every workspace from its business profile. Safe to re-run.</p>
          <BulkStrategy />
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">AI usage by workspace</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr><th className="px-4 py-2">Workspace</th><th className="px-4 py-2 text-right">This month</th><th className="px-4 py-2 text-right">All-time</th><th className="px-4 py-2 text-right">Month $</th></tr>
              </thead>
              <tbody>
                {usage.length === 0
                  ? <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No AI usage recorded yet.</td></tr>
                  : usage.map((u) => (
                    <tr key={u.tenantId} className="border-t border-slate-100">
                      <td className="px-4 py-2 text-slate-700">{u.name}</td>
                      <td className="px-4 py-2 text-right">{u.monthUnits}</td>
                      <td className="px-4 py-2 text-right text-slate-400">{u.totalUnits}</td>
                      <td className="px-4 py-2 text-right font-medium text-slate-700">${(u.monthCostCents / 100).toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Recent platform activity</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr><th className="px-4 py-2">When</th><th className="px-4 py-2">Action</th><th className="px-4 py-2">Actor</th><th className="px-4 py-2">Target</th></tr>
              </thead>
              <tbody>
                {audit.length === 0
                  ? <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No activity yet.</td></tr>
                  : audit.map((a) => (
                    <tr key={a.id} className="border-t border-slate-100">
                      <td className="px-4 py-2 text-slate-400">{new Date(a.created_at).toLocaleString()}</td>
                      <td className="px-4 py-2 text-slate-700">{a.action}</td>
                      <td className="px-4 py-2 text-slate-600">{a.actor_email ?? "—"}</td>
                      <td className="px-4 py-2 text-slate-600">{a.target_email ?? "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
