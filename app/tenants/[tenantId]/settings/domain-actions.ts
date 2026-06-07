"use server";

import crypto from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { createCname, verifyDnsRecord, EDGE_TARGET } from "@/lib/server/cloudflare";

const SUBDOMAIN_BASE = "aibizconnect.app";

async function requireAdminWrite(): Promise<void> {
  const { isPlatformAdmin } = await import("@/lib/auth/platform-admin");
  if (!(await isPlatformAdmin())) throw new Error("Not authorized — admin only.");
}
async function audit(action: string, meta: Record<string, unknown>) {
  try {
    const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
    const { getCurrentUserEmail } = await import("@/lib/auth/platform-admin");
    await logPlatformEvent({ action, actorEmail: await getCurrentUserEmail(), meta });
  } catch { /* best effort */ }
}

export interface DomainRow {
  id: string; domain_name: string; type: string; status: string; is_primary: boolean;
  verification_challenge_type?: string | null; verification_challenge_name?: string | null; verification_challenge_value?: string | null;
}

export async function listDomains(tenantId: string, websiteId?: string): Promise<DomainRow[]> {
  await requireTenantAccess(tenantId);
  const supabase = createSupabaseServiceClient();
  let q = supabase.from("tenant_domains").select("id, domain_name, type, status, is_primary, verification_challenge_type, verification_challenge_name, verification_challenge_value").eq("tenant_id", tenantId);
  if (websiteId) q = q.eq("website_id", websiteId);
  const { data } = await q.order("created_at", { ascending: true });
  return (data ?? []) as DomainRow[];
}

/** Reserve a free subdomain (no DNS yet — DNS is created at PUBLISH). */
export async function reserveSubdomain(tenantId: string, websiteId: string, sub: string): Promise<{ ok: boolean; domain?: string; message?: string }> {
  await requireTenantAccess(tenantId);
  const clean = (sub || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "").slice(0, 40);
  if (clean.length < 3) return { ok: false, message: "Subdomain must be at least 3 characters (a–z, 0–9, -)." };
  const domain_name = `${clean}.${SUBDOMAIN_BASE}`;
  try {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from("tenant_domains").upsert(
      { tenant_id: tenantId, website_id: websiteId, domain_name, subdomain: clean, type: "subdomain", status: "pending_publish", is_primary: true },
      { onConflict: "tenant_id,domain_name" }
    );
    if (error) return { ok: false, message: error.message };
    await audit("domain.reserve_subdomain", { tenantId, websiteId, domain_name });
    return { ok: true, domain: domain_name };
  } catch (e: any) { return { ok: false, message: e?.message }; }
}

/** Add a custom domain → returns the DNS records the tenant must add (CNAME + TXT proof). */
export async function addCustomDomain(tenantId: string, websiteId: string, domain: string): Promise<{ ok: boolean; id?: string; records?: { type: string; name: string; value: string }[]; message?: string }> {
  await requireTenantAccess(tenantId);
  const d = (domain || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) return { ok: false, message: "Enter a valid domain (e.g. example.com)." };
  const token = `aibizconnect-verify=${crypto.randomBytes(16).toString("hex")}`;
  const records = [
    { type: "CNAME", name: d, value: EDGE_TARGET },
    { type: "TXT", name: `_aibizconnect-verify.${d}`, value: token },
  ];
  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase.from("tenant_domains").upsert(
      { tenant_id: tenantId, website_id: websiteId, domain_name: d, custom_domain: d, type: "custom", status: "pending_verification",
        verification_challenge_type: "txt", verification_challenge_name: `_aibizconnect-verify.${d}`, verification_challenge_value: token },
      { onConflict: "tenant_id,domain_name" }
    ).select("id").single();
    if (error) return { ok: false, message: error.message };
    await audit("domain.add_custom", { tenantId, websiteId, domain: d });
    return { ok: true, id: data?.id, records };
  } catch (e: any) { return { ok: false, message: e?.message }; }
}

/** Verify a custom domain's ownership (TXT) — public DoH, no token needed. */
export async function verifyCustomDomain(tenantId: string, domainId: string): Promise<{ ok: boolean; status: string; message?: string }> {
  await requireTenantAccess(tenantId);
  const supabase = createSupabaseServiceClient();
  const { data: row } = await supabase.from("tenant_domains").select("*").eq("tenant_id", tenantId).eq("id", domainId).single();
  if (!row) return { ok: false, status: "failed", message: "Domain not found." };
  const okTxt = await verifyDnsRecord(row.verification_challenge_name, "TXT", row.verification_challenge_value);
  const status = okTxt ? "verified" : "pending_verification";
  await supabase.from("tenant_domains").update({ status, updated_at: new Date().toISOString() }).eq("id", domainId).eq("tenant_id", tenantId);
  await audit("domain.verify_custom", { tenantId, domain: row.domain_name, verified: okTxt });
  return { ok: okTxt, status, message: okTxt ? undefined : "TXT record not found yet — DNS can take a few minutes." };
}

/** PUBLISH-time DNS: create the CNAME on the platform zone (admin). Subdomain or verified custom. */
export async function publishDomainDns(tenantId: string, domainId: string): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  await requireAdminWrite();
  const supabase = createSupabaseServiceClient();
  const { data: row } = await supabase.from("tenant_domains").select("*").eq("tenant_id", tenantId).eq("id", domainId).single();
  if (!row) return { ok: false, message: "Domain not found." };
  if (row.type === "custom" && row.status !== "verified") return { ok: false, message: "Verify the custom domain first." };
  const name = row.type === "subdomain" ? row.subdomain : row.domain_name;
  const res = await createCname(name);
  if (!res.ok) return { ok: false, message: res.error };
  const created = Array.isArray(row.cloudflare_dns_records_created) ? row.cloudflare_dns_records_created : [];
  await supabase.from("tenant_domains").update({
    status: "active", cloudflare_dns_records_created: [...created, { id: res.recordId, type: "CNAME", name }], updated_at: new Date().toISOString(),
  }).eq("id", domainId).eq("tenant_id", tenantId);
  await audit("domain.publish_dns", { tenantId, domain: row.domain_name, recordId: res.recordId });
  return { ok: true };
}
