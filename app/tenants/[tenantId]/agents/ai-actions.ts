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

/** One conversational turn in the Test console. liveActions=false keeps booking tools off.
 *  A successful turn stamps lastTestedAt — the TEST-DRIVE GATE for public channels (D-277). */
export async function runAgentTestTurnAction(
  tenantId: string,
  agent: AiAgentDef,
  transcript: AgentChatMessage[],
  liveActions: boolean,
): Promise<AgentTurnResult & { testedAt?: string }> {
  await requireTenantAccess(tenantId);
  try {
    const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
    await logPlatformEvent({ action: "agent.test.turn", actorEmail: null, meta: { tenantId, agentId: agent.id, liveActions } });
  } catch { /* best effort */ }
  const r = await runAgentTurn(tenantId, agent, transcript, { liveActions });
  if (!r.error && r.reply) {
    const testedAt = new Date().toISOString();
    try {
      const stored = (await listAiAgents(tenantId)).find((x) => x.id === agent.id);
      if (stored) await saveAiAgent(tenantId, { ...stored, lastTestedAt: testedAt });
    } catch { /* stamp is best-effort */ }
    return { ...r, testedAt };
  }
  return r;
}

export interface AgentUsageSummary { monthTurns: number; monthTokens: number; totalTurns: number; totalTokens: number }

/** This month's + all-time agent usage from ai_usage_events (agent_turn / agent_tokens). */
export async function getAgentUsageAction(tenantId: string): Promise<AgentUsageSummary> {
  await requireTenantAccess(tenantId);
  const out: AgentUsageSummary = { monthTurns: 0, monthTokens: 0, totalTurns: 0, totalTokens: 0 };
  try {
    const sb = createSupabaseServiceClient();
    const { data } = await sb.from("ai_usage_events").select("kind, units, created_at").eq("tenant_id", tenantId).in("kind", ["agent_turn", "agent_tokens"]);
    const now = new Date();
    const monthKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}`;
    for (const r of (data ?? []) as { kind: string; units: number; created_at: string }[]) {
      const u = r.units ?? 0;
      const d = new Date(r.created_at);
      const inMonth = `${d.getUTCFullYear()}-${d.getUTCMonth()}` === monthKey;
      if (r.kind === "agent_turn") { out.totalTurns += u; if (inMonth) out.monthTurns += u; }
      else { out.totalTokens += u; if (inMonth) out.monthTokens += u; }
    }
  } catch { /* table may not exist (0027 queued) — zeros */ }
  return out;
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
