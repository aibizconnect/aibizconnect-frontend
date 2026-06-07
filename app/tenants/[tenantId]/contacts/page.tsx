import CrmContacts from "@/components/crm/CrmContacts";
import { listContactsAction } from "./crm-actions";

export default async function ContactsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  let initial: Awaited<ReturnType<typeof listContactsAction>> = [];
  try { initial = await listContactsAction(tenantId); } catch { /* tables not applied yet */ }
  return <CrmContacts tenantId={tenantId} initial={initial} />;
}
