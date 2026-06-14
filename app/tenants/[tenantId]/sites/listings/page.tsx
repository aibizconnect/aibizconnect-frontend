import Link from "next/link";
import IdxFeedAdmin from "@/components/idx/IdxFeedAdmin";
import { idxEnabled } from "@/lib/flags";

/** Sites → Listings (IDX) admin (G4). Configure the CREA DDF feed. */
export default async function ListingsAdminPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-1 flex items-center gap-2 text-sm">
        <Link href={`/tenants/${tenantId}/sites`} className="text-slate-400 hover:text-slate-700">Sites</Link>
        <span className="text-slate-300">/</span><span className="text-slate-600">Listings (IDX)</span>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Listings (IDX)</h1>
      <p className="mb-5 text-sm text-slate-500">Connect your MLS data feed (CREA DDF) to show real-estate listings on your site. Inquiries flow into your CRM; a public, searchable listings page goes live once the feed is active.</p>
      <IdxFeedAdmin tenantId={tenantId} idxEnabled={idxEnabled()} />
    </div>
  );
}
