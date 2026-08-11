import type { Metadata } from "next";
import ListingsBlockStudio from "./ListingsBlockStudio";

/** Config + live preview for the embeddable Listings block (D-361). Link with ?t=<tenantId>. */
export const metadata: Metadata = { title: "Listings block", robots: { index: false } };
export const dynamic = "force-dynamic";

const NAVY = "#1e3a8a";

export default async function ListingsBlockPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const appBase = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.aibizconnect.app").replace(/\/+$/, "");

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg text-white" style={{ background: NAVY }}>🏠</span>
            <span className="text-lg font-semibold tracking-tight" style={{ color: NAVY }}>AIBizConnect <span className="font-normal text-slate-400">Listings block</span></span>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Build a live MLS® listings block for any website or GoHighLevel page. Choose the search, preview it, copy the one-line snippet.
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <ListingsBlockStudio appBase={appBase} initialTenantId={t ?? ""} />
      </div>
    </main>
  );
}
