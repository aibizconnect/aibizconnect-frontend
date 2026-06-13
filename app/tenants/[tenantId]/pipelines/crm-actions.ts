"use server";

import {
  ensurePipeline, listPipelines, createPipeline, listOpportunities, listOpportunitiesRich,
  createOpportunity, moveOpportunity, updateOpportunity, bulkOpportunity, deleteOpportunity,
  type Opportunity, type OpportunityRow, type Pipeline,
} from "@/lib/crm";

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
  await createPipeline(tenantId, name, stages);
  return listPipelines(tenantId);
}

export async function createOppAction(tenantId: string, pipelineId: string, o: { name: string; value?: number; stage: string; contactId?: string | null; status?: "open" | "won" | "lost" }): Promise<Opportunity[]> {
  await createOpportunity(tenantId, pipelineId, o);
  return listOpportunities(tenantId, pipelineId);
}

export async function updateOppAction(tenantId: string, pipelineId: string, id: string, patch: { name?: string; value?: number; stage?: string; status?: "open" | "won" | "lost"; contact_id?: string | null }): Promise<OpportunityRow[]> {
  await updateOpportunity(tenantId, id, patch);
  return listOpportunitiesRich(tenantId, pipelineId);
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
