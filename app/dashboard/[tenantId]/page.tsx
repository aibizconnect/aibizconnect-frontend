import { getTenantContext } from "@/lib/tenant";

export default async function TenantOverview({
  params
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const tenant = await getTenantContext(tenantId);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Welcome, {tenant.name}</h1>
      <p className="text-gray-600 mt-2">Plan: {tenant.plan}</p>
    </div>
  );
}
