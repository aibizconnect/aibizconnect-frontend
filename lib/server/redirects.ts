import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * URL REDIRECTS (D-347). Tenant-scoped path → URL redirects, resolved by the public site
 * catch-all when no page matches. Storage: tenant_url_redirects (0067). Missing-table → no-op.
 */

export interface UrlRedirect {
  id: string; fromPath: string; toUrl: string; code: number; hits: number; lastHitAt: string | null; createdAt: string;
}

const svc = () => createSupabaseServiceClient();
export function normalizePath(p: string): string {
  return (p || "").trim().replace(/^https?:\/\/[^/]+/i, "").replace(/^\/+|\/+$/g, "").toLowerCase();
}
const rowTo = (r: any): UrlRedirect => ({ id: r.id, fromPath: r.from_path, toUrl: r.to_url, code: r.code ?? 301, hits: r.hits ?? 0, lastHitAt: r.last_hit_at ?? null, createdAt: r.created_at });

export async function listRedirects(tenantId: string): Promise<UrlRedirect[]> {
  const { data, error } = await svc().from("tenant_url_redirects").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map(rowTo);
}

export async function createRedirect(tenantId: string, input: { fromPath: string; toUrl: string; code?: number }): Promise<{ ok: boolean; error?: string }> {
  const from_path = normalizePath(input.fromPath);
  const to_url = input.toUrl.trim();
  if (!from_path) return { ok: false, error: "Enter the path to redirect from (e.g. old-page)." };
  if (!/^https?:\/\//i.test(to_url) && !to_url.startsWith("/")) return { ok: false, error: "Destination must be a full URL or an absolute path (/…)." };
  const code = input.code === 302 ? 302 : 301;
  const { error } = await svc().from("tenant_url_redirects").insert({ tenant_id: tenantId, from_path, to_url, code });
  if (error) return { ok: false, error: /duplicate key/i.test(error.message) ? "A redirect for that path already exists." : error.message };
  return { ok: true };
}

export async function updateRedirect(tenantId: string, id: string, patch: { fromPath?: string; toUrl?: string; code?: number }): Promise<{ ok: boolean; error?: string }> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.fromPath !== undefined) row.from_path = normalizePath(patch.fromPath);
  if (patch.toUrl !== undefined) row.to_url = patch.toUrl.trim();
  if (patch.code !== undefined) row.code = patch.code === 302 ? 302 : 301;
  const { error } = await svc().from("tenant_url_redirects").update(row).eq("tenant_id", tenantId).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteRedirect(tenantId: string, id: string): Promise<void> {
  await svc().from("tenant_url_redirects").delete().eq("tenant_id", tenantId).eq("id", id);
}

/** Resolve a path to its destination (public site catch-all). Increments the hit counter best-effort. */
export async function resolveRedirect(tenantId: string, path: string): Promise<{ toUrl: string; code: number } | null> {
  const from_path = normalizePath(path);
  if (!from_path) return null;
  const sb = svc();
  const { data, error } = await sb.from("tenant_url_redirects").select("id, to_url, code, hits").eq("tenant_id", tenantId).eq("from_path", from_path).maybeSingle();
  if (error || !data) return null;
  try { await sb.from("tenant_url_redirects").update({ hits: (data.hits ?? 0) + 1, last_hit_at: new Date().toISOString() }).eq("id", data.id); } catch { /* best-effort */ }
  return { toUrl: data.to_url, code: data.code ?? 301 };
}
