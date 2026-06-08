"use server";

import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { putObject } from "@/lib/media/storage";
import { optimizeImage } from "@/lib/media/optimize";
import {
  buildDriveAuthUrl, driveConnection, disconnectDrive, listDriveImages, downloadDriveFile,
  driveReady, type DriveImage,
} from "@/lib/server/google-drive";
import crypto from "node:crypto";

/** OAuth URL to connect THIS tenant's Google Drive. */
export async function getDriveConnectUrl(tenantId: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  await requireTenantAccess(tenantId);
  return buildDriveAuthUrl(tenantId);
}

export async function getDriveStatus(tenantId: string): Promise<{ ready: boolean; connected: boolean; email: string | null }> {
  await requireTenantAccess(tenantId);
  const [ready, conn] = await Promise.all([driveReady(), driveConnection(tenantId)]);
  return { ready, connected: !!conn, email: conn?.email ?? null };
}

export async function disconnectDriveAction(tenantId: string): Promise<{ ok: boolean }> {
  await requireTenantAccess(tenantId);
  await disconnectDrive(tenantId);
  return { ok: true };
}

export async function listTenantDriveImages(tenantId: string, opts?: { pageToken?: string; query?: string }): Promise<{ ok: boolean; files: DriveImage[]; nextPageToken?: string; error?: string }> {
  await requireTenantAccess(tenantId);
  return listDriveImages(tenantId, opts);
}

/** Import selected Drive files into the tenant's Media Library (optimized → R2). */
export async function importDriveImages(
  tenantId: string,
  fileIds: string[],
  opts?: { folderId?: string | null; websiteId?: string | null }
): Promise<{ ok: boolean; imported: number; errors: string[] }> {
  await requireTenantAccess(tenantId);
  const supabase = createSupabaseServiceClient();
  const errors: string[] = [];
  let imported = 0;
  for (const id of (fileIds || []).slice(0, 50)) {
    try {
      const dl = await downloadDriveFile(tenantId, id);
      if (!dl || !dl.mime.startsWith("image/")) { errors.push(`${id}: not an image`); continue; }
      const opt = await optimizeImage(dl.buf, dl.mime, dl.name);
      const storagePath = `${tenantId}/drive/${crypto.randomUUID()}.${opt.ext}`;
      const put = await putObject(storagePath, opt.buf, opt.mime);
      if (!put.ok) { errors.push(`${dl.name}: ${put.error}`); continue; }
      const row: Record<string, any> = {
        tenant_id: tenantId, url: put.publicUrl, storage_path: storagePath,
        filename: dl.name, mime_type: opt.mime, size_bytes: opt.buf.length,
      };
      const { data, error } = await supabase.from("website_media").insert(row).select("id").single();
      if (error || !data) { errors.push(`${dl.name}: ${error?.message ?? "insert failed"}`); continue; }
      // Best-effort folder/website tagging (columns may not exist pre-migration).
      const patch: Record<string, any> = {};
      if (opts?.folderId) patch.folder_id = opts.folderId;
      if (opts?.websiteId) patch.website_id = opts.websiteId;
      if (Object.keys(patch).length) { try { await supabase.from("website_media").update(patch).eq("id", data.id); } catch { /* ignore */ } }
      imported++;
    } catch (e: any) { errors.push(`${id}: ${e?.message ?? "failed"}`); }
  }
  return { ok: imported > 0 || fileIds.length === 0, imported, errors };
}
