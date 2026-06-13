import Link from "next/link";
import ChangePassword from "@/components/account/ChangePassword";

/** Self-service account page — change your own password + reach your personal Connections. */
export default async function AccountPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <ChangePassword />
      <Link href={`/tenants/${tenantId}/account/connections`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#1e3a8a]/40 hover:bg-slate-50">
        <div>
          <div className="text-sm font-semibold text-slate-900">My Connections</div>
          <div className="text-xs text-slate-500">Connect your own email, calendar &amp; files (Gmail, Outlook, iCloud, Google/Microsoft Calendar…)</div>
        </div>
        <span className="text-[#1e3a8a]">→</span>
      </Link>
    </div>
  );
}
