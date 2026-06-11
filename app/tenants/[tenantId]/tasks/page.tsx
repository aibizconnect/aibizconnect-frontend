import TasksRollup from "@/components/crm/TasksRollup";

// All-contacts tasks rollup (GHL parity) — same component as the Contacts → Tasks tab.
export default async function TasksPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Tasks</h1>
        <p className="text-sm text-slate-500">Follow-ups across all your contacts.</p>
      </div>
      <TasksRollup tenantId={tenantId} />
    </div>
  );
}
