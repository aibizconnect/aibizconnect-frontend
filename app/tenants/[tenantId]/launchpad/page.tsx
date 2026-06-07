import { getImpersonation } from "@/lib/auth/platform-admin";
import Launchpad from "./Launchpad";

/**
 * Launchpad — the tenant onboarding sequence. Guides each tenant to finish setting up their
 * account + websites, auto-verifies each step, and offers a follow-up reminder sequence
 * (in-app + email + SMS, drafts-only — nothing sends without the admin enabling it).
 */
export default async function LaunchpadPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const imp = await getImpersonation();
  const isAdmin = imp.realRole === "superadmin" || imp.realRole === "admin";
  // Opportunistic trigger: best-effort send of any due follow-ups (no-op unless opted in + due).
  try { const { runDueFollowups } = await import("@/lib/server/followup-worker"); await runDueFollowups(tenantId); } catch { /* best effort */ }
  return <Launchpad tenantId={tenantId} isAdmin={isAdmin} />;
}
