import type { Metadata } from "next";
import Link from "next/link";
import { listRuns } from "@/lib/tools/run";
import { listTools } from "@/lib/tools/registry";
import SavedDrafts from "@/components/tools/SavedDrafts";

export const metadata: Metadata = { title: "Saved drafts — Tools" };

/** Library — every saved draft across all tools, newest first. Read-only reuse. */
export default async function ToolsLibraryPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const runs = await listRuns(tenantId);
  const toolNameOf: Record<string, string> = {};
  for (const t of listTools()) toolNameOf[t.key] = t.name;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5">
        <Link href={`/tenants/${tenantId}/tools`} className="text-sm text-[#1e3a8a] hover:underline">← All tools</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Saved drafts</h1>
        <p className="text-sm text-slate-500">Everything you&apos;ve generated and saved. Private drafts — nothing is published or sent.</p>
      </div>
      <SavedDrafts tenantId={tenantId} initial={runs} toolNameOf={toolNameOf} />
    </div>
  );
}
