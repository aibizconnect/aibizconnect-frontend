import { getTenantUsers } from "@/lib/tenant";

export default async function TenantUsers({
  params
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const users = await getTenantUsers(tenantId);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Users</h1>
      <ul className="space-y-2">
        {users.map((u: { id: string; user_id: string; role: string }) => (
          <li key={u.id} className="p-4 bg-white rounded-lg border border-gray-200 flex items-center justify-between">
            <span className="font-mono text-sm text-gray-900">{u.user_id}</span>
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{u.role}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
