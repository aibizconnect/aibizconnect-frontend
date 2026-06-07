import { notFound } from "next/navigation";
import FunnelCanvas from "@/components/sites/FunnelCanvas";
import { getFunnelAction } from "../actions";
import { funnelsEnabled } from "@/lib/flags";

export default async function FunnelDetailPage({ params }: { params: Promise<{ tenantId: string; funnelId: string }> }) {
  if (!funnelsEnabled()) notFound();
  const { tenantId, funnelId } = await params;
  const funnel = await getFunnelAction(tenantId, funnelId);
  if (!funnel) notFound();
  return <FunnelCanvas tenantId={tenantId} initial={funnel} />;
}
