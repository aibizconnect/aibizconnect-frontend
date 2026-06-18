"use server";

import crypto from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { createCname, createARecord, verifyDnsRecord, EDGE_TARGET, isPlatformApex, isInPlatformZone, cloudflareReady } from "@/lib/server/cloudflare";
import { addProjectDomain, getProjectDomain, recommendedVercelDns, vercelReady } from "@/lib/server/vercel";

const SUBDOMAIN_BASE = "aibizconnect.app";
const PLATFORM_TENANT_ID = "d723a086-eac0-4b61-8742-25313370d0b7";

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

/**
 * GO-LIVE (admin): attach the host to the deployment AND create its DNS, then mark active.
 *
 * Two providers, one button:
 *  1. Vercel — register the hostname on the project so the deployment actually serves it
 *     (DNS alone is not enough; an unregistered host returns DEPLOYMENT_NOT_FOUND).
 *  2. Cloudflare — for hosts inside a zone we control, create the record: an A record for the
 *     apex (can't be a CNAME), a CNAME for a subdomain. External custom domains live in the
 *     customer's own zone, so we skip Cloudflare and rely on the records returned at add-time.
 */
export async function publishDomainDns(tenantId: string, domainId: string): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  await requireAdminWrite();
  const supabase = createSupabaseServiceClient();
  const { data: row } = await supabase.from("tenant_domains").select("*").eq("tenant_id", tenantId).eq("id", domainId).single();
  if (!row) return { ok: false, message: "Domain not found." };
  if (row.type === "custom" && row.status !== "verified") return { ok: false, message: "Verify the custom domain first." };

  const host: string = row.type === "subdomain" ? `${row.subdomain}.${SUBDOMAIN_BASE}` : row.domain_name;
  const created: any[] = Array.isArray(row.cloudflare_dns_records_created) ? row.cloudflare_dns_records_created : [];

  // 1) Attach to Vercel (skips silently if no token — DNS still gets created and you can register later).
  let vercelNote = "";
  if (await vercelReady()) {
    const v = await addProjectDomain(host);
    if (!v.ok) return { ok: false, message: `Vercel: ${v.error}` };
    created.push({ provider: "vercel", host, verified: v.verified });
  } else {
    vercelNote = " (Vercel token not set — host not yet attached to the deployment)";
  }

  // 2) Create DNS for hosts inside a zone we control.
  if (isPlatformApex(host)) {
    const a = await createARecord(host);
    if (!a.ok) return { ok: false, message: a.error };
    created.push({ id: a.recordId, type: "A", name: host });
  } else if (isInPlatformZone(host)) {
    const name = row.type === "subdomain" ? row.subdomain : host;
    const c = await createCname(name);
    if (!c.ok) return { ok: false, message: c.error };
    created.push({ id: c.recordId, type: "CNAME", name });
  }

  await supabase.from("tenant_domains").update({
    status: "active", cloudflare_dns_records_created: created, updated_at: new Date().toISOString(),
  }).eq("id", domainId).eq("tenant_id", tenantId);
  await audit("domain.publish_dns", { tenantId, domain: row.domain_name, host });
  return { ok: true, message: `Live on ${host}${vercelNote}` };
}

export interface DomainHealthStep { label: string; state: "ok" | "pending" | "fail" | "unknown"; detail?: string }
export interface DomainHealth { host: string; ready: boolean; steps: DomainHealthStep[] }

/**
 * Full readiness of a host across all three layers — DNS, Vercel attach, and our own routing —
 * as a checklist the UI (and the preflight script) can render. Read-only; safe to call anytime.
 */
export async function domainHealth(tenantId: string, domainId: string): Promise<DomainHealth | null> {
  await requireTenantAccess(tenantId);
  const supabase = createSupabaseServiceClient();
  const { data: row } = await supabase.from("tenant_domains").select("*").eq("tenant_id", tenantId).eq("id", domainId).single();
  if (!row) return null;
  const host: string = row.type === "subdomain" ? `${row.subdomain}.${SUBDOMAIN_BASE}` : row.domain_name;
  const steps: DomainHealthStep[] = [];

  // DNS points at us?
  const want = isPlatformApex(host) ? "76.76.21.21" : (isInPlatformZone(host) ? EDGE_TARGET : recommendedVercelDns(host).value);
  const dnsType = isPlatformApex(host) ? "A" : "CNAME";
  const dnsOk = await verifyDnsRecord(host, dnsType as "A" | "CNAME", want);
  steps.push({ label: `DNS ${dnsType} ${host} → ${want}`, state: dnsOk ? "ok" : "pending", detail: dnsOk ? undefined : "Record not visible yet (DNS can take minutes)." });

  // Attached + configured on Vercel?
  if (await vercelReady()) {
    const v = await getProjectDomain(host);
    steps.push({ label: "Attached to deployment (Vercel)", state: v.registered ? "ok" : "fail", detail: v.error });
    steps.push({ label: "Vercel ownership verified", state: v.verified ? "ok" : "pending", detail: v.verified ? undefined : "Add the DNS/verification record, then verify." });
    if (v.misconfigured === true) steps.push({ label: "Vercel DNS configuration", state: "pending", detail: "Vercel can't see correct DNS yet." });
  } else {
    steps.push({ label: "Attached to deployment (Vercel)", state: "unknown", detail: "VERCEL_API_TOKEN not set — can't check/attach." });
  }

  // Our routing
  steps.push({ label: `Routing status: ${row.status}`, state: row.status === "active" ? "ok" : "pending" });

  const ready = steps.every((s) => s.state === "ok");
  return { host, ready, steps };
}

/**
 * THE SWITCH (platform-admin): make `aibizconnect.app` + `www.aibizconnect.app` serve OUR
 * deployment. Records the apex as the platform tenant's primary domain, attaches both hosts to
 * Vercel, and (in-zone) creates the apex A record + the www CNAME. The apex itself is a
 * PLATFORM_HOST in middleware, so it renders the marketing home directly — no tenant rewrite.
 * Idempotent. Returns a per-host result; requires the Vercel + Cloudflare tokens to fully apply.
 */
export async function claimPlatformApex(): Promise<{ ok: boolean; results: { host: string; ok: boolean; message: string }[] }> {
  await requireAdminWrite();
  const supabase = createSupabaseServiceClient();
  const results: { host: string; ok: boolean; message: string }[] = [];

  for (const host of ["aibizconnect.app", "www.aibizconnect.app"]) {
    let msg = "";
    let ok = true;
    // Attach to Vercel.
    if (await vercelReady()) {
      const v = await addProjectDomain(host);
      ok = v.ok;
      msg = v.ok ? (v.verified ? "attached + verified" : "attached (verify DNS)") : `Vercel: ${v.error}`;
    } else {
      ok = false; msg = "VERCEL_API_TOKEN not set";
    }
    // Create DNS in our zone.
    if (isPlatformApex(host)) {
      const a = await createARecord(host);
      msg += a.ok ? " · A→76.76.21.21" : ` · Cloudflare: ${a.error}`;
      ok = ok && a.ok;
    } else {
      const c = await createCname("www", "cname.vercel-dns.com", false); // DNS-only: Vercel issues the cert
      msg += c.ok ? " · www CNAME" : ` · Cloudflare: ${c.error}`;
      ok = ok && c.ok;
    }
    results.push({ host, ok, message: msg });
  }

  // Record the apex as the platform tenant's primary custom domain (routing/bookkeeping).
  try {
    await supabase.from("tenant_domains").upsert(
      { tenant_id: PLATFORM_TENANT_ID, domain_name: "aibizconnect.app", custom_domain: "aibizconnect.app", type: "custom", status: "active", is_primary: true, updated_at: new Date().toISOString() },
      { onConflict: "tenant_id,domain_name" }
    );
  } catch { /* bookkeeping only */ }

  await audit("domain.claim_platform_apex", { results });
  return { ok: results.every((r) => r.ok), results };
}

export interface PlatformApexStatus {
  vercelConfigured: boolean;
  cloudflareConfigured: boolean;
  hosts: { host: string; registered: boolean; verified: boolean; misconfigured?: boolean; note?: string }[];
}

/** Live status of the platform hosts for the admin console (read-only). */
export async function platformApexStatus(): Promise<PlatformApexStatus> {
  await requireAdminWrite();
  const [vc, cf] = await Promise.all([vercelReady(), cloudflareReady()]);
  const hosts: PlatformApexStatus["hosts"] = [];
  for (const host of ["aibizconnect.app", "www.aibizconnect.app", "app.aibizconnect.app"]) {
    if (!vc) { hosts.push({ host, registered: false, verified: false, note: "VERCEL_API_TOKEN not set" }); continue; }
    const v = await getProjectDomain(host);
    hosts.push({ host, registered: v.registered, verified: v.verified, misconfigured: v.misconfigured, note: v.error });
  }
  return { vercelConfigured: vc, cloudflareConfigured: cf, hosts };
}
