import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { encryptSecret, decryptSecret, encryptionReady } from "./encryption";
import { SYSTEM_TENANT_ID } from "@/lib/media/system";
import { getIntegrationSecret } from "./integrations";

/**
 * Server-only social-integration core (NOT a "use server" file → never client-callable).
 * Holds the per-provider OAuth registry, server-side code→token exchange, connectable-account
 * enumeration, and per-ACCOUNT encrypted token storage. OAuth tokens live in
 * tenant_social_accounts.encrypted_tokens (base64 AES-256-GCM) and are decrypted ONLY here,
 * for server code that posts on the tenant's behalf — NEVER returned to a client.
 *
 * Multi-account: one OAuth grant can yield several connectable entities (FB Pages, IG business
 * accounts, LinkedIn org pages, YouTube channels) → completeOAuth stores one row per entity.
 *
 * Platform OAuth app id/secret come from env (e.g. FACEBOOK_APP_ID/FACEBOOK_APP_SECRET) or, failing
 * that, the encrypted platform secret (tenant_secrets under SYSTEM_TENANT_ID, provider
 * '<provider>_platform_app', shape {app_id, app_secret}). Absent creds → graceful degradation.
 */

export type SocialProvider = "facebook" | "instagram" | "linkedin" | "tiktok" | "youtube" | "x";

export interface ProviderSpec {
  provider: SocialProvider;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  /** env var names for the platform OAuth app credentials */
  envId: string;
  envSecret: string;
  /** secret provider key for the encrypted platform-app fallback */
  platformSecretKey: string;
}

export const PROVIDERS: Record<SocialProvider, ProviderSpec> = {
  facebook: {
    provider: "facebook",
    authorizeUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    scopes: ["pages_show_list", "pages_read_engagement", "pages_manage_posts", "instagram_basic", "instagram_manage_insights"],
    envId: "FACEBOOK_APP_ID", envSecret: "FACEBOOK_APP_SECRET", platformSecretKey: "facebook_platform_app",
  },
  instagram: {
    // IG business accounts are reached through the Facebook Graph API (linked Page) — same app.
    provider: "instagram",
    authorizeUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    scopes: ["instagram_basic", "instagram_manage_insights", "pages_show_list", "pages_read_engagement"],
    envId: "FACEBOOK_APP_ID", envSecret: "FACEBOOK_APP_SECRET", platformSecretKey: "facebook_platform_app",
  },
  linkedin: {
    provider: "linkedin",
    authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: ["r_liteprofile", "w_member_social", "r_organization_social", "w_organization_social"],
    envId: "LINKEDIN_CLIENT_ID", envSecret: "LINKEDIN_CLIENT_SECRET", platformSecretKey: "linkedin_platform_app",
  },
  tiktok: {
    provider: "tiktok",
    authorizeUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    scopes: ["user.info.basic", "video.publish", "video.upload"],
    envId: "TIKTOK_CLIENT_KEY", envSecret: "TIKTOK_CLIENT_SECRET", platformSecretKey: "tiktok_platform_app",
  },
  youtube: {
    provider: "youtube",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/youtube.readonly", "https://www.googleapis.com/auth/youtube.upload"],
    envId: "GOOGLE_OAUTH_CLIENT_ID", envSecret: "GOOGLE_OAUTH_CLIENT_SECRET", platformSecretKey: "youtube_platform_app",
  },
  x: {
    provider: "x",
    authorizeUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
    envId: "X_CLIENT_ID", envSecret: "X_CLIENT_SECRET", platformSecretKey: "x_platform_app",
  },
};

export function isSocialProvider(p: string): p is SocialProvider {
  return Object.prototype.hasOwnProperty.call(PROVIDERS, p);
}

/** Platform OAuth app credentials: env first, then encrypted platform secret. null = not configured. */
export async function providerAppCreds(provider: SocialProvider): Promise<{ id: string; secret: string } | null> {
  const spec = PROVIDERS[provider];
  const id = process.env[spec.envId];
  const secret = process.env[spec.envSecret];
  if (id && secret) return { id, secret };
  try {
    const s = await getIntegrationSecret(SYSTEM_TENANT_ID, spec.platformSecretKey);
    if (s?.app_id && s?.app_secret) return { id: String(s.app_id), secret: String(s.app_secret) };
  } catch { /* not configured */ }
  return null;
}

export async function socialProviderReady(provider: SocialProvider): Promise<boolean> {
  return !!(await providerAppCreds(provider));
}

/** Build the provider authorize URL. `state` must carry CSRF + tenant binding (caller-supplied). */
export async function buildAuthorizeUrl(
  provider: SocialProvider, opts: { state: string; redirectUri: string }
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const creds = await providerAppCreds(provider);
  if (!creds) return { ok: false, error: `${provider} is not configured (missing platform OAuth app credentials).` };
  const spec = PROVIDERS[provider];
  const params = new URLSearchParams({
    client_id: creds.id,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: spec.scopes.join(provider === "facebook" || provider === "instagram" ? "," : " "),
    state: opts.state,
  });
  // Google/X/TikTok want offline access / PKCE niceties; offline_access via access_type for Google.
  if (provider === "youtube") { params.set("access_type", "offline"); params.set("prompt", "consent"); }
  return { ok: true, url: `${spec.authorizeUrl}?${params.toString()}` };
}

export interface RawTokens { access_token: string; refresh_token?: string; expires_in?: number; [k: string]: unknown }

/** Exchange an authorization code for tokens — entirely server-side. */
export async function exchangeCodeForTokens(
  provider: SocialProvider, code: string, redirectUri: string
): Promise<{ ok: boolean; tokens?: RawTokens; error?: string }> {
  const creds = await providerAppCreds(provider);
  if (!creds) return { ok: false, error: `${provider} is not configured.` };
  const spec = PROVIDERS[provider];
  try {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: creds.id,
      client_secret: creds.secret,
    });
    const res = await fetch(spec.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: body.toString(),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || json?.error) return { ok: false, error: json?.error_description || json?.error?.message || json?.error || `Token exchange failed (${res.status}).` };
    if (!json?.access_token) return { ok: false, error: "No access_token in provider response." };
    return { ok: true, tokens: json as RawTokens };
  } catch (e: any) { return { ok: false, error: e?.message ?? "Token exchange request failed." }; }
}

export interface ConnectableAccount {
  external_id: string; account_name?: string; account_username?: string; avatar_url?: string;
  account_type?: string; config?: Record<string, unknown>;
  /** the token to persist for THIS entity (e.g. a FB Page token) — defaults to the user token */
  tokens?: RawTokens;
}

/**
 * Enumerate the connectable entities for a grant. Real Graph calls where feasible; on any failure
 * (or providers without a list endpoint) fall back to a single identity-derived account so the row
 * still persists. Token defaults to the user/grant token unless a per-entity token is returned.
 */
export async function fetchConnectableAccounts(provider: SocialProvider, tokens: RawTokens): Promise<ConnectableAccount[]> {
  const at = tokens.access_token;
  try {
    if (provider === "facebook" || provider === "instagram") {
      const res = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,username,access_token,picture,category&access_token=${encodeURIComponent(at)}`);
      const json: any = await res.json().catch(() => ({}));
      const pages: any[] = json?.data ?? [];
      if (provider === "facebook") {
        return pages.map((p) => ({
          external_id: String(p.id), account_name: p.name, account_username: p.username,
          avatar_url: p?.picture?.data?.url, account_type: "page",
          config: { category: p.category }, tokens: { access_token: p.access_token || at },
        }));
      }
      // instagram: resolve the IG business account behind each page
      const igs: ConnectableAccount[] = [];
      for (const p of pages) {
        const igRes = await fetch(`https://graph.facebook.com/v19.0/${p.id}?fields=instagram_business_account{id,username,name,profile_picture_url}&access_token=${encodeURIComponent(p.access_token || at)}`);
        const igJson: any = await igRes.json().catch(() => ({}));
        const ig = igJson?.instagram_business_account;
        if (ig?.id) igs.push({
          external_id: String(ig.id), account_name: ig.name || ig.username, account_username: ig.username,
          avatar_url: ig.profile_picture_url, account_type: "business_account",
          config: { facebook_page_id: p.id }, tokens: { access_token: p.access_token || at },
        });
      }
      return igs;
    }
    if (provider === "youtube") {
      const res = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", { headers: { Authorization: `Bearer ${at}` } });
      const json: any = await res.json().catch(() => ({}));
      const items: any[] = json?.items ?? [];
      return items.map((c) => ({
        external_id: String(c.id), account_name: c?.snippet?.title, account_username: c?.snippet?.customUrl,
        avatar_url: c?.snippet?.thumbnails?.default?.url, account_type: "channel",
      }));
    }
    if (provider === "linkedin") {
      const res = await fetch("https://api.linkedin.com/v2/me", { headers: { Authorization: `Bearer ${at}` } });
      const json: any = await res.json().catch(() => ({}));
      if (json?.id) return [{
        external_id: String(json.id),
        account_name: [json.localizedFirstName, json.localizedLastName].filter(Boolean).join(" ") || "LinkedIn",
        account_type: "profile",
      }];
    }
  } catch { /* fall through to identity fallback */ }
  // Fallback: a single opaque account keyed by a hash-free stable marker.
  return [{ external_id: `${provider}_self`, account_name: provider, account_type: "profile" }];
}

/** Persist one connected account, encrypting its tokens. Returns the row id. */
export async function storeSocialAccount(
  tenantId: string, provider: SocialProvider, account: ConnectableAccount, grantTokens: RawTokens, connectedBy: string, scopes: string[]
): Promise<string | null> {
  const supabase = createSupabaseServiceClient();
  const tokens = account.tokens ?? grantTokens;
  const encrypted_tokens = encryptSecret(JSON.stringify(tokens));
  const expiresIn = Number(tokens.expires_in ?? grantTokens.expires_in ?? 0);
  const token_expires_at = expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
  const { data, error } = await supabase.from("tenant_social_accounts").upsert(
    {
      tenant_id: tenantId, provider, external_id: account.external_id,
      account_name: account.account_name ?? null, account_username: account.account_username ?? null,
      avatar_url: account.avatar_url ?? null, account_type: account.account_type ?? null,
      scopes, status: "connected", token_expires_at, connected_by: connectedBy,
      config: account.config ?? {}, encrypted_tokens, updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,provider,external_id" }
  ).select("id").single();
  if (error) return null;
  return data?.id ?? null;
}

/** Where the provider redirects back. The callback Route Handler lives at this path. */
export function socialRedirectUri(provider: SocialProvider): string {
  const base = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.aibizconnect.app").replace(/\/+$/, "");
  return `${base}/api/social/callback/${provider}`;
}

interface OAuthState { tenantId: string; provider: SocialProvider; nonce: string; ts: number }

/** Opaque, server-verifiable OAuth state binding tenant+provider+nonce (encrypted). null if no key. */
export function makeOAuthState(tenantId: string, provider: SocialProvider): string | null {
  if (!encryptionReady()) return null;
  const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const payload: OAuthState = { tenantId, provider, nonce, ts: Date.now() };
  return Buffer.from(encryptSecret(JSON.stringify(payload)), "utf8").toString("base64url");
}

/** Decrypt + validate state. Enforces the 15-minute TTL. Returns null on any tampering/expiry. */
export function readOAuthState(state: string): OAuthState | null {
  try {
    const payload = JSON.parse(decryptSecret(Buffer.from(state, "base64url").toString("utf8"))) as OAuthState;
    if (!payload?.tenantId || !isSocialProvider(payload?.provider) || !payload?.nonce || !payload?.ts) return null;
    if (Date.now() - payload.ts > 15 * 60 * 1000) return null;
    return payload;
  } catch { return null; }
}

/**
 * SERVER-ONLY core of OAuth completion — NO auth gates. The caller MUST have already established
 * trust (a validated state in the callback, or requireTenantAccess+requireAdminWrite in the action).
 * Exchanges code→tokens, enumerates connectable entities, stores each with encrypted tokens, reflects
 * a non-secret tenant_integrations summary row, and audits.
 */
export async function completeOAuthCore(
  tenantId: string, provider: SocialProvider, code: string, connectedBy: string
): Promise<{ ok: boolean; connected: number; message?: string }> {
  const ex = await exchangeCodeForTokens(provider, code, socialRedirectUri(provider));
  if (!ex.ok || !ex.tokens) return { ok: false, connected: 0, message: ex.error };
  const accounts = await fetchConnectableAccounts(provider, ex.tokens);
  let connected = 0;
  for (const acct of accounts) {
    const id = await storeSocialAccount(tenantId, provider, acct, ex.tokens, connectedBy, PROVIDERS[provider].scopes);
    if (id) connected++;
  }
  const supabase = createSupabaseServiceClient();
  await supabase.from("tenant_integrations").upsert(
    { tenant_id: tenantId, provider, status: connected > 0 ? "connected" : "error", config: { kind: "social", account_count: connected }, updated_at: new Date().toISOString() },
    { onConflict: "tenant_id,provider" }
  );
  try {
    const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
    await logPlatformEvent({ action: "social.oauth_complete", actorEmail: connectedBy, meta: { tenantId, provider, connected } });
  } catch { /* best effort */ }
  if (connected === 0) return { ok: false, connected: 0, message: "OAuth succeeded but no connectable accounts were found." };
  return { ok: true, connected };
}

/** SERVER-ONLY: decrypt an account's tokens (for posting on the tenant's behalf). */
export async function getSocialTokens(tenantId: string, accountId: string): Promise<RawTokens | null> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from("tenant_social_accounts").select("encrypted_tokens").eq("tenant_id", tenantId).eq("id", accountId).maybeSingle();
  if (!data?.encrypted_tokens) return null;
  try { return JSON.parse(decryptSecret(data.encrypted_tokens as string)) as RawTokens; } catch { return null; }
}

/** Exchange a refresh token for a fresh access token — server-side (providers that support it). */
export async function refreshAccessToken(provider: SocialProvider, refreshToken: string): Promise<{ ok: boolean; tokens?: RawTokens; error?: string }> {
  const creds = await providerAppCreds(provider);
  if (!creds) return { ok: false, error: `${provider} is not configured.` };
  const spec = PROVIDERS[provider];
  try {
    const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: creds.id, client_secret: creds.secret });
    const res = await fetch(spec.tokenUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body: body.toString() });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || json?.error || !json?.access_token) return { ok: false, error: json?.error_description || json?.error || `Refresh failed (${res.status}).` };
    return { ok: true, tokens: json as RawTokens };
  } catch (e: any) { return { ok: false, error: e?.message ?? "Refresh request failed." }; }
}

/**
 * SERVER-ONLY: refresh an account's access token, re-encrypt, and update expiry. Preserves the
 * refresh_token when the provider omits it in the refresh response.
 */
export async function refreshSocialAccountToken(tenantId: string, accountId: string): Promise<{ ok: boolean; error?: string }> {
  const current = await getSocialTokens(tenantId, accountId);
  if (!current?.refresh_token) return { ok: false, error: "No refresh token stored for this account." };
  const supabase = createSupabaseServiceClient();
  const { data: row } = await supabase.from("tenant_social_accounts").select("provider").eq("tenant_id", tenantId).eq("id", accountId).maybeSingle();
  if (!row) return { ok: false, error: "Account not found." };
  const provider = row.provider as SocialProvider;
  const res = await refreshAccessToken(provider, current.refresh_token);
  if (!res.ok || !res.tokens) return { ok: false, error: res.error };
  const merged: RawTokens = { ...res.tokens, refresh_token: res.tokens.refresh_token ?? current.refresh_token };
  const expiresIn = Number(merged.expires_in ?? 0);
  const token_expires_at = expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
  await supabase.from("tenant_social_accounts").update({
    encrypted_tokens: encryptSecret(JSON.stringify(merged)), token_expires_at, status: "connected", updated_at: new Date().toISOString(),
  }).eq("tenant_id", tenantId).eq("id", accountId);
  return { ok: true };
}
