"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireTenantAccess } from "@/lib/auth/tenant-access";
import {
  PROVIDERS, isSocialProvider, socialProviderReady, buildAuthorizeUrl,
  exchangeCodeForTokens, fetchConnectableAccounts, storeSocialAccount, refreshSocialAccountToken, type SocialProvider,
} from "@/lib/server/social";

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

/** Where the provider sends the user back. The callback route (api/social/callback) is a later phase. */
function redirectUriFor(provider: SocialProvider): string {
  const base = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.aibizconnect.app").replace(/\/+$/, "");
  return `${base}/api/social/callback/${provider}`;
}

/** Opaque, server-verifiable OAuth state binding tenant + provider + nonce (encrypted, not signed-only). */
async function makeState(tenantId: string, provider: SocialProvider): Promise<string | null> {
  const { encryptionReady, encryptSecret } = await import("@/lib/server/encryption");
  if (!encryptionReady()) return null;
  // No Date.now()/random in workflow scripts — but this is a normal server action, both are fine here.
  const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
  return Buffer.from(encryptSecret(JSON.stringify({ tenantId, provider, nonce, ts: Date.now() })), "utf8").toString("base64url");
}
async function readState(state: string): Promise<{ tenantId: string; provider: SocialProvider; ts: number } | null> {
  try {
    const { decryptSecret } = await import("@/lib/server/encryption");
    const payload = JSON.parse(decryptSecret(Buffer.from(state, "base64url").toString("utf8")));
    if (!payload?.tenantId || !isSocialProvider(payload?.provider)) return null;
    return payload;
  } catch { return null; }
}

export interface SocialAccountView {
  id: string; provider: string; external_id: string; account_name: string | null;
  account_username: string | null; avatar_url: string | null; account_type: string | null;
  status: string; token_expires_at: string | null; scopes: string[]; hasTokens: boolean;
}

export interface SocialProviderStatus { provider: string; ready: boolean; accounts: SocialAccountView[] }

/** List connected accounts (NON-SECRET only) plus per-provider configured/ready status. */
export async function listSocialAccounts(tenantId: string): Promise<SocialProviderStatus[]> {
  await requireTenantAccess(tenantId);
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("tenant_social_accounts")
    .select("id, provider, external_id, account_name, account_username, avatar_url, account_type, status, token_expires_at, scopes, encrypted_tokens")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as any[];
  const byProvider = new Map<string, SocialAccountView[]>();
  for (const r of rows) {
    const view: SocialAccountView = {
      id: r.id, provider: r.provider, external_id: r.external_id, account_name: r.account_name,
      account_username: r.account_username, avatar_url: r.avatar_url, account_type: r.account_type,
      status: r.status, token_expires_at: r.token_expires_at, scopes: r.scopes ?? [],
      hasTokens: !!r.encrypted_tokens, // never expose the blob itself
    };
    const list = byProvider.get(r.provider) ?? [];
    list.push(view);
    byProvider.set(r.provider, list);
  }
  const out: SocialProviderStatus[] = [];
  for (const provider of Object.keys(PROVIDERS) as SocialProvider[]) {
    out.push({ provider, ready: await socialProviderReady(provider), accounts: byProvider.get(provider) ?? [] });
  }
  return out;
}

/** Begin OAuth: returns the provider authorize URL (no secret). Admin-gated. */
export async function getOAuthStartUrl(tenantId: string, provider: string): Promise<{ ok: boolean; url?: string; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdminWrite(); } catch (e: any) { return { ok: false, message: e?.message }; }
  if (!isSocialProvider(provider)) return { ok: false, message: "Unknown provider." };
  if (!(await socialProviderReady(provider))) return { ok: false, message: `${provider} is not configured yet (add its OAuth app credentials).` };
  const state = await makeState(tenantId, provider);
  if (!state) return { ok: false, message: "Set SETTINGS_ENCRYPTION_KEY to start OAuth." };
  const res = await buildAuthorizeUrl(provider, { state, redirectUri: redirectUriFor(provider) });
  if (!res.ok) return { ok: false, message: res.error };
  await audit("social.oauth_start", { tenantId, provider });
  return { ok: true, url: res.url };
}

/**
 * Complete OAuth: exchange code → tokens server-side, enumerate connectable entities, store each as
 * its own account row with encrypted tokens. `state` is verified and must match the tenant.
 */
export async function completeOAuth(tenantId: string, provider: string, code: string, state: string): Promise<{ ok: boolean; connected?: number; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdminWrite(); } catch (e: any) { return { ok: false, message: e?.message }; }
  if (!isSocialProvider(provider)) return { ok: false, message: "Unknown provider." };
  const parsed = await readState(state);
  if (!parsed || parsed.tenantId !== tenantId || parsed.provider !== provider) return { ok: false, message: "Invalid or expired OAuth state." };
  if (Date.now() - parsed.ts > 15 * 60 * 1000) return { ok: false, message: "OAuth state expired — please retry." };

  const ex = await exchangeCodeForTokens(provider, code, redirectUriFor(provider));
  if (!ex.ok || !ex.tokens) return { ok: false, message: ex.error };

  const { getCurrentUserEmail } = await import("@/lib/auth/platform-admin");
  const connectedBy = (await getCurrentUserEmail()) || "unknown";
  const accounts = await fetchConnectableAccounts(provider, ex.tokens);
  let connected = 0;
  for (const acct of accounts) {
    const id = await storeSocialAccount(tenantId, provider, acct, ex.tokens, connectedBy, PROVIDERS[provider].scopes);
    if (id) connected++;
  }
  // Reflect a summary row in tenant_integrations (non-secret) for the unified Integrations view.
  const supabase = createSupabaseServiceClient();
  await supabase.from("tenant_integrations").upsert(
    { tenant_id: tenantId, provider, status: connected > 0 ? "connected" : "error", config: { kind: "social", account_count: connected }, updated_at: new Date().toISOString() },
    { onConflict: "tenant_id,provider" }
  );
  await audit("social.oauth_complete", { tenantId, provider, connected });
  if (connected === 0) return { ok: false, message: "OAuth succeeded but no connectable accounts were found." };
  return { ok: true, connected };
}

/** Disconnect one account: best-effort provider revoke, then delete the row. Admin-gated. */
export async function disconnectSocialAccount(tenantId: string, accountId: string): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdminWrite(); } catch (e: any) { return { ok: false, message: e?.message }; }
  const supabase = createSupabaseServiceClient();
  const { data: row } = await supabase.from("tenant_social_accounts").select("provider, external_id").eq("tenant_id", tenantId).eq("id", accountId).maybeSingle();
  if (!row) return { ok: false, message: "Account not found." };
  // Best-effort revoke could call the provider here; deferred until callback/posting phase.
  const { error } = await supabase.from("tenant_social_accounts").delete().eq("tenant_id", tenantId).eq("id", accountId);
  if (error) return { ok: false, message: error.message };
  // If no accounts remain for this provider, mark the integration disconnected.
  const { count } = await supabase.from("tenant_social_accounts").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("provider", row.provider);
  if (!count) await supabase.from("tenant_integrations").upsert(
    { tenant_id: tenantId, provider: row.provider, status: "disconnected", updated_at: new Date().toISOString() },
    { onConflict: "tenant_id,provider" }
  );
  await audit("social.disconnect", { tenantId, provider: row.provider, externalId: row.external_id });
  return { ok: true };
}

/** Refresh an account's access token (providers that issue refresh tokens). Admin-gated, audited. */
export async function refreshSocialToken(tenantId: string, accountId: string): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdminWrite(); } catch (e: any) { return { ok: false, message: e?.message }; }
  const res = await refreshSocialAccountToken(tenantId, accountId);
  await audit("social.refresh_token", { tenantId, accountId, ok: res.ok });
  return res.ok ? { ok: true } : { ok: false, message: res.error };
}
