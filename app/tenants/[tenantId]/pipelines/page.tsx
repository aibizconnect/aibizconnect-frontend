import OpportunitiesHub from "@/components/crm/OpportunitiesHub";
import { loadOpportunitiesAction } from "./crm-actions";
import { listContacts } from "@/lib/crm";

export default async function PipelinesPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  try {
    const { pipelines, pipeline, opps } = await loadOpportunitiesAction(tenantId);
    const contacts = (await listContacts(tenantId).catch(() => [])).map((c) => ({ id: c.id, name: c.name || c.email || c.phone || "—", email: c.email }));
    return <OpportunitiesHub tenantId={tenantId} pipelines={pipelines} pipeline={pipeline} initialOpps={opps} contacts={contacts} />;
  } catch {
    return <div className="mx-auto max-w-2xl p-8 text-sm text-slate-500">Run the CRM migration to enable Opportunities.</div>;
  }
}
