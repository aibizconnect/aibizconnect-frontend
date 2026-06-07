"use server";

import { listWorkflows, getWorkflow, createWorkflow, updateWorkflow, deleteWorkflow, generateWorkflow, type Workflow, type WfStep, type WfTrigger } from "@/lib/workflows";

export async function listWorkflowsAction(tenantId: string): Promise<Workflow[]> { return listWorkflows(tenantId); }
export async function getWorkflowAction(tenantId: string, id: string): Promise<Workflow | null> { return getWorkflow(tenantId, id); }

export async function createWorkflowAction(tenantId: string, name: string): Promise<{ ok: boolean; id?: string; error?: string; workflows: Workflow[] }> {
  const r = await createWorkflow(tenantId, name);
  return { ...r, workflows: await listWorkflows(tenantId) };
}

export async function deleteWorkflowAction(tenantId: string, id: string): Promise<{ workflows: Workflow[] }> {
  await deleteWorkflow(tenantId, id);
  return { workflows: await listWorkflows(tenantId) };
}

export async function generateWorkflowAction(tenantId: string, kind: "nurture" | "scoring" | "booking"): Promise<{ workflows: Workflow[] }> {
  await generateWorkflow(tenantId, kind);
  return { workflows: await listWorkflows(tenantId) };
}

export async function saveWorkflowAction(tenantId: string, id: string, patch: { name?: string; status?: "draft" | "published"; trigger?: WfTrigger; steps?: WfStep[] }): Promise<Workflow | null> {
  await updateWorkflow(tenantId, id, patch);
  return getWorkflow(tenantId, id);
}
