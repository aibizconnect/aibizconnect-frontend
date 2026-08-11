import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { BlockFilter } from "@/lib/idx/block-config";

/**
 * Layer 2 of the listings block (D-361): which hostnames may render a given agent's block, and
 * which slice of their feed is relevant on each one. Layer 1 is the agent's own DDF feed
 * (`idx_feeds`); layer 3 is the per-page filter carried in the snippet.
 *
 * A tenant with no rows is unrestricted — adding the first domain turns the list into an
 * allowlist for that tenant's embeds.
 */

const svc = () => createSupabaseServiceClient();

export interface BlockDomain {
  id: string;
  domain: string;
  label: string | null;
  filter: BlockFilter;
  active: boolean;
}

/** Hostname → comparable key: lowercased, scheme/path/port/`www.` stripped. */
export function canonicalHost(input: string): string {
  let h = (input || "").trim().toLowerCase();
  h = h.replace(/^[a-z]+:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "");
  return h.replace(/^www\./, "");
}

export async function listBlockDomains(tenantId: string): Promise<BlockDomain[]> {
  const { data } = await svc()
    .from("idx_block_domains")
    .select("id, domain, label, filter, active")
    .eq("tenant_id", tenantId)
    .order("domain");
  return (data ?? []).map((r) => ({ id: r.id, domain: r.domain, label: r.label ?? null, filter: (r.filter ?? {}) as BlockFilter, active: !!r.active }));
}

export async function upsertBlockDomain(
  tenantId: string,
  input: { id?: string; domain: string; label?: string | null; filter?: BlockFilter; active?: boolean },
): Promise<{ ok: boolean; error?: string }> {
  const domain = canonicalHost(input.domain);
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return { ok: false, error: "Enter a hostname like listings.example.com." };
  const row: Record<string, unknown> = {
    tenant_id: tenantId,
    domain,
    label: input.label?.trim() || null,
    filter: input.filter ?? {},
    active: input.active ?? true,
    updated_at: new Date().toISOString(),
  };
  if (input.id) row.id = input.id;
  const { error } = await svc().from("idx_block_domains").upsert(row, { onConflict: "tenant_id,domain" });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteBlockDomain(tenantId: string, id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await svc().from("idx_block_domains").delete().eq("tenant_id", tenantId).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export interface DomainScope {
  /** false → this host is not authorized to render the tenant's block. */
  allowed: boolean;
  /** Domain-level saved search the page filter must narrow within. */
  filter: BlockFilter;
  matched: string | null;
  /** No domains registered yet: unrestricted, and worth saying so in the UI. */
  unrestricted: boolean;
}

/**
 * Resolve the domain layer for `host` (the embedding page's hostname).
 * Matches the registered domain itself or any subdomain of it, so one row covers
 * `example.com`, `www.example.com` and `listings.example.com`.
 */
export async function resolveDomainScope(tenantId: string, host: string | null | undefined): Promise<DomainScope> {
  const domains = (await listBlockDomains(tenantId).catch(() => [])).filter((d) => d.active);
  if (domains.length === 0) return { allowed: true, filter: {}, matched: null, unrestricted: true };
  const h = canonicalHost(host ?? "");
  const hit = h ? domains.find((d) => h === d.domain || h.endsWith(`.${d.domain}`)) : undefined;
  if (!hit) return { allowed: false, filter: {}, matched: null, unrestricted: false };
  return { allowed: true, filter: hit.filter, matched: hit.domain, unrestricted: false };
}
