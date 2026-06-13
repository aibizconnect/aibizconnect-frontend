import ConversationsHub from "@/components/conversations/ConversationsHub";
import { listThreadsAction } from "./actions";

export default async function ConversationsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  let initial: Awaited<ReturnType<typeof listThreadsAction>> = [];
  try { initial = await listThreadsAction(tenantId); } catch { /* migration 0057 not applied yet */ }
  return <ConversationsHub tenantId={tenantId} initial={initial} />;
}
