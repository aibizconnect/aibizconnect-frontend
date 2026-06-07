import MembershipsManager from "@/components/memberships/MembershipsManager";
import { listCoursesAction } from "./actions";

export default async function MembershipsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  let initial: Awaited<ReturnType<typeof listCoursesAction>> = [];
  try { initial = await listCoursesAction(tenantId); } catch { /* tables not applied yet */ }
  return <MembershipsManager tenantId={tenantId} initial={initial} />;
}
