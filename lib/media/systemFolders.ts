/**
 * System folder tree wiring (Copilot Media plan — foldering step).
 *
 * The generated System starter packs live under the reserved SYSTEM tenant. This module
 * creates the nested media_folders tree from each preset's `targetFolder` path (idempotent)
 * and files the generated website_media rows into the matching leaf folder.
 *
 * Path model (per 0023): a file references exactly ONE folder via website_media.folder_id;
 * the human path is DERIVED from the parent chain, never stored. So "/System/Free Images/
 * Icons/Minimal Line" becomes 4 nested media_folders rows under SYSTEM_TENANT_ID.
 *
 * All writes use the service role (SYSTEM tenant is service-owned). Safe to re-run.
 */
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { SYSTEM_TENANT_ID } from "@/lib/media/system";
import { STARTER_PRESETS, getPresetById, type AiGenPreset } from "@/config/aiPresets";

type Supa = ReturnType<typeof createSupabaseServiceClient>;

/** Split "/System/Free Images/Icons/Minimal Line" → ["System","Free Images","Icons","Minimal Line"]. */
function pathSegments(targetFolder: string): string[] {
  return targetFolder.split("/").map((s) => s.trim()).filter(Boolean);
}

/**
 * Ensure every folder in `segments` exists as a nested chain under `tenantId`, returning
 * the leaf folder id. Matches existing folders by (tenant_id, name, parent_id) so it never
 * duplicates on re-run.
 */
async function ensureFolderPath(supabase: Supa, tenantId: string, segments: string[]): Promise<string | null> {
  let parentId: string | null = null;
  for (const name of segments) {
    // Find an existing folder with this name at this level.
    let q = supabase.from("media_folders").select("id").eq("tenant_id", tenantId).eq("name", name);
    q = parentId === null ? q.is("parent_id", null) : q.eq("parent_id", parentId);
    const { data: found, error: findErr } = await q.maybeSingle();
    if (findErr) throw new Error(findErr.message);
    if (found?.id) { parentId = found.id; continue; }
    // Create it.
    const { data: created, error: insErr } = await supabase
      .from("media_folders")
      .insert({ tenant_id: tenantId, name, parent_id: parentId })
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);
    parentId = created!.id;
  }
  return parentId;
}

/** Ensure an arbitrary "/System/.../..." folder path exists under SYSTEM; returns leaf id. */
export async function ensureSystemFolderPath(folderPath: string): Promise<string | null> {
  const supabase = createSupabaseServiceClient();
  return ensureFolderPath(supabase, SYSTEM_TENANT_ID, pathSegments(folderPath));
}

/** Ensure the System folder tree for every preset exists. Returns presetId → leaf folderId. */
export async function ensureAllSystemFolders(): Promise<Record<string, string>> {
  const supabase = createSupabaseServiceClient();
  const map: Record<string, string> = {};
  for (const preset of STARTER_PRESETS) {
    const leaf = await ensureFolderPath(supabase, SYSTEM_TENANT_ID, pathSegments(preset.targetFolder));
    if (leaf) map[preset.id] = leaf;
  }
  return map;
}

/** Ensure a single preset's folder exists and file the given media ids into it. */
export async function assignPresetFolder(preset: AiGenPreset, mediaIds: string[]): Promise<void> {
  if (!mediaIds.length) return;
  const supabase = createSupabaseServiceClient();
  const leaf = await ensureFolderPath(supabase, SYSTEM_TENANT_ID, pathSegments(preset.targetFolder));
  if (!leaf) return;
  await supabase
    .from("website_media")
    .update({ folder_id: leaf })
    .eq("tenant_id", SYSTEM_TENANT_ID)
    .in("id", mediaIds);
}

/**
 * One-time backfill: file already-generated SYSTEM media into their preset folders by
 * matching the filename prefix (generation names rows `${preset.label} N.ext`). Only touches
 * rows that aren't filed yet (folder_id is null). Returns per-preset counts.
 */
export async function backfillSystemMediaFolders(): Promise<{ presetId: string; folderId: string; assigned: number; label: string }[]> {
  const supabase = createSupabaseServiceClient();
  const out: { presetId: string; folderId: string; assigned: number; label: string }[] = [];
  for (const preset of STARTER_PRESETS) {
    const leaf = await ensureFolderPath(supabase, SYSTEM_TENANT_ID, pathSegments(preset.targetFolder));
    if (!leaf) continue;
    // Match unfiled rows whose filename starts with this preset's label.
    const { data, error } = await supabase
      .from("website_media")
      .select("id")
      .eq("tenant_id", SYSTEM_TENANT_ID)
      .is("folder_id", null)
      .ilike("filename", `${preset.label} %`);
    if (error) throw new Error(error.message);
    const ids = (data ?? []).map((r: { id: string }) => r.id);
    if (ids.length) {
      const { error: upErr } = await supabase.from("website_media").update({ folder_id: leaf }).in("id", ids);
      if (upErr) throw new Error(upErr.message);
    }
    out.push({ presetId: preset.id, folderId: leaf, assigned: ids.length, label: preset.label });
  }
  return out;
}

/** Convenience: ensure folders + backfill in one call (used by the admin endpoint). */
export async function wireSystemFolders() {
  await ensureAllSystemFolders();
  const backfill = await backfillSystemMediaFolders();
  return { backfill, totalAssigned: backfill.reduce((n, b) => n + b.assigned, 0) };
}

void getPresetById; // (kept for callers that resolve a preset by id)
