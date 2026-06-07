import { getWorkflowRuns } from "@/lib/tenant";
import WorkflowRuns from "@/components/workflows/WorkflowRuns";

export default async function WorkflowStatusPage({
  params
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const runs = await getWorkflowRuns(tenantId);

  return <WorkflowRuns tenantId={tenantId} initialRuns={runs} />;
}
