import Link from "next/link";
import { headers } from "next/headers";
import RedirectsManager from "@/components/sites/RedirectsManager";

/** Sites → URL Redirects admin (D-347). */
export default async function RedirectsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "app.aibizconnect.app";
  const proto = h.get("x-forwarded-proto") || "https";
  const origin = `${proto}://${host}`;
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-1 flex items-center gap-2 text-sm">
        <Link href={`/tenants/${tenantId}/sites`} className="text-slate-400 hover:text-slate-700">Sites</Link>
        <span className="text-slate-300">/</span><span className="text-slate-600">URL Redirects</span>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">URL Redirects</h1>
      <p className="mb-5 text-sm text-slate-500">Point an old or short path on your site to any destination. Applied when no page matches that path.</p>
      <RedirectsManager tenantId={tenantId} origin={origin} />
    </div>
  );
}
