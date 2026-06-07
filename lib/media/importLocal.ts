/**
 * Import local image files (e.g. Canva exports) into the global SYSTEM asset library.
 * Platform-admin only (the calling route enforces it). Reads files server-side, uploads
 * each to the website-media bucket under the SYSTEM tenant, files them into clean
 * /System/Backgrounds/... folders, and inserts website_media rows with searchable names.
 */
import { promises as fs } from "fs";
import path from "path";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { SYSTEM_TENANT_ID } from "@/lib/media/system";
import { ensureSystemFolderPath } from "@/lib/media/systemFolders";

/** Map a (long, descriptive) filename to a tidy { folder, label } for the System library. */
function classify(name: string): { folder: string; label: string } {
  const n = name.toLowerCase();
  if (n.includes("downtown toronto") || n.includes("toronto")) {
    let sub = "Skyline";
    if (n.includes("aerial")) sub = "Aerial";
    else if (n.includes("night")) sub = "Night";
    else if (n.includes("waterfront")) sub = "Waterfront";
    else if (n.includes("sunset")) sub = "Sunset";
    return { folder: `/System/Backgrounds/Toronto/${sub}`, label: `Downtown Toronto ${sub.toLowerCase()}` };
  }
  if (n.includes("watercolor")) return { folder: "/System/Backgrounds/Watercolor", label: "Watercolor pattern background" };
  if (n.includes("clean white background wallpaper")) return { folder: "/System/Backgrounds/Watercolor", label: "Soft watercolor wallpaper" };
  if (n.includes("geometric pattern")) {
    const tone = /baby blue|pale blue|light blue/.test(n) ? "blue"
      : /grey|gray/.test(n) ? "grey"
      : /green/.test(n) ? "green" : "neutral";
    return { folder: "/System/Backgrounds/Geometric", label: `Geometric pattern ${tone}` };
  }
  if (n.includes("it business")) return { folder: "/System/Backgrounds/IT & Tech", label: "IT business background" };
  if (n.includes("real estate business")) return { folder: "/System/Backgrounds/Real Estate", label: "Real estate background" };
  if (n.includes("minimalist website") || n.includes("website background pattern")) {
    return { folder: "/System/Backgrounds/Patterns", label: "Minimalist web pattern" };
  }
  return { folder: "/System/Backgrounds/Misc", label: "Background" };
}

export interface ImportLocalResult {
  imported: number;
  skipped: number;
  items: { file: string; name: string; folder: string }[];
  errors: { file: string; error: string }[];
}

export async function importLocalBackgrounds(dir: string): Promise<ImportLocalResult> {
  const supabase = createSupabaseServiceClient();
  const entries = (await fs.readdir(dir)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
  const folderIdCache = new Map<string, string>();
  const counters = new Map<string, number>();
  const items: ImportLocalResult["items"] = [];
  const errors: ImportLocalResult["errors"] = [];
  const base = Date.now();

  for (let i = 0; i < entries.length; i++) {
    const f = entries[i];
    try {
      const { folder, label } = classify(f);
      let leaf = folderIdCache.get(folder) ?? null;
      if (!leaf) { leaf = await ensureSystemFolderPath(folder); if (leaf) folderIdCache.set(folder, leaf); }

      const buf = await fs.readFile(path.join(dir, f));
      const ext = (f.split(".").pop() || "jpg").toLowerCase();
      const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
      const idx = (counters.get(label) ?? 0) + 1; counters.set(label, idx);
      const storagePath = `${SYSTEM_TENANT_ID}/uploads/system-bg/${base}-${i}.${ext}`;

      const up = await supabase.storage.from("website-media").upload(storagePath, buf, { contentType: mime, upsert: true });
      if (up.error) { errors.push({ file: f, error: up.error.message }); continue; }
      const { data: pub } = supabase.storage.from("website-media").getPublicUrl(storagePath);
      const filename = `${label} ${idx}.${ext}`;
      const { error: rowErr } = await supabase.from("website_media").insert({
        tenant_id: SYSTEM_TENANT_ID, url: pub.publicUrl, storage_path: storagePath,
        filename, mime_type: mime, size_bytes: buf.length, folder_id: leaf,
      });
      if (rowErr) { errors.push({ file: f, error: rowErr.message }); continue; }
      items.push({ file: f, name: filename, folder });
    } catch (e: any) {
      errors.push({ file: f, error: e?.message ?? String(e) });
    }
  }
  return { imported: items.length, skipped: errors.length, items, errors };
}
