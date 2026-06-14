"use server";

import {
  ensurePipeline, listPipelines, createPipeline, updatePipeline, deletePipeline,
  listOpportunities, listOpportunitiesRich, getOpportunity,
  createOpportunity, moveOpportunity, updateOpportunity, bulkOpportunity, deleteOpportunity,
  type Opportunity, type OpportunityRow, type OpportunityPatch, type Pipeline,
} from "@/lib/crm";
import { requireTenantAccess } from "@/lib/auth/tenant-access";

export async function loadPipelineAction(tenantId: string): Promise<{ pipeline: Pipeline; opps: Opportunity[] }> {
  const pipeline = await ensurePipeline(tenantId);
  const opps = await listOpportunities(tenantId, pipeline.id);
  return { pipeline, opps };
}

/** Multi-pipeline loader for the Opportunities hub (board + list). */
export async function loadOpportunitiesAction(tenantId: string, pipelineId?: string): Promise<{ pipelines: Pipeline[]; pipeline: Pipeline; opps: OpportunityRow[] }> {
  await ensurePipeline(tenantId); // guarantee at least one
  const pipelines = await listPipelines(tenantId);
  const pipeline = pipelines.find((p) => p.id === pipelineId) ?? pipelines[0];
  const opps = await listOpportunitiesRich(tenantId, pipeline.id);
  return { pipelines, pipeline, opps };
}

export async function createPipelineAction(tenantId: string, name: string, stages?: string[]): Promise<Pipeline[]> {
  await requireTenantAccess(tenantId);
  await createPipeline(tenantId, name, stages);
  return listPipelines(tenantId);
}

/** Manage-pipeline editor: rename and/or replace stages. Returns the refreshed pipeline list. */
export async function updatePipelineAction(tenantId: string, id: string, patch: { name?: string; stages?: string[] }): Promise<{ ok: boolean; error?: string; pipelines: Pipeline[] }> {
  await requireTenantAccess(tenantId);
  const r = await updatePipeline(tenantId, id, patch);
  return { ok: r.ok, error: r.error, pipelines: await listPipelines(tenantId) };
}

/** Delete a pipeline (+ its opportunities). Refuses to remove the last one. */
export async function deletePipelineAction(tenantId: string, id: string): Promise<{ ok: boolean; error?: string; pipelines: Pipeline[] }> {
  await requireTenantAccess(tenantId);
  const r = await deletePipeline(tenantId, id);
  return { ok: r.ok, error: r.error, pipelines: await listPipelines(tenantId) };
}

export async function createOppAction(tenantId: string, pipelineId: string, o: { name: string; value?: number; stage: string; contactId?: string | null; status?: "open" | "won" | "lost"; ownerEmail?: string | null; source?: string | null; expectedCloseDate?: string | null }): Promise<Opportunity[]> {
  await requireTenantAccess(tenantId);
  await createOpportunity(tenantId, pipelineId, o);
  return listOpportunities(tenantId, pipelineId);
}

export async function updateOppAction(tenantId: string, pipelineId: string, id: string, patch: OpportunityPatch): Promise<OpportunityRow[]> {
  await requireTenantAccess(tenantId);
  await updateOpportunity(tenantId, id, patch);
  return listOpportunitiesRich(tenantId, pipelineId);
}

/** Load one opportunity's full detail (the detail card opens for both board + list). */
export async function getOppAction(tenantId: string, id: string): Promise<OpportunityRow | null> {
  await requireTenantAccess(tenantId);
  return getOpportunity(tenantId, id);
}

export async function bulkOppAction(tenantId: string, pipelineId: string, ids: string[], op: { stage?: string; status?: "open" | "won" | "lost"; delete?: boolean }): Promise<OpportunityRow[]> {
  await bulkOpportunity(tenantId, ids, op);
  return listOpportunitiesRich(tenantId, pipelineId);
}

export async function listOppsRichAction(tenantId: string, pipelineId: string): Promise<OpportunityRow[]> {
  return listOpportunitiesRich(tenantId, pipelineId);
}

export async function moveOppAction(tenantId: string, pipelineId: string, id: string, stage: string): Promise<Opportunity[]> {
  await moveOpportunity(tenantId, id, stage);
  return listOpportunities(tenantId, pipelineId);
}

export async function deleteOppAction(tenantId: string, pipelineId: string, id: string): Promise<Opportunity[]> {
  await deleteOpportunity(tenantId, id);
  return listOpportunities(tenantId, pipelineId);
}
