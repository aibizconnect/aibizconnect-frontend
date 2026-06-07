import { getTenantAuditLogs } from "@/lib/tenant";
import AuditLogViewer from "@/components/audit/AuditLogViewer";

export default async function AuditPage({
  params
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const logs = await getTenantAuditLogs(tenantId);

  return <AuditLogViewer tenantId={tenantId} initialLogs={logs} />;
}
