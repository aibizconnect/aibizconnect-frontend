import { supabase } from "@/lib/supabase";
import { AwsClient } from "aws4fetch";

/**
 * Media object storage abstraction. Routes to **Cloudflare R2** (zero egress) when configured,
 * otherwise to the Supabase `website-media` bucket (default — unchanged behaviour). All public
 * objects get a 1-year immutable cache so browsers/CDN stop re-fetching.
 *
 * To enable R2, set these env vars (and migrate existing objects with scripts/migrate-media-to-r2.mjs):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE
 *   (R2_PUBLIC_BASE = the bucket's public URL, e.g. https://media.aibizconnect.app or the r2.dev URL)
 */

const MEDIA_BUCKET = "website-media";
const CACHE = "public, max-age=31536000, immutable";

export function r2Configured(): boolean {
  return !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET && process.env.R2_PUBLIC_BASE);
}

let _r2: AwsClient | null = null;
function r2Client(): AwsClient {
  if (!_r2) _r2 = new AwsClient({ accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!, region: "auto", service: "s3" });
  return _r2;
}
function r2Url(path: string): string {
  const key = path.split("/").map(encodeURIComponent).join("/");
  return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${key}`;
}

const CT: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", svg: "image/svg+xml", avif: "image/avif", mp4: "video/mp4", webm: "video/webm", pdf: "application/pdf" };
function guessContentType(path: string): string { return CT[(path.split(".").pop() || "").toLowerCase()] || "application/octet-stream"; }

/** Public URL for a stored object (R2 public base, or Supabase public URL). */
export function publicUrlFor(path: string): string {
  if (r2Configured()) return `${process.env.R2_PUBLIC_BASE!.replace(/\/+$/, "")}/${path}`;
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

type Body = Buffer | Uint8Array | ArrayBuffer | Blob | File;

/** Upload (or overwrite) an object. Returns its public URL. */
export async function putObject(path: string, body: Body, contentType: string): Promise<{ ok: boolean; error?: string; publicUrl?: string }> {
  if (r2Configured()) {
    try {
      const res = await r2Client().fetch(r2Url(path), { method: "PUT", body: body as BodyInit, headers: { "content-type": contentType || guessContentType(path), "cache-control": CACHE } });
      if (!res.ok) return { ok: false, error: `R2 PUT ${res.status}` };
      return { ok: true, publicUrl: publicUrlFor(path) };
    } catch (e: any) { return { ok: false, error: e?.message ?? "R2 put failed" }; }
  }
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, body as any, { contentType, upsert: true, cacheControl: "31536000" });
  if (error) return { ok: false, error: error.message };
  return { ok: true, publicUrl: publicUrlFor(path) };
}

/** Copy an object within the store. */
export async function copyObject(srcPath: string, destPath: string): Promise<{ ok: boolean; error?: string; publicUrl?: string }> {
  if (r2Configured()) {
    const buf = await downloadObject(srcPath);
    if (!buf) return { ok: false, error: "source object not found" };
    return putObject(destPath, buf, guessContentType(srcPath));
  }
  const { error } = await supabase.storage.from(MEDIA_BUCKET).copy(srcPath, destPath);
  if (error) return { ok: false, error: error.message };
  return { ok: true, publicUrl: publicUrlFor(destPath) };
}

/** Delete objects (best-effort). */
export async function removeObjects(paths: string[]): Promise<void> {
  const list = paths.filter(Boolean);
  if (!list.length) return;
  if (r2Configured()) {
    await Promise.all(list.map((p) => r2Client().fetch(r2Url(p), { method: "DELETE" }).catch(() => {})));
    return;
  }
  await supabase.storage.from(MEDIA_BUCKET).remove(list);
}

/** Download an object's bytes (used when re-encoding / promoting). */
export async function downloadObject(path: string): Promise<Buffer | null> {
  if (r2Configured()) {
    try { const res = await r2Client().fetch(r2Url(path)); if (!res.ok) return null; return Buffer.from(await res.arrayBuffer()); } catch { return null; }
  }
  const dl = await supabase.storage.from(MEDIA_BUCKET).download(path);
  if (!dl.data) return null;
  return Buffer.from(await dl.data.arrayBuffer());
}
