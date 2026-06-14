"use server";

import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { listRedirects, createRedirect, updateRedirect, deleteRedirect, type UrlRedirect } from "@/lib/server/redirects";

/** URL Redirects admin actions (D-347). Auth-gated. */

export async function listRedirectsAction(tenantId: string): Promise<UrlRedirect[]> {
  await requireTenantAccess(tenantId);
  try { return await listRedirects(tenantId); } catch { return []; }
}
export async function saveRedirectAction(tenantId: string, input: { id?: string; fromPath: string; toUrl: string; code: number }): Promise<{ ok: boolean; error?: string; redirects: UrlRedirect[] }> {
  await requireTenantAccess(tenantId);
  const r = input.id
    ? await updateRedirect(tenantId, input.id, { fromPath: input.fromPath, toUrl: input.toUrl, code: input.code })
    : await createRedirect(tenantId, { fromPath: input.fromPath, toUrl: input.toUrl, code: input.code });
  return { ok: r.ok, error: r.error, redirects: await listRedirects(tenantId) };
}
export async function deleteRedirectAction(tenantId: string, id: string): Promise<UrlRedirect[]> {
  await requireTenantAccess(tenantId);
  await deleteRedirect(tenantId, id);
  return listRedirects(tenantId);
}
