import PaymentsHub from "@/components/payments/PaymentsHub";
import { paymentsBootstrap } from "./actions";

export default async function PaymentsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  let data: Awaited<ReturnType<typeof paymentsBootstrap>> = { products: [], invoices: [], estimates: [], transactions: [], contacts: [], stripeOn: false, plans: [], subscriptions: [], coupons: [] };
  try { data = await paymentsBootstrap(tenantId); } catch { /* migration 0058 not applied yet */ }
  return <PaymentsHub tenantId={tenantId} initial={data} />;
}
