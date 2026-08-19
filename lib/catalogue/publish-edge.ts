import type { SupabaseClient } from "@supabase/supabase-js";
import { parseCatalogue, type Catalogue, type CatalogueInput } from "@/lib/catalogue/schema";
import { enforceEmailHygiene } from "@/lib/catalogue/hygiene";

/**
 * Push a tenant's Knowledge Catalogue to the Cloudflare edge (the seo-geo-platform Worker's
 * KV) so it's served on the tenant's proxied domains at /llms.txt and /.well-known/*. This is
 * the app half of the publish pipeline; the Worker half is `src/routes/a2a.ts` → PUT /api/a2a/publish.
 *
 * Config via env (set in Vercel — never commit these):
 *   A2A_WORKER_URL      base URL of the Worker (defaults to the deployed one)
 *   A2A_MASTER_KEY      the Worker's MASTER_API_KEY (bearer for the authed publish endpoint)
 *   NEXT_PUBLIC_A2A_BASE optional — active endpoint base to advertise in the agent card (Phase 2)
 *
 * Call this whenever a catalogue is published/updated (e.g. from the publish server action).
 */

const DEFAULT_WORKER_URL = "https://aibizconnect-seo-geo.abres-account.workers.dev";

export interface EdgePublishResult {
  published: string[];
  updated_at: string;
}

function workerBase(override?: string): string {
  return (override || process.env.A2A_WORKER_URL || DEFAULT_WORKER_URL).replace(/\/+$/, "");
}

export async function publishCatalogueToEdge(opts: {
  hosts: string[];
  catalogue: Catalogue | CatalogueInput;
  tenantId?: string;
  a2aBase?: string;
  workerUrl?: string;
  masterKey?: string;
}): Promise<EdgePublishResult> {
  const key = opts.masterKey || process.env.A2A_MASTER_KEY;
  if (!key) throw new Error("A2A_MASTER_KEY not set — cannot publish catalogue to the edge");

  const hosts = opts.hosts.map((h) => h.trim().toLowerCase()).filter(Boolean);
  if (!hosts.length) throw new Error("publishCatalogueToEdge: no hosts provided");

  const doc = enforceEmailHygiene(parseCatalogue(opts.catalogue)); // validate + email guardrail
  const a2aBase = opts.a2aBase ?? process.env.NEXT_PUBLIC_A2A_BASE ?? undefined;

  const res = await fetch(`${workerBase(opts.workerUrl)}/api/a2a/publish`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ hosts, tenant_id: opts.tenantId, catalogue: doc, a2a_base: a2aBase }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`edge publish failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as { success: boolean; data?: EdgePublishResult; error?: string };
  if (!json.success || !json.data) throw new Error(`edge publish rejected: ${json.error || "unknown error"}`);
  return json.data;
}

export async function unpublishCatalogueFromEdge(
  host: string,
  opts?: { workerUrl?: string; masterKey?: string }
): Promise<void> {
  const key = opts?.masterKey || process.env.A2A_MASTER_KEY;
  if (!key) throw new Error("A2A_MASTER_KEY not set — cannot unpublish from the edge");
  const res = await fetch(`${workerBase(opts?.workerUrl)}/api/a2a/${encodeURIComponent(host.trim().toLowerCase())}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`edge unpublish failed (${res.status}): ${text.slice(0, 300)}`);
  }
}

/**
 * Resolve every public hostname a tenant serves on, so a publish reaches all of them:
 * custom domain (+ www) and the platform subdomain. Excludes empty rows.
 */
export async function resolvePublishHosts(supabase: SupabaseClient, tenantId: string): Promise<string[]> {
  const { data } = await supabase
    .from("tenant_domains")
    .select("subdomain, custom_domain")
    .eq("tenant_id", tenantId);
  const hosts = new Set<string>();
  for (const row of (data ?? []) as Array<{ subdomain?: string | null; custom_domain?: string | null }>) {
    const cd = row.custom_domain?.trim().toLowerCase();
    if (cd) { hosts.add(cd); hosts.add(`www.${cd}`); }
    const sub = row.subdomain?.trim().toLowerCase();
    if (sub) hosts.add(`${sub}.aibizconnect.app`);
  }
  return [...hosts];
}
