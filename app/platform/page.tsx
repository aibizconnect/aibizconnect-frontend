import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getPlatformRole, isPlatformSuperAdmin, isOwner } from "@/lib/auth/platform-admin";
import { listTeam } from "@/lib/auth/team";
import { getPlatformAudit, getAllAiUsage } from "@/app/tenants/[tenantId]/website/actions";
import { resolveDefaultTenantId } from "@/lib/tenant-resolve";
import TeamConsole from "@/components/team/TeamConsole";

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
  const [team, audit, usage, tenantId] = await Promise.all([
    superadmin ? listTeam() : Promise.resolve([]),
    getPlatformAudit(25),
    getAllAiUsage(),
    resolveDefaultTenantId(),
  ]);

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
        {superadmin && (
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Team</h2>
            <TeamConsole initial={team} isOwner={owner} />
          </section>
        )}

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
