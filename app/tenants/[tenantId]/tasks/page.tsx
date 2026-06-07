import TasksList from "@/components/crm/TasksList";

export default async function TasksPage({
  params
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  return <TasksList tenantId={tenantId} />;
}
