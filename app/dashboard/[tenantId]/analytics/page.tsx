import { getTenantAnalytics } from "@/lib/tenant";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";

export default async function AnalyticsPage({
  params
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const data = await getTenantAnalytics(tenantId);

  return <AnalyticsDashboard tenantId={tenantId} initialData={data} />;
}
