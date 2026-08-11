import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { BlockFilter } from "@/lib/idx/block-config";

/**
 * Layer 2 of the listings block (D-361): which hostnames may render a given agent's block, and
 * which slice of their feed is relevant on each one. Layer 1 is the agent's own DDF feed
 * (`idx_feeds`); layer 3 is the per-page filter carried in the snippet.
 *
 * A tenant with no rows is unrestricted — adding the first domain turns the list into an
 * allowlist for that tenant's embeds. Builder/preview hosts (GHL, our own app) are always
 * allowed so a block can be tested before its real domain exists, and a tenant can keep any
 * unregistered domain working while testing via `idx_feeds.config.blockTestMode`.
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

/**
 * Hosts where a block is being *built*, not published: the GHL page builder / preview domains and
 * our own app (the studio's live preview). Always allowed, but flagged as preview so the block says
 * so on screen and can't be mistaken for a published, domain-scoped embed.
 */
const PREVIEW_SUFFIXES = [
  "gohighlevel.com",
  "msgsndr.com",
  "leadconnectorhq.com",
  "aibizconnect.app",
  "aibizconnect.ca",
  "localhost",
  "vercel.app",
];

const matchesSuffix = (host: string, suffix: string) => host === suffix || host.endsWith(`.${suffix}`);

export function isPreviewHost(host: string): boolean {
  const h = canonicalHost(host);
  return !!h && PREVIEW_SUFFIXES.some((s) => matchesSuffix(h, s));
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
  const raw = (input.domain || "").trim().toLowerCase();
  const wildcard = raw.startsWith("*.");
  const domain = (wildcard ? "*." : "") + canonicalHost(wildcard ? raw.slice(2) : raw);
  if (!/^(\*\.)?[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return { ok: false, error: "Enter a hostname like listings.example.com (or *.example.com)." };
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
  /**
   * registered   — host matched one of the agent's domains; its saved search scopes the block.
   * unrestricted — no domains registered yet, so the block renders everywhere (whole feed).
   * preview      — a builder/preview host, or test mode: renders unscoped, labelled as a preview.
   * blocked      — a real domain that isn't on the allowlist.
   */
  mode: "registered" | "unrestricted" | "preview" | "blocked";
  /** Domain-level saved search the page filter must narrow within. */
  filter: BlockFilter;
  matched: string | null;
}

/**
 * Resolve the domain layer for `host` (the embedding page's hostname).
 * A registered domain matches itself, any subdomain of it, or — when stored as `*.example.com` —
 * only its subdomains; so one row covers `example.com`, `www.` and `listings.`.
 *
 * `testMode` keeps unregistered domains working (as previews) while an agent is still wiring up
 * their GHL site: they can prove the block out before the real domain is registered or even known.
 */
export async function resolveDomainScope(
  tenantId: string,
  host: string | null | undefined,
  opts: { testMode?: boolean } = {},
): Promise<DomainScope> {
  const domains = (await listBlockDomains(tenantId).catch(() => [])).filter((d) => d.active);
  const h = canonicalHost(host ?? "");
  const hit = h
    ? domains.find((d) => (d.domain.startsWith("*.") ? h.endsWith(d.domain.slice(1)) : matchesSuffix(h, d.domain)))
    : undefined;
  if (hit) return { mode: "registered", filter: hit.filter, matched: hit.domain };
  if (domains.length === 0) return { mode: "unrestricted", filter: {}, matched: null };
  if (opts.testMode || isPreviewHost(h)) return { mode: "preview", filter: {}, matched: null };
  return { mode: "blocked", filter: {}, matched: null };
}
