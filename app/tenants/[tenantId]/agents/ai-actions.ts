"use server";

import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { listAiAgents, saveAiAgent, deleteAiAgent, type AiAgentDef } from "@/lib/agent/agents-store";
import { runAgentTurn, type AgentChatMessage, type AgentTurnResult } from "@/lib/agent/agent-runtime";

/** AI Agents hub actions (D-274). Auth-gated wrappers over the store + runtime. */

export async function listAiAgentsAction(tenantId: string): Promise<AiAgentDef[]> {
  await requireTenantAccess(tenantId);
  return listAiAgents(tenantId);
}

export async function saveAiAgentAction(tenantId: string, agent: AiAgentDef): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  if (!agent?.id || !agent.name?.trim()) return { ok: false, message: "Agent needs a name." };
  try { await saveAiAgent(tenantId, { ...agent, name: agent.name.trim() }); return { ok: true }; }
  catch (e) { return { ok: false, message: (e as Error).message }; }
}

export async function deleteAiAgentAction(tenantId: string, agentId: string): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await deleteAiAgent(tenantId, agentId); return { ok: true }; }
  catch (e) { return { ok: false, message: (e as Error).message }; }
}

/** One conversational turn in the Test console. liveActions=false keeps booking tools off. */
export async function runAgentTestTurnAction(
  tenantId: string,
  agent: AiAgentDef,
  transcript: AgentChatMessage[],
  liveActions: boolean,
): Promise<AgentTurnResult> {
  await requireTenantAccess(tenantId);
  try {
    const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
    await logPlatformEvent({ action: "agent.test.turn", actorEmail: null, meta: { tenantId, agentId: agent.id, liveActions } });
  } catch { /* best effort */ }
  return runAgentTurn(tenantId, agent, transcript, { liveActions });
}

export interface AgentAuditRow { action: string; createdAt: string; meta: Record<string, unknown> }

/** Recent agent activity from the platform audit log (agent.* actions for this tenant). */
export async function listAgentAuditAction(tenantId: string): Promise<AgentAuditRow[]> {
  await requireTenantAccess(tenantId);
  try {
    const sb = createSupabaseServiceClient();
    const { data } = await sb.from("platform_audit_log")
      .select("action, meta, created_at")
      .like("action", "agent.%")
      .eq("meta->>tenantId", tenantId)
      .order("created_at", { ascending: false })
      .limit(100);
    return (data ?? []).map((r: any) => ({ action: r.action, createdAt: r.created_at, meta: r.meta ?? {} }));
  } catch { return []; }
}
