import Link from "next/link";
import { listSitePages } from "../../actions";
import { listWebsites } from "../../website-actions";
import { listForms } from "@/lib/server/forms";
import AiStudio from "@/components/website/AiStudio";

/**
 * AI Studio — a slim, AI-first companion editor (it does NOT replace the full editor at
 * /website/{websiteId}). Multi-website / many-page: a thin rail + live preview + Ask-AI.
 */
export default async function StudioPage({ params, searchParams }: { params: Promise<{ tenantId: string; websiteId: string }>; searchParams: Promise<{ page?: string }> }) {
  const { tenantId, websiteId } = await params;
  const { page: initialPageId } = await searchParams;
  const [pages, websites, forms] = await Promise.all([listSitePages(tenantId, websiteId), listWebsites(tenantId), listForms(tenantId).catch(() => [])]);
  const site = websites.find((w) => w.id === websiteId) ?? websites[0];
  const formChoices = forms.filter((f) => f.status !== "archived").map((f) => ({ id: f.id, name: f.name, kind: f.kind }));

  return (
    <div className="w-full px-2">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href={`/tenants/${tenantId}/sites`} className="text-sm text-[#1e3a8a] hover:underline">← Back to Sites</Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{site?.name ?? "Website"} <span className="text-slate-400">· AI Studio</span></h1>
        </div>
        <Link href={`/tenants/${tenantId}/website/${websiteId}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Full editor ↗</Link>
      </div>
      <AiStudio tenantId={tenantId} websiteId={websiteId} websiteName={site?.name ?? "Website"} websites={websites.map((w) => ({ id: w.id, name: w.name }))} pages={pages} initialPageId={initialPageId} forms={formChoices} />
    </div>
  );
}
