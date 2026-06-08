"use server";

import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { putObject } from "@/lib/media/storage";
import { optimizeImage } from "@/lib/media/optimize";
import {
  buildCanvaAuthUrl, canvaConnection, disconnectCanva, listCanvaDesigns, exportCanvaDesign,
  canvaReady, type CanvaDesign,
} from "@/lib/server/canva";
import crypto from "node:crypto";

export async function getCanvaConnectUrl(tenantId: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  await requireTenantAccess(tenantId);
  return buildCanvaAuthUrl(tenantId);
}

export async function getCanvaStatus(tenantId: string): Promise<{ ready: boolean; connected: boolean; name: string | null }> {
  await requireTenantAccess(tenantId);
  const [ready, conn] = await Promise.all([canvaReady(), canvaConnection(tenantId)]);
  return { ready, connected: !!conn, name: conn?.name ?? null };
}

export async function disconnectCanvaAction(tenantId: string): Promise<{ ok: boolean }> {
  await requireTenantAccess(tenantId);
  await disconnectCanva(tenantId);
  return { ok: true };
}

export async function listTenantCanvaDesigns(tenantId: string, opts?: { continuation?: string; query?: string }): Promise<{ ok: boolean; designs: CanvaDesign[]; continuation?: string; error?: string }> {
  await requireTenantAccess(tenantId);
  return listCanvaDesigns(tenantId, opts);
}

/** Export selected Canva designs to PNG and import them into the tenant's Media Library (→ R2). */
export async function importCanvaDesigns(
  tenantId: string,
  designs: { id: string; title?: string }[],
  opts?: { folderId?: string | null }
): Promise<{ ok: boolean; imported: number; errors: string[] }> {
  await requireTenantAccess(tenantId);
  const supabase = createSupabaseServiceClient();
  const errors: string[] = [];
  let imported = 0;
  for (const d of (designs || []).slice(0, 20)) {
    try {
      const urls = await exportCanvaDesign(tenantId, d.id);
      if (!urls.length) { errors.push(`${d.title || d.id}: export failed/timed out`); continue; }
      let page = 0;
      for (const u of urls) {
        page++;
        const res = await fetch(u);
        if (!res.ok) { errors.push(`${d.title || d.id} p${page}: download ${res.status}`); continue; }
        const buf = Buffer.from(await res.arrayBuffer());
        const name = `${(d.title || "Canva design").slice(0, 60)}${urls.length > 1 ? ` (${page})` : ""}.png`;
        const opt = await optimizeImage(buf, "image/png", name);
        const storagePath = `${tenantId}/canva/${crypto.randomUUID()}.${opt.ext}`;
        const put = await putObject(storagePath, opt.buf, opt.mime);
        if (!put.ok) { errors.push(`${name}: ${put.error}`); continue; }
        const row: Record<string, any> = { tenant_id: tenantId, url: put.publicUrl, storage_path: storagePath, filename: name, mime_type: opt.mime, size_bytes: opt.buf.length };
        if (opts?.folderId) row.folder_id = opts.folderId;
        const { error } = await supabase.from("website_media").insert(row);
        if (error) {
          // folder_id column may not exist pre-migration → retry without it.
          if (row.folder_id) { delete row.folder_id; const r2 = await supabase.from("website_media").insert(row); if (r2.error) { errors.push(`${name}: ${r2.error.message}`); continue; } }
          else { errors.push(`${name}: ${error.message}`); continue; }
        }
        imported++;
      }
    } catch (e: any) { errors.push(`${d.id}: ${e?.message ?? "failed"}`); }
  }
  return { ok: imported > 0 || designs.length === 0, imported, errors };
}
