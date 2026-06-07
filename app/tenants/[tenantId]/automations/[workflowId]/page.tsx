import { notFound } from "next/navigation";
import WorkflowEditor from "@/components/automation/WorkflowEditor";
import { getWorkflowAction } from "../actions";

export default async function WorkflowPage({ params }: { params: Promise<{ tenantId: string; workflowId: string }> }) {
  const { tenantId, workflowId } = await params;
  const wf = await getWorkflowAction(tenantId, workflowId);
  if (!wf) notFound();
  return <WorkflowEditor tenantId={tenantId} initial={wf} />;
}
