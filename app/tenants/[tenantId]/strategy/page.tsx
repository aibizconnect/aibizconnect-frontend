import { getImpersonation } from "@/lib/auth/platform-admin";
import StrategyView from "./StrategyView";

/**
 * Content Strategy — a per-tenant, deterministic SEO/topical-authority plan (pillars → clusters →
 * articles), a prioritized content queue, and a 12-week calendar. Generated from the tenant's
 * Business Profile. No hallucinated facts; admin can (re)generate.
 */
export default async function StrategyPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const imp = await getImpersonation();
  const isAdmin = imp.realRole === "superadmin" || imp.realRole === "admin";
  return <StrategyView tenantId={tenantId} isAdmin={isAdmin} />;
}
