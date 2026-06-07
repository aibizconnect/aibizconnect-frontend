import { getTenantContext } from "@/lib/tenant";

export default async function TenantBilling({
  params
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const tenant = await getTenantContext(tenantId);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Billing</h1>
      <p className="text-gray-600">
        Stripe Customer ID:{" "}
        <span className="font-mono text-gray-900">{tenant.stripe_customer_id ?? "—"}</span>
      </p>
    </div>
  );
}
