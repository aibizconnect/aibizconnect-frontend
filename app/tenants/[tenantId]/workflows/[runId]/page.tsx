import WorkflowRunDetail from "@/components/WorkflowRunDetail";

export default function Page({ params }: { params: { tenantId: string; runId: string } }) {
  return <WorkflowRunDetail tenantId={params.tenantId} runId={params.runId} />;
}
