import LeftNav from "@/components/LeftNav";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import { getCurrentUser, getImpersonation } from "@/lib/auth/platform-admin";

export default async function TenantLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const [user, imp] = await Promise.all([getCurrentUser(), getImpersonation()]);
  const canImpersonate = imp.realRole === "superadmin";
  const isPlatformAdmin = imp.realRole === "superadmin" || imp.realRole === "admin";
  return (
    <div className="min-h-screen bg-slate-50">
      <LeftNav tenantId={tenantId} user={user} canImpersonate={canImpersonate} actingAs={imp.actingAs} isPlatformAdmin={isPlatformAdmin} />

      <main className="ml-[248px] min-h-screen text-slate-900">
        {imp.actingAs && <ImpersonationBanner actingAs={imp.actingAs} realEmail={imp.realEmail} />}
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
