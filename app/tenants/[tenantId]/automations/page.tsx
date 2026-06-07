import WorkflowsList from "@/components/automation/WorkflowsList";
import { listWorkflowsAction } from "./actions";

export default async function AutomationsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  let initial = [] as Awaited<ReturnType<typeof listWorkflowsAction>>;
  try { initial = await listWorkflowsAction(tenantId); } catch { /* tenant_workflows not applied yet */ }
  return <WorkflowsList tenantId={tenantId} initial={initial} />;
}
