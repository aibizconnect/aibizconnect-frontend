import { SYSTEM_TENANT_ID } from "@/lib/media/system";
import { getIntegrationSecret } from "./integrations";

/**
 * Server-only Vercel client for ATTACHING hostnames to the deployment project.
 *
 * Pointing DNS at our edge is necessary but NOT sufficient: Vercel only serves a host it
 * has registered on the project (otherwise it returns DEPLOYMENT_NOT_FOUND). Free subdomains
 * work today only because `*.aibizconnect.app` is a wildcard domain on the project — the apex
 * and any external custom domain must be registered explicitly. This client does that.
 *
 * The token + project come from env (VERCEL_API_TOKEN / VERCEL_PROJECT_ID / VERCEL_TEAM_ID) or,
 * failing that, the encrypted platform secret (tenant_secrets under SYSTEM_TENANT_ID, provider
 * 'vercel_platform'). Project/team default to the known IDs from .vercel/project.json so the
 * only thing the operator must supply is a token. Every call degrades gracefully (ok:false +
 * a clear "not configured" error) when no token is present.
 */
const API = "https://api.vercel.com";
const DEFAULT_PROJECT = process.env.VERCEL_PROJECT_ID || "prj_JUqbcW5p53tWlKuzIJwU0HTdGmny";
const DEFAULT_TEAM = process.env.VERCEL_TEAM_ID || "team_Dkju1FizEtaUwOaKAlv5mYln";

async function creds(): Promise<{ token: string; projectId: string; teamId: string } | null> {
  const token = process.env.VERCEL_API_TOKEN;
  if (token) return { token, projectId: DEFAULT_PROJECT, teamId: DEFAULT_TEAM };
  try {
    const s = await getIntegrationSecret(SYSTEM_TENANT_ID, "vercel_platform");
    if (s?.api_token) return { token: String(s.api_token), projectId: String(s.project_id || DEFAULT_PROJECT), teamId: String(s.team_id || DEFAULT_TEAM) };
  } catch { /* not configured */ }
  return null;
}

export async function vercelReady(): Promise<boolean> { return !!(await creds()); }

const q = (teamId: string) => (teamId ? `?teamId=${teamId}` : "");

export interface VercelVerification { type: string; domain: string; value: string; reason?: string }
export interface VercelDomainState {
  ok: boolean;
  registered: boolean;       // is the host attached to OUR project?
  verified: boolean;         // has Vercel verified ownership?
  misconfigured?: boolean;   // does live DNS point here correctly? (null=unknown)
  verification?: VercelVerification[];
  configured?: boolean;      // !misconfigured && verified
  error?: string;
}

/** Attach a hostname to the project. Idempotent: an already-attached host returns its live state. */
export async function addProjectDomain(domain: string): Promise<VercelDomainState> {
  const c = await creds();
  if (!c) return { ok: false, registered: false, verified: false, error: "Vercel not configured (VERCEL_API_TOKEN)." };
  try {
    const res = await fetch(`${API}/v10/projects/${c.projectId}/domains${q(c.teamId)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: domain }),
    });
    const json: any = await res.json().catch(() => ({}));
    if (res.ok) {
      const cfg = await getDomainConfig(domain);
      return { ok: true, registered: true, verified: !!json.verified, verification: json.verification ?? [], misconfigured: cfg.misconfigured ?? undefined, configured: !!json.verified && cfg.misconfigured === false };
    }
    const code = json?.error?.code;
    // Already on THIS project -> read its current state and report success.
    if (code === "domain_already_in_use" || res.status === 409) {
      const cur = await getProjectDomain(domain);
      if (cur.ok && cur.registered) return cur;
      return { ok: false, registered: false, verified: false, error: json?.error?.message || "Domain is already in use by another Vercel project/account." };
    }
    return { ok: false, registered: false, verified: false, error: json?.error?.message || `Vercel ${res.status}` };
  } catch (e: any) { return { ok: false, registered: false, verified: false, error: e?.message ?? "Vercel request failed." }; }
}

/** Current state of a host on the project (registered? verified? misconfigured?). */
export async function getProjectDomain(domain: string): Promise<VercelDomainState> {
  const c = await creds();
  if (!c) return { ok: false, registered: false, verified: false, error: "Vercel not configured." };
  try {
    const res = await fetch(`${API}/v9/projects/${c.projectId}/domains/${domain}${q(c.teamId)}`, {
      headers: { Authorization: `Bearer ${c.token}` },
    });
    if (res.status === 404) return { ok: true, registered: false, verified: false };
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, registered: false, verified: false, error: json?.error?.message || `Vercel ${res.status}` };
    const cfg = await getDomainConfig(domain);
    return { ok: true, registered: true, verified: !!json.verified, verification: json.verification ?? [], misconfigured: cfg.misconfigured ?? undefined, configured: !!json.verified && cfg.misconfigured === false };
  } catch (e: any) { return { ok: false, registered: false, verified: false, error: e?.message }; }
}

/** Ask Vercel to re-check ownership verification for a host on the project. */
export async function verifyProjectDomain(domain: string): Promise<VercelDomainState> {
  const c = await creds();
  if (!c) return { ok: false, registered: false, verified: false, error: "Vercel not configured." };
  try {
    const res = await fetch(`${API}/v9/projects/${c.projectId}/domains/${domain}/verify${q(c.teamId)}`, {
      method: "POST", headers: { Authorization: `Bearer ${c.token}` },
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, registered: true, verified: false, error: json?.error?.message || `Vercel ${res.status}` };
    return { ok: true, registered: true, verified: !!json.verified, verification: json.verification ?? [] };
  } catch (e: any) { return { ok: false, registered: false, verified: false, error: e?.message }; }
}

/** Does live DNS point this host at Vercel correctly? misconfigured=false means good. */
export async function getDomainConfig(domain: string): Promise<{ misconfigured: boolean | null }> {
  const c = await creds();
  if (!c) return { misconfigured: null };
  try {
    const res = await fetch(`${API}/v6/domains/${domain}/config${q(c.teamId)}`, { headers: { Authorization: `Bearer ${c.token}` } });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) return { misconfigured: null };
    return { misconfigured: typeof json.misconfigured === "boolean" ? json.misconfigured : null };
  } catch { return { misconfigured: null }; }
}

/** Detach a host from the project. */
export async function removeProjectDomain(domain: string): Promise<{ ok: boolean; error?: string }> {
  const c = await creds();
  if (!c) return { ok: false, error: "Vercel not configured." };
  try {
    const res = await fetch(`${API}/v9/projects/${c.projectId}/domains/${domain}${q(c.teamId)}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${c.token}` },
    });
    return res.ok ? { ok: true } : { ok: false, error: `Vercel ${res.status}` };
  } catch (e: any) { return { ok: false, error: e?.message }; }
}

/**
 * The DNS record a host needs to point at Vercel. Apex (registrable root, <=2 labels) takes an
 * A record to Vercel's anycast IP; anything deeper takes a CNAME. These are Vercel's documented
 * targets and are what `getDomainConfig` checks against.
 */
export function recommendedVercelDns(domain: string): { type: "A" | "CNAME"; name: string; value: string } {
  const isApex = domain.split(".").length <= 2;
  return isApex
    ? { type: "A", name: domain, value: "76.76.21.21" }
    : { type: "CNAME", name: domain, value: "cname.vercel-dns.com" };
}
