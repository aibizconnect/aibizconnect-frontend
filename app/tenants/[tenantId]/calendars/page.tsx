import CalendarsManager from "@/components/calendars/CalendarsManager";
import { listCalendarsAction } from "./actions";

export default async function CalendarsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  let initial: Awaited<ReturnType<typeof listCalendarsAction>> = [];
  try { initial = await listCalendarsAction(tenantId); } catch { /* tables not applied yet */ }
  return <CalendarsManager tenantId={tenantId} initial={initial} />;
}
