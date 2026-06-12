import AiAgentsHub from "@/components/agents/AiAgentsHub";
import AgentsPanel from "@/components/agents/AgentsPanel";
import { listAiAgents } from "@/lib/agent/agents-store";
import { listAgents } from "@/lib/agent/registry";
import { listDomainSpecs } from "@/lib/agent/domains/registry";
import { getDesignSystemEnabled } from "@/lib/design/brand-memory";
import { listApprovals } from "@/lib/agent/approvals";
import { listTenantDomains } from "@/lib/domains";
import { listIndustryTemplates } from "@/lib/design/templates";

/**
 * AI AGENTS (D-274) — the tenant-facing product menu (GHL-class, but agents run REAL
 * audited tools: live calendars, bookings, business-profile knowledge). The legacy
 * Agent Mesh ops panel (roster + campaign launcher + approvals) lives on under the
 * hub's "Ops" tab.
 */
export default async function AgentsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const aiAgents = await listAiAgents(tenantId);

  // Legacy mesh data (Ops tab).
  const agents = listAgents();
  const domains = listDomainSpecs();
  const designEnabled = await getDesignSystemEnabled(tenantId);
  const approvals = await listApprovals(tenantId, "pending");
  const tenantDomains = await listTenantDomains(tenantId);
  const templates = listIndustryTemplates();

  return (
    <AiAgentsHub
      tenantId={tenantId}
      initialAgents={aiAgents}
      ops={
        <div className="mt-4 overflow-hidden rounded-xl bg-zinc-950">
          <AgentsPanel tenantId={tenantId} agents={agents} domains={domains} designEnabled={designEnabled} approvals={approvals} tenantDomains={tenantDomains} templates={templates} />
        </div>
      }
    />
  );
}
