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

    // Manual upsert keyed by ACCOUNT (D-251): several Outlook accounts can back one calendar.
    const supabase = createSupabaseServiceClient();
    const row = { tenant_id: tenantId, calendar_id: calendarId, provider: "microsoft", account_email: email || null, external_calendar_id: "primary", encrypted_tokens: encryptSecret(JSON.stringify(tokens)), status: "connected", updated_at: new Date().toISOString() };
    let exq = supabase.from("tenant_calendar_connections").select("id").eq("tenant_id", tenantId).eq("calendar_id", calendarId).eq("provider", "microsoft");
    exq = email ? exq.eq("account_email", email) : exq.is("account_email", null);
    const { data: existing } = await exq.maybeSingle();
    const { error } = existing
      ? await supabase.from("tenant_calendar_connections").update(row).eq("id", (existing as any).id)
      : await supabase.from("tenant_calendar_connections").insert(row);
    if (error) {
      return { ok: false, message: /duplicate key|unique/i.test(error.message)
        ? "A second account needs a DB upgrade - apply supabase/migrations/0048_multi_account_connections.sql first."
        : error.message };
    }
    return { ok: true, email };
  } catch (e: any) { return { ok: false, message: e?.message ?? "Outlook connection failed." }; }
}

async function validMsToken(tenantId: string, calendarId: string, connectionId?: string): Promise<string | null> {
  const supabase = createSupabaseServiceClient();
  let q = supabase.from("tenant_calendar_connections").select("id, encrypted_tokens").eq("tenant_id", tenantId).eq("calendar_id", calendarId).eq("provider", "microsoft");
  if (connectionId) q = q.eq("id", connectionId);
  const { data: rows } = await q.limit(1);
  const data = rows?.[0];
  if (!data?.encrypted_tokens) return null;
  const rowId = (data as any).id as string;
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
      await supabase.from("tenant_calendar_connections").update({ encrypted_tokens: encryptSecret(JSON.stringify(next)), updated_at: new Date().toISOString() }).eq("id", rowId);
      return tok.access_token;
    }
  } catch { /* */ }
  return null;
}

export interface BusyInterval { start: number; end: number }
/** Busy across ALL the account's calendars (D-252), not just the default one. */
export async function getMsBusy(tenantId: string, calendarId: string, minIso: string, maxIso: string, connectionId?: string): Promise<BusyInterval[]> {
  const token = await validMsToken(tenantId, calendarId, connectionId);
  if (!token) return [];
  const view = async (path: string): Promise<BusyInterval[]> => {
    const url = `https://graph.microsoft.com/v1.0${path}/calendarView?startDateTime=${encodeURIComponent(minIso)}&endDateTime=${encodeURIComponent(maxIso)}&$select=start,end,showAs&$top=200`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="UTC"' } });
    const j: any = await res.json().catch(() => ({}));
    return ((j?.value ?? []) as any[])
      .filter((e) => ["busy", "tentative", "oof", "workingElsewhere"].includes(String(e?.showAs)))
      .map((e) => ({ start: new Date(e.start?.dateTime + "Z").getTime(), end: new Date(e.end?.dateTime + "Z").getTime() }))
      .filter((b) => Number.isFinite(b.start) && Number.isFinite(b.end));
  };
  try {
    let calIds: string[] = [];
    try {
      const lr = await fetch("https://graph.microsoft.com/v1.0/me/calendars?$select=id&$top=20", { headers: { Authorization: `Bearer ${token}` } });
      const lj: any = await lr.json().catch(() => ({}));
      calIds = ((lj?.value ?? []) as any[]).map((c) => c.id).filter(Boolean);
    } catch { /* default-only fallback */ }
    if (!calIds.length) return await view("/me");
    const all = await Promise.all(calIds.map((id) => view(`/me/calendars/${encodeURIComponent(id)}`).catch(() => [] as BusyInterval[])));
    return all.flat();
  } catch { return []; }
}

export async function createMsEvent(tenantId: string, calendarId: string, ev: { summary: string; description?: string; startIso: string; endIso: string; attendeeEmail?: string }, connectionId?: string): Promise<string | null> {
  const token = await validMsToken(tenantId, calendarId, connectionId);
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

/** Outbound propagation of a reschedule/rename onto the mirrored Outlook event (D-243). */
export async function updateMsEvent(tenantId: string, calendarId: string, eventId: string, ev: { summary?: string; startIso?: string; endIso?: string }, connectionId?: string): Promise<boolean> {
  const token = await validMsToken(tenantId, calendarId, connectionId);
  if (!token) return false;
  try {
    const body: Record<string, unknown> = {};
    if (ev.summary != null) body.subject = ev.summary;
    if (ev.startIso) body.start = { dateTime: ev.startIso.replace(/Z$/, ""), timeZone: "UTC" };
    if (ev.endIso) body.end = { dateTime: ev.endIso.replace(/Z$/, ""), timeZone: "UTC" };
    const res = await fetch(`https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`, {
      method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch { return false; }
}

export async function deleteMsEvent(tenantId: string, calendarId: string, eventId: string, connectionId?: string): Promise<boolean> {
  const token = await validMsToken(tenantId, calendarId, connectionId);
  if (!token) return false;
  try {
    const res = await fetch(`https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok || res.status === 404 || res.status === 410;
  } catch { return false; }
}
