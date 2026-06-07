import { getTenantContext } from "@/lib/tenant";

export default async function TenantSettings({
  params
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const tenant = await getTenantContext(tenantId);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Settings</h1>
      <pre className="bg-white p-4 rounded-lg border border-gray-200 text-sm overflow-auto">
        {JSON.stringify(tenant.settings, null, 2)}
      </pre>
    </div>
  );
}
