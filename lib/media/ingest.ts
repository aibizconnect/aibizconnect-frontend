/**
 * Media ingestion (architect D-132). Download an external image URL into the TENANT's Media
 * Library so build images are tenant-owned, durable (no hotlink rot), and reusable in the
 * editor picker. Idempotent via a deterministic, URL-hashed storage_path — re-running a build
 * never re-downloads the same image.
 *
 * NOTE: Media Storage is normally LOCKED; this module was added under a scoped unlock from Ali
 * specifically for build-time image ingestion. Server-only.
 */

import { createHash } from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { putObject } from "@/lib/media/storage";

export interface IngestOptions {
  websiteId?: string | null;
  folderId?: string | null;
  /** stored on the row's tags for provenance. */
  sourceType?: "external_url" | "stock_image" | "ai_generated";
}

export interface IngestedMedia { id: string; url: string; storagePath: string; isNew: boolean }

const MAX_BYTES = 8 * 1024 * 1024; // 8MB hard cap
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp",
  "image/gif": "gif", "image/avif": "avif", "image/svg+xml": "svg",
};

/** True for URLs we should NOT ingest (already-local, data URIs, blanks). */
function skippable(url: string): boolean {
  if (!url || typeof url !== "string") return true;
  if (url.startsWith("data:") || url.startsWith("blob:")) return true;
  if (!/^https?:\/\//i.test(url)) return true; // relative/local already
  return false;
}

/**
 * Ingest one external image URL into the tenant's Media Library. Returns the stored media row
 * (or null on any failure — caller keeps the original URL). Deduplicates by hashed storage_path.
 */
export async function ingestExternalImage(
  tenantId: string,
  srcUrl: string,
  options: IngestOptions = {},
): Promise<IngestedMedia | null> {
  if (skippable(srcUrl)) return null;
  const supabase = createSupabaseServiceClient();
  const hash = createHash("sha256").update(srcUrl).digest("hex").slice(0, 32);

  try {
    // Fetch first so we can key the extension off the real content-type.
    const res = await fetch(srcUrl, { redirect: "follow", signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const mime = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!mime.startsWith("image/")) return null;
    const ext = EXT_BY_MIME[mime] || "jpg";
    const storagePath = `${tenantId}/uploads/imported/${hash}.${ext}`;

    // Dedup: tenant-scoped storage_path is deterministic per source URL.
    const { data: existing } = await supabase
      .from("website_media").select("id, url, storage_path")
      .eq("tenant_id", tenantId).eq("storage_path", storagePath).maybeSingle();
    if (existing?.id) return { id: existing.id, url: existing.url, storagePath, isNew: false };

    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_BYTES) return null;

    const up = await putObject(storagePath, buf, mime);
    if (!up.ok || !up.publicUrl) return null;

    const tags = ["imported", options.sourceType || "external_url"];
    const { data: row } = await supabase.from("website_media").insert({
      tenant_id: tenantId,
      url: up.publicUrl,
      storage_path: storagePath,
      filename: `Imported ${hash.slice(0, 8)}.${ext}`,
      mime_type: mime,
      size_bytes: buf.length,
      tags,
      ...(options.websiteId ? { website_id: options.websiteId } : {}),
      ...(options.folderId ? { folder_id: options.folderId } : {}),
    }).select("id, url").single();
    if (!row?.id) return null;
    return { id: row.id, url: row.url, storagePath, isNew: true };
  } catch {
    return null;
  }
}
