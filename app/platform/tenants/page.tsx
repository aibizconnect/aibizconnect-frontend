import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isPlatformAdmin } from "@/lib/auth/platform-admin";
import { listAllTenants } from "@/lib/server/admin-directory";
import PlatformTenants from "@/components/platform/PlatformTenants";

/** Platform Tenant admin (D-375) — list every tenant, delete (cascade) any but the platform tenant. */
export default async function PlatformTenantsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/platform/tenants");
  if (!(await isPlatformAdmin())) redirect("/platform");
  const tenants = await listAllTenants().catch(() => []);
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/platform" className="text-sm text-slate-500 hover:text-slate-900">← Platform</Link>
            <span className="text-base font-semibold text-slate-900">Tenants</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{tenants.length}</span>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-6 py-6">
        <PlatformTenants initial={tenants} />
      </div>
    </main>
  );
}
