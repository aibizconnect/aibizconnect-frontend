import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { encryptSecret, decryptSecret, encryptionReady } from "@/lib/server/encryption";
import type { FeedRuntime } from "./adapter";

/** Per-tenant IDX feed config + encrypted credentials (G4). Credentials never leave the server. */

const svc = () => createSupabaseServiceClient();

export interface FeedView {
  source: string; method: string; endpoint: string | null;
  config: Record<string, unknown>; status: string; termsAccepted: boolean; hasCredentials: boolean;
}

export async function getFeed(tenantId: string, source = "ddf"): Promise<FeedView | null> {
  const { data } = await svc().from("idx_feeds").select("source, method, endpoint, config, status, terms_accepted, encrypted_credentials").eq("tenant_id", tenantId).eq("source", source).maybeSingle();
  if (!data) return null;
  return { source: data.source, method: data.method, endpoint: data.endpoint ?? null, config: data.config ?? {}, status: data.status, termsAccepted: !!data.terms_accepted, hasCredentials: !!data.encrypted_credentials };
}

/** SERVER-ONLY: decrypted runtime for the adapter. */
export async function getFeedRuntime(tenantId: string, source = "ddf"): Promise<FeedRuntime | null> {
  const { data } = await svc().from("idx_feeds").select("source, method, endpoint, config, encrypted_credentials").eq("tenant_id", tenantId).eq("source", source).maybeSingle();
  if (!data) return null;
  let credentials: Record<string, unknown> | null = null;
  if (data.encrypted_credentials) { try { credentials = JSON.parse(decryptSecret(data.encrypted_credentials)); } catch { credentials = null; } }
  return { source: data.source, method: data.method, endpoint: data.endpoint ?? null, credentials, config: data.config ?? {} };
}

export async function saveFeed(tenantId: string, input: { method?: string; endpoint?: string; credentials?: Record<string, unknown>; config?: Record<string, unknown>; termsAccepted?: boolean; source?: string }): Promise<{ ok: boolean; error?: string }> {
  const source = input.source ?? "ddf";
  const row: Record<string, unknown> = { tenant_id: tenantId, source, updated_at: new Date().toISOString() };
  if (input.method !== undefined) row.method = input.method;
  if (input.endpoint !== undefined) row.endpoint = input.endpoint.trim() || null;
  if (input.config !== undefined) row.config = input.config;
  if (input.termsAccepted !== undefined) row.terms_accepted = input.termsAccepted;
  if (input.credentials && Object.keys(input.credentials).length) {
    if (!encryptionReady()) return { ok: false, error: "Set SETTINGS_ENCRYPTION_KEY to store feed credentials." };
    row.encrypted_credentials = encryptSecret(JSON.stringify(input.credentials));
  }
  // Active only when terms are accepted AND an endpoint exists.
  const cur = await getFeed(tenantId, source);
  const endpoint = (row.endpoint as string | null | undefined) ?? cur?.endpoint ?? null;
  const terms = (row.terms_accepted as boolean | undefined) ?? cur?.termsAccepted ?? false;
  row.status = endpoint && terms ? "active" : "pending";
  const { error } = await svc().from("idx_feeds").upsert(row, { onConflict: "tenant_id,source" });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Feeds eligible for a sync run (terms accepted + endpoint + not paused). Cross-tenant for the cron. */
export async function listActiveFeeds(): Promise<{ tenantId: string; source: string }[]> {
  const { data } = await svc().from("idx_feeds").select("tenant_id, source").eq("terms_accepted", true).not("endpoint", "is", null).neq("status", "paused");
  return (data ?? []).map((r: any) => ({ tenantId: r.tenant_id, source: r.source }));
}
