"use server";

import { runTool, getToolProfile, saveToolProfile, saveRun, listRuns, deleteRun, type RunResult, type SavedRun } from "@/lib/tools/run";
import type { ToolProfile } from "@/lib/tools/registry";

export async function runToolAction(tenantId: string, toolKey: string, inputs: Record<string, string>): Promise<RunResult> {
  return runTool({ tenantId, toolKey, inputs });
}

export async function loadProfileAction(tenantId: string): Promise<ToolProfile> {
  return getToolProfile(tenantId);
}

export async function saveProfileAction(tenantId: string, p: ToolProfile): Promise<{ ok: boolean; error?: string }> {
  return saveToolProfile(tenantId, p);
}

export async function saveRunAction(tenantId: string, toolKey: string, inputs: Record<string, string>, output: string): Promise<{ ok: boolean; error?: string }> {
  return saveRun(tenantId, toolKey, inputs, output);
}

export async function listRunsAction(tenantId: string, toolKey?: string): Promise<SavedRun[]> {
  return listRuns(tenantId, toolKey);
}

export async function deleteRunAction(tenantId: string, id: string, toolKey?: string): Promise<SavedRun[]> {
  await deleteRun(tenantId, id);
  return listRuns(tenantId, toolKey);
}
