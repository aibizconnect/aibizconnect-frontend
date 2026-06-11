import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTool } from "@/lib/tools/registry";
import { getToolProfile, listRuns } from "@/lib/tools/run";
import ToolRunner from "@/components/tools/ToolRunner";
import SavedDrafts from "@/components/tools/SavedDrafts";

export const metadata: Metadata = { title: "Tool — AIBizConnect" };

export default async function ToolRunnerPage({ params }: { params: Promise<{ tenantId: string; toolKey: string }> }) {
  const { tenantId, toolKey } = await params;
  const tool = getTool(toolKey);
  if (!tool || tool.comingSoon) notFound();
  const profile = await getToolProfile(tenantId);
  const runs = await listRuns(tenantId, tool.key);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5">
        <div className="flex items-center justify-between">
          <Link href={`/tenants/${tenantId}/tools`} className="text-sm text-[#1e3a8a] hover:underline">← All tools</Link>
          <Link href={`/tenants/${tenantId}/tools/library`} className="text-sm text-[#1e3a8a] hover:underline">Saved drafts →</Link>
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{tool.name}</h1>
        <p className="text-sm text-slate-500">{tool.blurb}</p>
      </div>
      <ToolRunner
        tenantId={tenantId}
        toolKey={tool.key}
        fields={tool.fields.map((f) => ({ ...f, prefill: f.fromProfile ? (profile[f.fromProfile] ?? "") : "" }))}
      />

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Saved drafts</h2>
        <SavedDrafts tenantId={tenantId} toolKey={tool.key} initial={runs} />
      </div>
    </div>
  );
}
