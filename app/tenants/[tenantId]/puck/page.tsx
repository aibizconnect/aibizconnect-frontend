import PuckTenantEditor from "./PuckTenantEditor";

export const dynamic = "force-dynamic";

export default async function TenantPuckPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  return <PuckTenantEditor tenantId={tenantId} />;
}
