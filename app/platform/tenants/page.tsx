import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isPlatformAdmin } from "@/lib/auth/platform-admin";
import { listSubscribers } from "@/lib/server/admin-directory";
import PlatformTenants from "@/components/platform/PlatformTenants";

/**
 * Platform Subscribers console (D-375 → upgraded) — every tenant is one of OUR subscribers.
 * View plan/inception/monthly/due/status; change plan, extend trial, comp (free-to-play),
 * mark paying, set custom amount, or delete (cascade; platform tenant protected).
 */
export default async function PlatformSubscribersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/platform/tenants");
  if (!(await isPlatformAdmin())) redirect("/platform");
  const subscribers = await listSubscribers().catch(() => []);
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/platform" className="text-sm text-slate-500 hover:text-slate-900">← Platform</Link>
            <span className="text-base font-semibold text-slate-900">Subscribers</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{subscribers.length}</span>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-6">
        <p className="mb-4 text-sm text-slate-500">
          Every workspace is a subscriber to AIBizConnect. This is <b>our</b> billing view — separate from a tenant&apos;s own Payments menu (where they bill <i>their</i> customers).
        </p>
        <PlatformTenants initial={subscribers} />
      </div>
    </main>
  );
}
