import { randomBytes } from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Trigger Links (D-319) — trackable short links. A tenant link redirects (302) to a URL, counts
 * clicks, and (when ?c=<contactId> is present) applies tags to the clicking contact. SERVER-ONLY.
 * Slug is globally unique so /l/<slug> resolves without a tenant prefix. Graceful missing-table
 * degradation until migration 0060 is applied.
 */

export interface TriggerLink {
  id: string; name: string; slug: string; redirectUrl: string; tagsToAdd: string[];
  clicks: number; lastClickedAt: string | null; createdAt: string;
}
const svc = () => createSupabaseServiceClient();
const newSlug = () => randomBytes(6).toString("base64url").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || randomBytes(6).toString("hex").slice(0, 8);

function rowTo(r: any): TriggerLink {
  return { id: r.id, name: r.name ?? "", slug: r.slug, redirectUrl: r.redirect_url ?? "", tagsToAdd: Array.isArray(r.tags_to_add) ? r.tags_to_add : [], clicks: r.clicks ?? 0, lastClickedAt: r.last_clicked_at ?? null, createdAt: r.created_at };
}

export async function listTriggerLinks(tenantId: string): Promise<TriggerLink[]> {
  const { data, error } = await svc().from("tenant_trigger_links").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(rowTo);
}
export async function createTriggerLink(tenantId: string, input: { name: string; redirectUrl: string; tagsToAdd?: string[] }): Promise<{ ok: boolean; id?: string; error?: string }> {
  const sb = svc();
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await sb.from("tenant_trigger_links").insert({
      tenant_id: tenantId, name: input.name || "Untitled link", slug: newSlug(),
      redirect_url: input.redirectUrl, tags_to_add: input.tagsToAdd ?? [],
    }).select("id").single();
    if (!error && data) return { ok: true, id: data.id };
    if (error && !/duplicate key|unique/i.test(error.message)) return { ok: false, error: error.message };
  }
  return { ok: false, error: "Could not allocate a unique slug." };
}
export async function updateTriggerLink(tenantId: string, id: string, patch: { name?: string; redirectUrl?: string; tagsToAdd?: string[] }): Promise<{ ok: boolean; error?: string }> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.redirectUrl !== undefined) row.redirect_url = patch.redirectUrl;
  if (patch.tagsToAdd !== undefined) row.tags_to_add = patch.tagsToAdd;
  const { error } = await svc().from("tenant_trigger_links").update(row).eq("tenant_id", tenantId).eq("id", id);
  return { ok: !error, error: error?.message };
}
export async function deleteTriggerLink(tenantId: string, id: string): Promise<void> {
  await svc().from("tenant_trigger_links").delete().eq("tenant_id", tenantId).eq("id", id);
}

/** PUBLIC: resolve a slug to its destination, record the click, and (if contactId given) apply
 *  the link's tags to that contact. Returns the redirect URL, or null if the slug is unknown. */
export async function resolveAndRecordClick(slug: string, contactId?: string | null): Promise<string | null> {
  const sb = svc();
  const { data, error } = await sb.from("tenant_trigger_links").select("*").eq("slug", slug).maybeSingle();
  if (error || !data) return null;
  const link = rowTo(data);
  await sb.from("tenant_trigger_links").update({ clicks: link.clicks + 1, last_clicked_at: new Date().toISOString() }).eq("id", link.id);
  if (contactId && link.tagsToAdd.length) {
    try {
      const { data: c } = await sb.from("tenant_contacts").select("tags").eq("tenant_id", data.tenant_id).eq("id", contactId).maybeSingle();
      const tags: string[] = Array.isArray(c?.tags) ? c.tags : [];
      const lower = new Set(tags.map((t) => String(t).toLowerCase()));
      for (const t of link.tagsToAdd) if (!lower.has(t.toLowerCase())) tags.push(t);
      await sb.from("tenant_contacts").update({ tags, updated_at: new Date().toISOString() }).eq("tenant_id", data.tenant_id).eq("id", contactId);
    } catch { /* best-effort tagging */ }
  }
  return link.redirectUrl;
}
