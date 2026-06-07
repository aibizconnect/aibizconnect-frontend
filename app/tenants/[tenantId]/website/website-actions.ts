"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Website entity actions (Copilot ruling: "website" is first-class — a tenant is a
 * container of multiple websites). These are written to be NON-BREAKING before the
 * 0016_websites migration is applied: if the `websites` table doesn't exist yet, we
 * return a synthetic single "Main Website" (id = tenantId) so the Sites hub + editor
 * routing work today; once the table exists, real rows are used.
 */

export interface Website {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  subdomain?: string | null;   // reserved free address label → {subdomain}.aibizconnect.app
  primary_domain: string | null;
  is_primary: boolean;
  created_at?: string;
  synthetic?: boolean; // true = table not migrated yet; this is a stand-in
}

function syntheticPrimary(tenantId: string): Website {
  return { id: tenantId, tenant_id: tenantId, name: "Main Website", slug: "main", subdomain: null, primary_domain: null, is_primary: true, synthetic: true };
}

/** List a tenant's websites (newest primary first). Falls back to a synthetic one. */
export async function listWebsites(tenantId: string): Promise<Website[]> {
  try {
    const supabase = createSupabaseServiceClient();
    // subdomain exists post-0026; if the column is absent the select errors → retry without it.
    let res: { data: any; error: any } = await supabase
      .from("websites")
      .select("id, tenant_id, name, slug, subdomain, primary_domain, is_primary, created_at")
      .eq("tenant_id", tenantId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });
    if (res.error) {
      res = await supabase
        .from("websites")
        .select("id, tenant_id, name, slug, primary_domain, is_primary, created_at")
        .eq("tenant_id", tenantId)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });
    }
    if (res.error) return [syntheticPrimary(tenantId)];       // table not migrated yet
    if (!res.data || res.data.length === 0) return [syntheticPrimary(tenantId)]; // none yet
    return res.data as Website[];
  } catch {
    return [syntheticPrimary(tenantId)];
  }
}

/** The tenant's primary website (or the synthetic default). */
export async function getPrimaryWebsite(tenantId: string): Promise<Website> {
  const list = await listWebsites(tenantId);
  return list.find((w) => w.is_primary) ?? list[0] ?? syntheticPrimary(tenantId);
}

/** Create a new website for a tenant. No-op-safe if the table isn't migrated. */
export async function createWebsite(tenantId: string, name: string): Promise<Website> {
  const clean = (name || "").trim() || "New Website";
  const slug = clean.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "site";
  const supabase = createSupabaseServiceClient();
  const { count } = await supabase.from("websites").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
  const { data, error } = await supabase
    .from("websites")
    .insert({ tenant_id: tenantId, name: clean, slug, is_primary: (count ?? 0) === 0 })
    .select("id, tenant_id, name, slug, primary_domain, is_primary, created_at")
    .single();
  if (error) throw new Error(error.message.includes("websites") ? "Apply the 0016_websites migration first to create additional websites." : error.message);
  return data as Website;
}

/** Rename a website. No-op-safe if the table isn't migrated. */
export async function renameWebsite(tenantId: string, websiteId: string, name: string): Promise<{ ok: boolean; error?: string }> {
  const clean = (name || "").trim();
  if (!clean) return { ok: false, error: "Name is required." };
  try {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from("websites").update({ name: clean }).eq("tenant_id", tenantId).eq("id", websiteId);
    return { ok: !error, error: error?.message };
  } catch (e: any) { return { ok: false, error: e?.message }; }
}

/** Set (or clear) a website's primary domain. Store-only until DNS is provisioned. */
export async function setWebsiteDomain(tenantId: string, websiteId: string, domain: string | null): Promise<{ ok: boolean; error?: string }> {
  const value = (domain || "").trim() || null;
  try {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from("websites").update({ primary_domain: value }).eq("tenant_id", tenantId).eq("id", websiteId);
    return { ok: !error, error: error?.message };
  } catch (e: any) { return { ok: false, error: e?.message }; }
}

/**
 * Make one website the tenant's PRIMARY (demotes the others). The primary is the
 * default site shown first and the one that survives a "delete the other" flow.
 */
export async function setPrimaryWebsite(tenantId: string, websiteId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = createSupabaseServiceClient();
    await supabase.from("websites").update({ is_primary: false }).eq("tenant_id", tenantId).neq("id", websiteId);
    const { error } = await supabase.from("websites").update({ is_primary: true }).eq("tenant_id", tenantId).eq("id", websiteId);
    return { ok: !error, error: error?.message };
  } catch (e: any) { return { ok: false, error: e?.message }; }
}

/** Permanently delete a website + its pages. Refuses to delete the LAST website so the
 *  tenant always has at least one. If the deleted site was primary, promotes another to
 *  primary so the tenant always has exactly one. Tenant-triggered (UI type-to-confirm). */
export async function deleteWebsite(tenantId: string, websiteId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = createSupabaseServiceClient();
    const { data: rows } = await supabase.from("websites").select("id, is_primary").eq("tenant_id", tenantId);
    if (!rows || rows.length <= 1) return { ok: false, error: "You can't delete your only website. Create another first." };
    const wasPrimary = rows.find((r: any) => r.id === websiteId)?.is_primary;
    // Remove the website's pages, then the website row (scoped to the tenant).
    await supabase.from("website_pages").delete().eq("tenant_id", tenantId).eq("website_id", websiteId);
    await supabase.from("domains").delete().eq("tenant_id", tenantId).eq("website_id", websiteId);
    const { error } = await supabase.from("websites").delete().eq("tenant_id", tenantId).eq("id", websiteId);
    if (error) return { ok: false, error: error.message };
    // If we deleted the primary, promote the oldest remaining site to primary.
    if (wasPrimary) {
      const next = rows.find((r: any) => r.id !== websiteId);
      if (next) await setPrimaryWebsite(tenantId, next.id);
    }
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e?.message }; }
}

/** Ensure the tenant has at least one website; returns the primary. */
export async function ensureDefaultWebsite(tenantId: string, tenantName = "Main Website"): Promise<Website> {
  const list = await listWebsites(tenantId);
  if (list.length && !list[0].synthetic) return list.find((w) => w.is_primary) ?? list[0];
  try {
    return await createWebsite(tenantId, tenantName);
  } catch {
    return syntheticPrimary(tenantId); // table not migrated — keep working
  }
}
