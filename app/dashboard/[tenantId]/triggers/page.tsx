import { getTenantTriggers } from "@/lib/tenant";

export default async function TenantTriggers({
  params
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const triggers = await getTenantTriggers(tenantId);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Triggers</h1>
      <ul className="space-y-2">
        {triggers.map((t: { id: string; provider: string; event: string }) => (
          <li key={t.id} className="p-4 bg-white rounded-lg border border-gray-200">
            <strong className="text-gray-900">{t.provider}</strong>
            <span className="text-gray-500"> — {t.event}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
