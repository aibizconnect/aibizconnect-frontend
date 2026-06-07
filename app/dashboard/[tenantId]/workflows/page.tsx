import { getTenantWorkflows } from "@/lib/tenant";

export default async function TenantWorkflows({
  params
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const workflows = await getTenantWorkflows(tenantId);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Workflows</h1>
      <ul className="space-y-2">
        {workflows.map((w: { id: string; name: string }) => (
          <li key={w.id} className="p-4 bg-white rounded-lg border border-gray-200">
            <strong className="text-gray-900">{w.name}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
