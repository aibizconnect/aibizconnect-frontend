import AgentsPanel from "@/components/agents/AgentsPanel";
import { listAgents } from "@/lib/agent/registry";
import { listDomainSpecs } from "@/lib/agent/domains/registry";
import { getDesignSystemEnabled } from "@/lib/design/brand-memory";
import { listApprovals } from "@/lib/agent/approvals";
import { listTenantDomains } from "@/lib/domains";
import { listIndustryTemplates } from "@/lib/design/templates";

/**
 * Agents panel (UI-1) — manifest-driven view of the Agent Mesh for a tenant.
 * Reads the agent + domain registries server-side (no HTTP/auth round-trip) and
 * renders the roster + the orchestrator campaign launcher (dry-run).
 */
export default async function AgentsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const agents = listAgents();
  const domains = listDomainSpecs();
  const designEnabled = await getDesignSystemEnabled(tenantId);
  const approvals = await listApprovals(tenantId, "pending");
  const tenantDomains = await listTenantDomains(tenantId);
  const templates = listIndustryTemplates();
  return (
    <main className="min-h-screen bg-zinc-950">
      <AgentsPanel tenantId={tenantId} agents={agents} domains={domains} designEnabled={designEnabled} approvals={approvals} tenantDomains={tenantDomains} templates={templates} />
    </main>
  );
}
