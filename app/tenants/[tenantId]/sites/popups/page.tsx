import PopupsManager from "@/components/sites/PopupsManager";
import { listPopupsAction } from "../popup-actions";

export default async function PopupsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const initial = await listPopupsAction(tenantId);
  return <PopupsManager tenantId={tenantId} initial={initial} />;
}
