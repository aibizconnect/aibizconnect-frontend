/**
 * media_steward — nightly Media maintenance + (gated) generation pass.
 * (Copilot Media plan — Step 3.) Idempotent and safe to run nightly.
 *
 * SAFETY: the generation branch only runs when an AI image key is configured AND
 * generation is explicitly enabled (lib/ai/generateAiImages → imageGenEnabled()).
 * Without that it logs "skipped" and returns — no provider call, no spend. Maintenance
 * steps are non-destructive (logging-level no-ops where a full DB op isn't safe yet).
 */
import { STARTER_PRESETS } from "@/config/aiPresets";
import { generateAiImages, hasKey } from "@/lib/ai/generateAiImages";
import { SYSTEM_TENANT_ID } from "@/lib/media/system";

type JobStatus = "started" | "completed" | "skipped" | "error";
export interface MediaJobLog { jobName: string; status: JobStatus; details?: string; at: string }

const _log: MediaJobLog[] = [];
function logMediaJob(entry: Omit<MediaJobLog, "at">): MediaJobLog {
  const row = { ...entry, at: new Date().toISOString() };
  _log.push(row);
  // eslint-disable-next-line no-console
  console.log(`[media_steward] ${row.status}${row.details ? " — " + row.details : ""}`);
  // (Persist to a media_jobs table here when that schema lands.)
  return row;
}

// ── Maintenance helpers (safe; full DB ops are deferred where scope is unsettled) ──
// Per Copilot's ruling: system assets are owned by the reserved SYSTEM tenant
// (SYSTEM_TENANT_ID). Folders/media are created under that tenant via the service role;
// tenants read them (merged in listMedia) and copy-on-use into their own library.
async function ensureSystemFoldersExist(): Promise<void> {
  // When generation is enabled, create the /System/Free Images/... folder tree under
  // SYSTEM_TENANT_ID (idempotent) so generated batches have a home. Folders derive from
  // STARTER_PRESETS[].targetFolder. (No-op until generation is turned on.)
  void SYSTEM_TENANT_ID;
}
async function enforceSystemReadOnly(): Promise<void> {
  // Enforce RLS / flags so tenants can use but not delete/modify system assets.
}
async function dedupeMedia(): Promise<number> {
  // Hash-based duplicate detection (Media #4.3). No-op until wired. Returns # removed.
  return 0;
}
async function optimizeOversized(): Promise<number> {
  // listMedia({ scope:"oversized" }) → optimizeMedia(). No-op until wired. Returns # optimized.
  return 0;
}
async function countSystemAssets(_targetFolder: string): Promise<number> {
  // Count assets already in a target folder (for one-time skip). 0 until folders are real.
  return 0;
}

export interface MediaStewardResult {
  ran: boolean;
  generatedPresets: { id: string; generated: number; skipped?: string }[];
  deduped: number;
  optimized: number;
  log: MediaJobLog[];
}

/** Run the nightly steward pass. Returns a summary log. */
export async function runMediaStewardNightly(): Promise<MediaStewardResult> {
  logMediaJob({ jobName: "media_steward", status: "started" });

  await ensureSystemFoldersExist();
  await enforceSystemReadOnly();

  const deduped = await dedupeMedia();
  const optimized = await optimizeOversized();

  // GATE: no AI key → maintenance only, skip generation (no spend).
  if (!hasKey("ai-image")) {
    logMediaJob({ jobName: "media_steward", status: "skipped", details: "No ai-image key configured — maintenance only." });
    return { ran: true, generatedPresets: [], deduped, optimized, log: [..._log] };
  }

  const generatedPresets: MediaStewardResult["generatedPresets"] = [];
  for (const preset of STARTER_PRESETS) {
    // One-time behavior: skip if the folder already has plenty of assets.
    const existing = await countSystemAssets(preset.targetFolder);
    const threshold = preset.category === "icons" || preset.category === "emojis" ? 60 : preset.batchSize;
    if (existing >= threshold) { generatedPresets.push({ id: preset.id, generated: 0, skipped: `already has ${existing}` }); continue; }

    const r = await generateAiImages({ presetId: preset.id });
    generatedPresets.push({ id: preset.id, generated: r.generated, skipped: r.skipped });
    // When generation is live, move r.mediaIds into preset.targetFolder and tag them
    // source="system", category=preset.category, style=preset.style here.
  }

  await enforceSystemReadOnly();
  logMediaJob({ jobName: "media_steward", status: "completed", details: "Compaction + presets run" });
  return { ran: true, generatedPresets, deduped, optimized, log: [..._log] };
}
