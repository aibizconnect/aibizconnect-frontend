import { notFound } from "next/navigation";
import FunnelsList from "@/components/sites/FunnelsList";
import { listFunnelsAction } from "./actions";
import { funnelsEnabled } from "@/lib/flags";

export default async function FunnelsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  if (!funnelsEnabled()) notFound();
  const { tenantId } = await params;
  const initial = await listFunnelsAction(tenantId);
  return <FunnelsList tenantId={tenantId} initial={initial} />;
}
