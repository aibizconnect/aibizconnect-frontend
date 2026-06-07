"use server";

import { ensurePipeline, listOpportunities, createOpportunity, moveOpportunity, deleteOpportunity, type Opportunity, type Pipeline } from "@/lib/crm";

export async function loadPipelineAction(tenantId: string): Promise<{ pipeline: Pipeline; opps: Opportunity[] }> {
  const pipeline = await ensurePipeline(tenantId);
  const opps = await listOpportunities(tenantId, pipeline.id);
  return { pipeline, opps };
}

export async function createOppAction(tenantId: string, pipelineId: string, o: { name: string; value?: number; stage: string }): Promise<Opportunity[]> {
  await createOpportunity(tenantId, pipelineId, o);
  return listOpportunities(tenantId, pipelineId);
}

export async function moveOppAction(tenantId: string, pipelineId: string, id: string, stage: string): Promise<Opportunity[]> {
  await moveOpportunity(tenantId, id, stage);
  return listOpportunities(tenantId, pipelineId);
}

export async function deleteOppAction(tenantId: string, pipelineId: string, id: string): Promise<Opportunity[]> {
  await deleteOpportunity(tenantId, id);
  return listOpportunities(tenantId, pipelineId);
}
