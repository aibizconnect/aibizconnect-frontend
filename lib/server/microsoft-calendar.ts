import crypto from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { encryptSecret, decryptSecret, encryptionReady } from "./encryption";
import { SYSTEM_TENANT_ID } from "@/lib/media/system";
import { getIntegrationSecret } from "./integrations";

/**
 * Server-only Microsoft (Outlook) Calendar connector. Per-calendar OAuth (Azure AD, common tenant) →
 * the agent's Outlook busy times block bookings, and the booking is mirrored as an Outlook event.
 * Platform creds: env MICROSOFT_CALENDAR_CLIENT_ID/SECRET, else platform secret
 * 'microsoft_calendar_platform_app' { client_id, client_secret }. Tokens encrypted in
 * tenant_calendar_connections (provider='microsoft').
 */

const AUTH = "https://login.microsoftonline.com/common/oauth2/v2.0";
const SCOPES = ["offline_access", "openid", "email", "User.Read", "Calendars.ReadWrite"];

export async function msCalCreds(): Promise<{ id: string; secret: string } | null> {
  const id = process.env.MICROSOFT_CALENDAR_CLIENT_ID;
  const secret = process.env.MICROSOFT_CALENDAR_CLIENT_SECRET;
  if (id && secret) return { id, secret };
  try {
    const s = await getIntegrationSecret(SYSTEM_TENANT_ID, "microsoft_calendar_platform_app");
    if (s?.client_id && s?.client_secret) return { id: String(s.client_id), secret: String(s.client_secret) };
  } catch { /* not configured */ }
  return null;
}
export async function msCalReady(): Promise<boolean> { return !!(await msCalCreds()); }

function appBase(): string { return (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.aibizconnect.app").replace(/\/+$/, ""); }
export function msRedirectUri(): string { return `${appBase()}/api/calendar/microsoft/callback`; }

interface MState { tenantId: string; calendarId: string; nonce: string; ts: number }
export function makeMsState(tenantId: string, calendarId: string): string | null {
  if (!encryptionReady()) return null;
  const payload: MState = { tenantId, calendarId, nonce: crypto.randomBytes(12).toString("hex"), ts: Date.now() };
  return Buffer.from(encryptSecret(JSON.stringify(payload)), "utf8").toString("base64url");
}
export function readMsState(state: string): MState | null {
  try {
    const p = JSON.parse(decryptSecret(Buffer.from(state, "base64url").toString("utf8"))) as MState;
    if (!p?.tenantId || !p?.calendarId || !p?.nonce || !p?.ts) return null;
    if (Date.now() - p.ts > 15 * 60 * 1000) return null;
    return p;
  } catch { return null; }
}

export async function buildMsAuthUrl(tenantId: string, calendarId: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  const creds = await msCalCreds();
  if (!creds) return { ok: false, error: "Outlook Calendar isn't configured (missing platform app credentials)." };
  const state = makeMsState(tenantId, calendarId);
  if (!state) return { ok: false, error: "Set SETTINGS_ENCRYPTION_KEY first." };
  const params = new URLSearchParams({ client_id: creds.id, response_type: "code", redirect_uri: msRedirectUri(), response_mode: "query", scope: SCOPES.join(" "), state });
  return { ok: true, url: `${AUTH}/authorize?${params.toString()}` };
}

interface MsTokens { access_token: string; refresh_token?: string; expiry_date?: number }

export async function completeMsConnectCore(tenantId: string, calendarId: string, code: string): Promise<{ ok: boolean; message?: string; email?: string }> {
  const creds = await msCalCreds();
  if (!creds) return { ok: false, message: "Outlook Calendar isn't configured." };
  try {
    const res = await fetch(`${AUTH}/token`, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: creds.id, client_secret: creds.secret, code, redirect_uri: msRedirectUri(), grant_type: "authorization_code", scope: SCOPES.join(" ") }),
    });
    const tok: any = await res.json().catch(() => ({}));
    if (!res.ok || !tok?.access_token) return { ok: false, message: tok?.error_description || tok?.error || `Token exchange failed (${res.status}).` };
    const tokens: MsTokens = { access_token: tok.access_token, refresh_token: tok.refresh_token, expiry_date: Date.now() + (tok.expires_in ?? 3600) * 1000 };
    let email = "";
    try { const u = await fetch("https://graph.microsoft.com/v1.0/me", { headers: { Authorization: `Bearer ${tokens.access_token}` } }); const uj: any = await u.json().catch(() => ({})); email = uj?.mail || uj?.userPrincipalName || ""; } catch { /* */ }

    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from("tenant_calendar_connections").upsert(
      { tenant_id: tenantId, calendar_id: calendarId, provider: "microsoft", account_email: email || null, external_calendar_id: "primary", encrypted_tokens: encryptSecret(JSON.stringify(tokens)), status: "connected", updated_at: new Date().toISOString() },
      { onConflict: "tenant_id,calendar_id,provider" }
    );
    if (error) return { ok: false, message: error.message };
    return { ok: true, email };
  } catch (e: any) { return { ok: false, message: e?.message ?? "Outlook connection failed." }; }
}

async function validMsToken(tenantId: string, calendarId: string): Promise<string | null> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from("tenant_calendar_connections").select("encrypted_tokens").eq("tenant_id", tenantId).eq("calendar_id", calendarId).eq("provider", "microsoft").maybeSingle();
  if (!data?.encrypted_tokens) return null;
  let tokens: MsTokens; try { tokens = JSON.parse(decryptSecret(data.encrypted_tokens as string)); } catch { return null; }
  if (tokens.expiry_date && tokens.expiry_date > Date.now() + 60_000) return tokens.access_token;
  const creds = await msCalCreds();
  if (!creds || !tokens.refresh_token) return tokens.access_token ?? null;
  try {
    const res = await fetch(`${AUTH}/token`, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: creds.id, client_secret: creds.secret, refresh_token: tokens.refresh_token, grant_type: "refresh_token", scope: SCOPES.join(" ") }),
    });
    const tok: any = await res.json().catch(() => ({}));
    if (res.ok && tok?.access_token) {
      const next: MsTokens = { access_token: tok.access_token, refresh_token: tok.refresh_token || tokens.refresh_token, expiry_date: Date.now() + (tok.expires_in ?? 3600) * 1000 };
      await supabase.from("tenant_calendar_connections").update({ encrypted_tokens: encryptSecret(JSON.stringify(next)), updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("calendar_id", calendarId).eq("provider", "microsoft");
      return tok.access_token;
    }
  } catch { /* */ }
  return null;
}

export interface BusyInterval { start: number; end: number }
export async function getMsBusy(tenantId: string, calendarId: string, minIso: string, maxIso: string): Promise<BusyInterval[]> {
  const token = await validMsToken(tenantId, calendarId);
  if (!token) return [];
  try {
    const url = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${encodeURIComponent(minIso)}&endDateTime=${encodeURIComponent(maxIso)}&$select=start,end,showAs&$top=200`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="UTC"' } });
    const j: any = await res.json().catch(() => ({}));
    const items: any[] = j?.value ?? [];
    return items
      .filter((e) => ["busy", "tentative", "oof", "workingElsewhere"].includes(String(e?.showAs)))
      .map((e) => ({ start: new Date(e.start?.dateTime + "Z").getTime(), end: new Date(e.end?.dateTime + "Z").getTime() }))
      .filter((b) => Number.isFinite(b.start) && Number.isFinite(b.end));
  } catch { return []; }
}

export async function createMsEvent(tenantId: string, calendarId: string, ev: { summary: string; description?: string; startIso: string; endIso: string; attendeeEmail?: string }): Promise<string | null> {
  const token = await validMsToken(tenantId, calendarId);
  if (!token) return null;
  try {
    const res = await fetch("https://graph.microsoft.com/v1.0/me/events", {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: ev.summary,
        body: { contentType: "Text", content: ev.description || "" },
        start: { dateTime: ev.startIso.replace(/Z$/, ""), timeZone: "UTC" },
        end: { dateTime: ev.endIso.replace(/Z$/, ""), timeZone: "UTC" },
        ...(ev.attendeeEmail ? { attendees: [{ emailAddress: { address: ev.attendeeEmail }, type: "required" }] } : {}),
      }),
    });
    const j: any = await res.json().catch(() => ({}));
    return res.ok ? (j?.id ?? null) : null;
  } catch { return null; }
}
