import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { canUseFeature, FEATURES } from "./entitlements";

/**
 * Tenant domain store (Domains & Websites). Manages the multi-row tenant_domains model:
 * a free subdomain ({sub}.aibizconnect.app) plus entitlement-gated custom domains, with
 * payer attribution. Subdomains are free + auto-provisionable; custom domains require the
 * `custom_domain` entitlement (canUseFeature) — enforcing the monetization rule.
 */

const SUB_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
const RESERVED = new Set(["www", "app", "api", "admin", "mail", "ftp", "root", "system", "support", "billing"]);
const DOMAIN_RE = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

function service(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

export interface DomainRow {
  id: string;
  tenant_id: string;
  owner_user_id: string | null;
  subdomain: string | null;
  custom_domain: string | null;
  custom_domain_status: string;
  payer: string;
  paid: boolean;
  is_primary: boolean;
}

export async function listTenantDomains(tenantId: string): Promise<DomainRow[]> {
  try {
    const { data, error } = await service().from("tenant_domains")
      .select("id, tenant_id, owner_user_id, subdomain, custom_domain, custom_domain_status, payer, paid, is_primary")
      .eq("tenant_id", tenantId).order("is_primary", { ascending: false });
    return error || !data ? [] : (data as DomainRow[]);
  } catch { return []; }
}

/** Free subdomain — auto-provisionable, no entitlement needed. */
export async function addSubdomain(args: { tenantId: string; subdomain: string; ownerUserId?: string | null }): Promise<{ ok: boolean; error?: string }> {
  const sub = (args.subdomain ?? "").trim().toLowerCase();
  if (!SUB_RE.test(sub)) return { ok: false, error: "Subdomain must be 3–40 chars: lowercase letters, numbers, hyphens." };
  if (RESERVED.has(sub)) return { ok: false, error: `"${sub}" is reserved.` };
  try {
    const sb = service();
    const { data: taken } = await sb.from("tenant_domains").select("id").eq("subdomain", sub).maybeSingle();
    if (taken) return { ok: false, error: `"${sub}.aibizconnect.app" is already taken.` };
    const existing = await listTenantDomains(args.tenantId);
    const { error } = await sb.from("tenant_domains").insert({
      tenant_id: args.tenantId, owner_user_id: args.ownerUserId ?? null, subdomain: sub,
      payer: "tenant", paid: false, is_primary: existing.length === 0,
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e: unknown) { return { ok: false, error: (e as Error).message }; }
}

/** Custom domain — entitlement-gated (custom_domain). Payer attribution recorded. */
export async function addCustomDomain(args: { tenantId: string; userId?: string | null; domain: string; payer?: "tenant" | "user" | "parent_tenant"; ownerUserId?: string | null }): Promise<{ ok: boolean; error?: string; upgrade?: boolean }> {
  const domain = (args.domain ?? "").trim().toLowerCase();
  if (!DOMAIN_RE.test(domain)) return { ok: false, error: "Enter a valid domain (e.g. example.com)." };
  // ENFORCE entitlement — custom domains are a paid feature.
  if (!(await canUseFeature(args.tenantId, args.userId ?? null, FEATURES.CUSTOM_DOMAIN))) {
    return { ok: false, error: "Custom domains require an upgrade for this tenant.", upgrade: true };
  }
  try {
    const sb = service();
    const { data: taken } = await sb.from("tenant_domains").select("id").eq("custom_domain", domain).maybeSingle();
    if (taken) return { ok: false, error: `"${domain}" is already registered.` };
    const { error } = await sb.from("tenant_domains").insert({
      tenant_id: args.tenantId, owner_user_id: args.ownerUserId ?? null, custom_domain: domain,
      custom_domain_status: "pending_dns", payer: args.payer ?? "tenant", paid: false, is_primary: false,
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e: unknown) { return { ok: false, error: (e as Error).message }; }
}

export async function removeDomain(tenantId: string, id: string): Promise<{ ok: boolean }> {
  try {
    await service().from("tenant_domains").delete().eq("tenant_id", tenantId).eq("id", id);
    return { ok: true };
  } catch { return { ok: false }; }
}
