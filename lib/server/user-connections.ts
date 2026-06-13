import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { encryptSecret } from "./encryption";

/**
 * Per-seat personal connections (D-337..341). Each tenant user connects their OWN email /
 * calendar / drive accounts. SERVER-ONLY. A seat sees only their own rows (filtered by
 * user_id). Secrets (OAuth tokens, IMAP creds) live encrypted in encrypted_tokens; never
 * returned to a client. Graceful missing-table degradation until migration 0063 is applied.
 */

export type UserProvider =
  | "imap_smtp" | "google_calendar" | "microsoft_calendar" | "google_drive"
  | "google_contacts" | "onedrive" | "dropbox" | "gmail" | "outlook";

/** Non-secret view of a connection (safe to send to the client). */
export interface UserConnectionView {
  id: string; provider: UserProvider; accountEmail: string | null; status: string; createdAt: string;
}

const svc = () => createSupabaseServiceClient();

export async function listUserConnections(tenantId: string, userKey: string): Promise<UserConnectionView[]> {
  if (!userKey) return [];
  const { data, error } = await svc()
    .from("tenant_user_connections")
    .select("id, provider, account_email, status, created_at")
    .eq("tenant_id", tenantId).eq("user_id", userKey)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map((r: any) => ({ id: r.id, provider: r.provider, accountEmail: r.account_email ?? null, status: r.status, createdAt: r.created_at }));
}

export interface ImapCreds {
  email: string;
  imapHost: string; imapPort: number; imapUser: string; imapPass: string;
  smtpHost: string; smtpPort: number; smtpUser: string; smtpPass: string;
}

/** Save (or update) a personal IMAP/SMTP email connection — credentials encrypted. */
export async function saveImapConnection(tenantId: string, userKey: string, c: ImapCreds): Promise<{ ok: boolean; error?: string }> {
  if (!userKey) return { ok: false, error: "Not signed in." };
  if (!c.email || !c.imapHost || !c.imapUser || !c.imapPass) return { ok: false, error: "Email, IMAP host, username and password are required." };
  const encrypted = encryptSecret(JSON.stringify({
    imapHost: c.imapHost, imapPort: c.imapPort || 993, imapUser: c.imapUser, imapPass: c.imapPass,
    smtpHost: c.smtpHost || c.imapHost, smtpPort: c.smtpPort || 587, smtpUser: c.smtpUser || c.imapUser, smtpPass: c.smtpPass || c.imapPass,
  }));
  const { error } = await svc().from("tenant_user_connections").upsert({
    tenant_id: tenantId, user_id: userKey, provider: "imap_smtp", account_email: c.email,
    status: "connected", encrypted_tokens: encrypted, config: { imapHost: c.imapHost, smtpHost: c.smtpHost || c.imapHost },
    updated_at: new Date().toISOString(),
  }, { onConflict: "tenant_id,user_id,provider,account_email" });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Record an OAuth-based personal connection (used by per-seat OAuth callbacks). */
export async function recordOAuthConnection(
  tenantId: string, userKey: string, provider: UserProvider,
  accountEmail: string | null, tokens: Record<string, unknown>, scopes: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (!userKey) return { ok: false, error: "Not signed in." };
  const { error } = await svc().from("tenant_user_connections").upsert({
    tenant_id: tenantId, user_id: userKey, provider, account_email: accountEmail,
    status: "connected", scopes, encrypted_tokens: encryptSecret(JSON.stringify(tokens)),
    updated_at: new Date().toISOString(),
  }, { onConflict: "tenant_id,user_id,provider,account_email" });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteUserConnection(tenantId: string, userKey: string, id: string): Promise<void> {
  if (!userKey) return;
  await svc().from("tenant_user_connections").delete().eq("tenant_id", tenantId).eq("user_id", userKey).eq("id", id);
}
