"use server";

import { listFunnels, getFunnel, createFunnel, deleteFunnel, addStep, deleteStep, reorderStep, generateFunnel, cloneStep, unpublishStep, type Funnel, type StepType } from "@/lib/funnels";
import { supervisedPublish } from "@/lib/agent/publish";

export async function listFunnelsAction(tenantId: string): Promise<Funnel[]> { return listFunnels(tenantId); }

export async function createFunnelAction(tenantId: string, name: string): Promise<{ ok: boolean; id?: string; error?: string; funnels: Funnel[] }> {
  const r = await createFunnel(tenantId, name);
  return { ...r, funnels: await listFunnels(tenantId) };
}

export async function deleteFunnelAction(tenantId: string, funnelId: string): Promise<{ funnels: Funnel[] }> {
  await deleteFunnel(tenantId, funnelId);
  return { funnels: await listFunnels(tenantId) };
}

export async function getFunnelAction(tenantId: string, funnelId: string): Promise<Funnel | null> { return getFunnel(tenantId, funnelId); }

export async function addStepAction(tenantId: string, funnelId: string, stepType: StepType): Promise<Funnel | null> {
  await addStep(tenantId, funnelId, stepType);
  return getFunnel(tenantId, funnelId);
}

export async function deleteStepAction(tenantId: string, funnelId: string, stepId: string): Promise<Funnel | null> {
  await deleteStep(tenantId, stepId);
  return getFunnel(tenantId, funnelId);
}

export async function reorderStepAction(tenantId: string, funnelId: string, stepId: string, dir: "up" | "down"): Promise<Funnel | null> {
  await reorderStep(tenantId, stepId, dir);
  return getFunnel(tenantId, funnelId);
}

export async function generateFunnelAction(tenantId: string, funnelId: string, kind: "lead" | "sales"): Promise<Funnel | null> {
  await generateFunnel(tenantId, funnelId, kind);
  return getFunnel(tenantId, funnelId);
}

export async function cloneStepAction(tenantId: string, funnelId: string, stepId: string): Promise<Funnel | null> {
  await cloneStep(tenantId, stepId);
  return getFunnel(tenantId, funnelId);
}

/** Per-step publish — runs the O-3 critic gate (supervisedPublish). */
export async function publishStepAction(tenantId: string, funnelId: string, stepId: string): Promise<{ ok: boolean; reason?: string; score?: number; funnel: Funnel | null }> {
  const outcome = await supervisedPublish({ tenantId, pageId: stepId });
  return { ok: outcome.published, reason: outcome.published ? undefined : (outcome.reason ?? "Quality gate failed"), score: outcome.critic?.score, funnel: await getFunnel(tenantId, funnelId) };
}

export async function unpublishStepAction(tenantId: string, funnelId: string, stepId: string): Promise<Funnel | null> {
  await unpublishStep(tenantId, stepId);
  return getFunnel(tenantId, funnelId);
}
