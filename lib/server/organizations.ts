import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Franchise ORGANIZATIONS (D-283 — D-260 Phase C). A franchise/multi-location business
 * is an organization whose LOCATIONS are each their own tenant (keeping per-location data
 * isolation + clean RLS — the rejected alternative was a location_id column inside one
 * tenant). HQ gets a location switcher + roll-up counts. Graceful before 0056: when the
 * organizations table / organization_id column are absent, everything returns empty.
 */

export interface OrgLocation { tenantId: string; name: string; label: string | null; slug: string | null }
export interface OrgSummary { id: string; name: string; locations: OrgLocation[] }
export interface OrgRollup { locations: number; contacts: number; websites: number; appointments: number }

const svc = () => createSupabaseServiceClient();
const missing = (msg?: string) => /relation .* does not exist|column .* does not exist|could not find/i.test(msg ?? "");

/** The organization a tenant belongs to (with all sibling locations), or null. */
export async function getOrgForTenant(tenantId: string): Promise<OrgSummary | null> {
  const sb = svc();
  const t = await sb.from("tenants").select("organization_id").eq("id", tenantId).maybeSingle();
  if (t.error || !(t.data as any)?.organization_id) return null;
  const orgId = (t.data as any).organization_id as string;
  return getOrg(orgId);
}

export async function getOrg(orgId: string): Promise<OrgSummary | null> {
  const sb = svc();
  const org = await sb.from("organizations").select("id, name").eq("id", orgId).maybeSingle();
  if (org.error || !org.data) return null;
  const locs = await sb.from("tenants").select("id, name, slug, location_label").eq("organization_id", orgId).order("created_at");
  return {
    id: (org.data as any).id,
    name: (org.data as any).name,
    locations: (locs.data ?? []).map((r: any) => ({ tenantId: r.id, name: r.name, label: r.location_label ?? null, slug: r.slug ?? null })),
  };
}

/** Turn a tenant into the HQ of a new organization (idempotent — reuses an existing org). */
export async function createOrganization(hqTenantId: string, name: string): Promise<{ ok: boolean; orgId?: string; error?: string }> {
  const sb = svc();
  const t = await sb.from("tenants").select("organization_id").eq("id", hqTenantId).maybeSingle();
  if (t.error && missing(t.error.message)) return { ok: false, error: "Organization support isn't enabled yet — apply migration 0056." };
  if ((t.data as any)?.organization_id) return { ok: true, orgId: (t.data as any).organization_id };
  const ins = await sb.from("organizations").insert({ name: name.trim() || "Organization" }).select("id").single();
  if (ins.error) return { ok: false, error: missing(ins.error.message) ? "Organization support isn't enabled yet — apply migration 0056." : ins.error.message };
  const orgId = (ins.data as any).id as string;
  await sb.from("tenants").update({ organization_id: orgId }).eq("id", hqTenantId);
  return { ok: true, orgId };
}

/** Attach an existing tenant to an organization as a location. */
export async function addLocation(orgId: string, tenantId: string, label?: string): Promise<{ ok: boolean; error?: string }> {
  const sb = svc();
  const { error } = await sb.from("tenants").update({ organization_id: orgId, location_label: label?.trim() || null }).eq("id", tenantId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Roll-up counts across all locations in the org (HQ dashboard). */
export async function getOrgRollup(orgId: string): Promise<OrgRollup> {
  const sb = svc();
  const out: OrgRollup = { locations: 0, contacts: 0, websites: 0, appointments: 0 };
  const locs = await sb.from("tenants").select("id").eq("organization_id", orgId);
  const ids = (locs.data ?? []).map((r: any) => r.id) as string[];
  out.locations = ids.length;
  if (!ids.length) return out;
  const countIn = async (table: string): Promise<number> => {
    const { count } = await sb.from(table).select("*", { count: "exact", head: true }).in("tenant_id", ids);
    return count ?? 0;
  };
  out.contacts = await countIn("tenant_contacts");
  out.websites = await countIn("websites");
  out.appointments = await countIn("tenant_appointments");
  return out;
}
