import CrmPipeline from "@/components/crm/CrmPipeline";
import { loadPipelineAction } from "./crm-actions";

export default async function PipelinesPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  try {
    const { pipeline, opps } = await loadPipelineAction(tenantId);
    return <CrmPipeline tenantId={tenantId} pipeline={pipeline} initial={opps} />;
  } catch {
    return <div className="mx-auto max-w-2xl p-8 text-sm text-slate-500">Run the CRM migration (QUEUED_crm.sql) to enable Opportunities.</div>;
  }
}
