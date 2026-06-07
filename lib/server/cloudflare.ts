import { SYSTEM_TENANT_ID } from "@/lib/media/system";
import { getIntegrationSecret } from "./integrations";

/**
 * Server-only Cloudflare client for platform DNS. The PLATFORM Cloudflare API token + zone id
 * live in env (CLOUDFLARE_API_TOKEN / CLOUDFLARE_ZONE_ID) or, failing that, the encrypted
 * platform secret (tenant_secrets under SYSTEM_TENANT_ID, provider 'cloudflare_platform').
 * DNS verification uses public DNS-over-HTTPS and needs no token at all.
 */
const CF_API = "https://api.cloudflare.com/client/v4";
/** What a tenant subdomain/custom domain CNAMEs to (the platform edge). */
export const EDGE_TARGET = process.env.CLOUDFLARE_EDGE_TARGET || "edge.aibizconnect.app";

async function platformCreds(): Promise<{ token: string; zoneId: string } | null> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (token && zoneId) return { token, zoneId };
  try {
    const s = await getIntegrationSecret(SYSTEM_TENANT_ID, "cloudflare_platform");
    if (s?.api_token && s?.zone_id) return { token: String(s.api_token), zoneId: String(s.zone_id) };
  } catch { /* not configured */ }
  return null;
}

export async function cloudflareReady(): Promise<boolean> { return !!(await platformCreds()); }

/** Create a proxied CNAME on the platform zone (for a free subdomain). Token required. */
export async function createCname(name: string, target = EDGE_TARGET): Promise<{ ok: boolean; recordId?: string; error?: string }> {
  const creds = await platformCreds();
  if (!creds) return { ok: false, error: "Cloudflare is not configured (CLOUDFLARE_API_TOKEN / CLOUDFLARE_ZONE_ID)." };
  try {
    const res = await fetch(`${CF_API}/zones/${creds.zoneId}/dns_records`, {
      method: "POST",
      headers: { Authorization: `Bearer ${creds.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "CNAME", name, content: target, proxied: true, ttl: 1 }),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json?.success) return { ok: false, error: json?.errors?.[0]?.message || `Cloudflare ${res.status}` };
    return { ok: true, recordId: json.result?.id };
  } catch (e: any) { return { ok: false, error: e?.message ?? "Cloudflare request failed." }; }
}

/** Create a TXT record on the platform zone (token required). */
export async function createTxtRecord(name: string, value: string): Promise<{ ok: boolean; recordId?: string; error?: string }> {
  const creds = await platformCreds();
  if (!creds) return { ok: false, error: "Cloudflare is not configured." };
  try {
    const res = await fetch(`${CF_API}/zones/${creds.zoneId}/dns_records`, {
      method: "POST", headers: { Authorization: `Bearer ${creds.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "TXT", name, content: value, ttl: 1 }),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json?.success) return { ok: false, error: json?.errors?.[0]?.message || `Cloudflare ${res.status}` };
    return { ok: true, recordId: json.result?.id };
  } catch (e: any) { return { ok: false, error: e?.message }; }
}

/** List DNS records on the platform zone (optionally filtered by name). Token required. */
export async function listRecords(name?: string): Promise<{ id: string; type: string; name: string; content: string }[]> {
  const creds = await platformCreds();
  if (!creds) return [];
  try {
    const url = `${CF_API}/zones/${creds.zoneId}/dns_records${name ? `?name=${encodeURIComponent(name)}` : ""}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${creds.token}` } });
    const json: any = await res.json().catch(() => ({}));
    return (json?.result ?? []).map((r: any) => ({ id: r.id, type: r.type, name: r.name, content: r.content }));
  } catch { return []; }
}

/** Get the Cloudflare zone id for a domain already on our account, or null. Token required. */
export async function getZoneId(domain: string): Promise<string | null> {
  const creds = await platformCreds();
  if (!creds) return null;
  try {
    const res = await fetch(`${CF_API}/zones?name=${encodeURIComponent(domain)}`, { headers: { Authorization: `Bearer ${creds.token}` } });
    const json: any = await res.json().catch(() => ({}));
    return json?.result?.[0]?.id ?? null;
  } catch { return null; }
}

/** Get (or create) a zone for a custom domain — for the nameserver-delegation path. Token required. */
export async function getOrCreateZone(domain: string): Promise<{ ok: boolean; zoneId?: string; nameservers?: string[]; error?: string }> {
  const creds = await platformCreds();
  if (!creds) return { ok: false, error: "Cloudflare is not configured." };
  const existing = await getZoneId(domain);
  if (existing) return { ok: true, zoneId: existing };
  try {
    const res = await fetch(`${CF_API}/zones`, {
      method: "POST", headers: { Authorization: `Bearer ${creds.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: domain, type: "full" }),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json?.success) return { ok: false, error: json?.errors?.[0]?.message || `Cloudflare ${res.status}` };
    return { ok: true, zoneId: json.result?.id, nameservers: json.result?.name_servers };
  } catch (e: any) { return { ok: false, error: e?.message }; }
}

export async function deleteDnsRecord(recordId: string): Promise<boolean> {
  const creds = await platformCreds();
  if (!creds) return false;
  try {
    const res = await fetch(`${CF_API}/zones/${creds.zoneId}/dns_records/${recordId}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${creds.token}` },
    });
    return res.ok;
  } catch { return false; }
}

/**
 * Verify a DNS record exists via public DNS-over-HTTPS (no token). True when a record of `type`
 * at `name` contains `expected` (case-insensitive substring, trailing dots/quotes ignored).
 */
export async function verifyDnsRecord(name: string, type: "CNAME" | "TXT" | "NS" | "MX", expected: string): Promise<boolean> {
  try {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`, { headers: { accept: "application/dns-json" } });
    if (!res.ok) return false;
    const json: any = await res.json();
    const want = expected.toLowerCase().replace(/[".]+$/g, "").trim();
    return (json?.Answer ?? []).some((a: any) => String(a.data || "").toLowerCase().replace(/[".]+$/g, "").includes(want));
  } catch { return false; }
}
