import Link from "next/link";
import { headers } from "next/headers";
import StoreAdmin from "@/components/store/StoreAdmin";
import { getStoreAdminAction } from "./actions";

/** Sites → Store admin (D-350). */
export default async function StoreAdminPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "app.aibizconnect.app";
  const proto = h.get("x-forwarded-proto") || "https";
  const origin = `${proto}://${host}`;
  const initial = await getStoreAdminAction(tenantId).catch(() => ({ config: { enabled: false, title: "Shop" }, products: [], orders: [], stripeReady: false }));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-1 flex items-center gap-2 text-sm">
        <Link href={`/tenants/${tenantId}/sites`} className="text-slate-400 hover:text-slate-700">Sites</Link>
        <span className="text-slate-300">/</span><span className="text-slate-600">Store</span>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Store</h1>
      <p className="mb-5 text-sm text-slate-500">Sell your products online. Your active products from Payments become a storefront with Stripe checkout.</p>
      <StoreAdmin tenantId={tenantId} origin={origin} initial={initial} />
    </div>
  );
}
