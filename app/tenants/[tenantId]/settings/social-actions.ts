"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireTenantAccess } from "@/lib/auth/tenant-access";
import {
  PROVIDERS, isSocialProvider, socialProviderReady, buildAuthorizeUrl,
  refreshSocialAccountToken, makeOAuthState, readOAuthState, socialRedirectUri,
  completeOAuthCore, registerWhatsAppNumber, listWhatsAppNumbers, removeWhatsAppNumber,
  type SocialProvider, type WhatsAppNumberView,
} from "@/lib/server/social";
export type { WhatsAppNumberView };

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
  const state = makeOAuthState(tenantId, provider);
  if (!state) return { ok: false, message: "Set SETTINGS_ENCRYPTION_KEY to start OAuth." };
  const res = await buildAuthorizeUrl(provider, { state, redirectUri: socialRedirectUri(provider) });
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
  const parsed = readOAuthState(state);
  if (!parsed || parsed.tenantId !== tenantId || parsed.provider !== provider) return { ok: false, message: "Invalid or expired OAuth state." };
  const { getCurrentUserEmail } = await import("@/lib/auth/platform-admin");
  const connectedBy = (await getCurrentUserEmail()) || "unknown";
  const r = await completeOAuthCore(tenantId, provider, code, connectedBy);
  return r.ok ? { ok: true, connected: r.connected } : { ok: false, message: r.message };
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

// ── WhatsApp Cloud (manual phone-number-id config, D-329) ─────────────────────
export async function getWhatsAppNumbers(tenantId: string): Promise<WhatsAppNumberView[]> {
  await requireTenantAccess(tenantId);
  try { return await listWhatsAppNumbers(tenantId); } catch { return []; }
}
export async function saveWhatsAppNumber(tenantId: string, input: { phoneNumberId: string; accessToken: string; label?: string }): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdminWrite(); } catch (e: any) { return { ok: false, message: e?.message }; }
  if (!input.phoneNumberId.trim() || !input.accessToken.trim()) return { ok: false, message: "Phone number ID and access token are required." };
  const r = await registerWhatsAppNumber(tenantId, { phoneNumberId: input.phoneNumberId.trim(), accessToken: input.accessToken.trim(), label: input.label?.trim() });
  await audit("whatsapp.register", { tenantId, phoneNumberId: input.phoneNumberId.trim(), ok: r.ok });
  return r.ok ? { ok: true } : { ok: false, message: r.error };
}
export async function removeWhatsAppNumberAction(tenantId: string, id: string): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdminWrite(); } catch (e: any) { return { ok: false, message: e?.message }; }
  await removeWhatsAppNumber(tenantId, id);
  await audit("whatsapp.remove", { tenantId, id });
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
