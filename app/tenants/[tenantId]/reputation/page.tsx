import ReputationDashboard from "@/components/reputation/ReputationDashboard";
import { listReviewsAction } from "./actions";

export default async function ReputationPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  let initial: Awaited<ReturnType<typeof listReviewsAction>> = [];
  try { initial = await listReviewsAction(tenantId); } catch { /* table not applied yet */ }
  return <ReputationDashboard tenantId={tenantId} initial={initial} />;
}
