import TenantTeamHub from "@/components/team/TenantTeamHub";
import { getTeamViewAction } from "./team-actions";

/**
 * Tenant TEAM (D-282/283): the tenant's own staff management — roles, assigned-only
 * access, invites — plus franchise locations under an organization with roll-up. (The
 * old platform-superadmin roster lives under /admin; this is the per-tenant experience.)
 */
export default async function TeamPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const view = await getTeamViewAction(tenantId);
  return <TenantTeamHub tenantId={tenantId} initial={view} />;
}
