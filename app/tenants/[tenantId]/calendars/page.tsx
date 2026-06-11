import CalendarShell from "@/components/calendars/CalendarShell";
import { listCalendarsAction } from "./actions";

// GHL-parity calendar area (Blueprint v3.2): Calendar view | Appointments | Settings.
export default async function CalendarsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  let initial: Awaited<ReturnType<typeof listCalendarsAction>> = [];
  try { initial = await listCalendarsAction(tenantId); } catch { /* tables not applied yet */ }
  return <CalendarShell tenantId={tenantId} initial={initial} />;
}
