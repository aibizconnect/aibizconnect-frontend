import Link from "next/link";
import FormsHub from "@/components/forms/FormsHub";
import { listFormsAction } from "./actions";

export default async function FormsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  let initial: Awaited<ReturnType<typeof listFormsAction>> = [];
  try { initial = await listFormsAction(tenantId); } catch { /* migration 0059 not applied yet */ }
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-1 flex items-center gap-2 text-sm">
        <Link href={`/tenants/${tenantId}/sites`} className="text-slate-400 hover:text-slate-700">Sites</Link>
        <span className="text-slate-300">/</span><span className="text-slate-600">Forms</span>
      </div>
      <FormsHub tenantId={tenantId} initial={initial} />
    </div>
  );
}
