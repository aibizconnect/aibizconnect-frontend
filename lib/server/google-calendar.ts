import crypto from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { encryptSecret, decryptSecret, encryptionReady } from "./encryption";
import { SYSTEM_TENANT_ID } from "@/lib/media/system";
import { getIntegrationSecret } from "./integrations";

/**
 * Server-only Google Calendar connector (NOT "use server"). Per-CALENDAR connection so each agent's
 * own Google calendar is checked for FREE/BUSY before offering/booking a slot — no conflicts.
 *
 * Platform app creds: env GOOGLE_CALENDAR_CLIENT_ID / GOOGLE_CALENDAR_CLIENT_SECRET, else the
 * encrypted platform secret under SYSTEM_TENANT_ID, provider 'google_calendar_platform_app'
 * { client_id, client_secret }. Tokens stored encrypted in tenant_calendar_connections. Graceful
 * degradation when unconfigured (slots just fall back to internal-only availability).
 */

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",   // freebusy
  "https://www.googleapis.com/auth/calendar.events",     // create the booked event
  "https://www.googleapis.com/auth/userinfo.email",
];

export async function googleCalCreds(): Promise<{ id: string; secret: string } | null> {
  const id = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const secret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  if (id && secret) return { id, secret };
  try {
    const s = await getIntegrationSecret(SYSTEM_TENANT_ID, "google_calendar_platform_app");
    if (s?.client_id && s?.client_secret) return { id: String(s.client_id), secret: String(s.client_secret) };
  } catch { /* not configured */ }
  return null;
}
export async function googleCalReady(): Promise<boolean> { return !!(await googleCalCreds()); }

function appBase(): string {
  return (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.aibizconnect.app").replace(/\/+$/, "");
}
export function googleRedirectUri(): string { return `${appBase()}/api/calendar/google/callback`; }

interface GState { tenantId: string; calendarId: string; nonce: string; ts: number }
export function makeGoogleState(tenantId: string, calendarId: string): string | null {
  if (!encryptionReady()) return null;
  const payload: GState = { tenantId, calendarId, nonce: crypto.randomBytes(12).toString("hex"), ts: Date.now() };
  return Buffer.from(encryptSecret(JSON.stringify(payload)), "utf8").toString("base64url");
}
export function readGoogleState(state: string): GState | null {
  try {
    const p = JSON.parse(decryptSecret(Buffer.from(state, "base64url").toString("utf8"))) as GState;
    if (!p?.tenantId || !p?.calendarId || !p?.nonce || !p?.ts) return null;
    if (Date.now() - p.ts > 15 * 60 * 1000) return null;
    return p;
  } catch { return null; }
}

export async function buildGoogleAuthUrl(tenantId: string, calendarId: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  const creds = await googleCalCreds();
  if (!creds) return { ok: false, error: "Google Calendar isn't configured (missing platform app credentials)." };
  const state = makeGoogleState(tenantId, calendarId);
  if (!state) return { ok: false, error: "Set SETTINGS_ENCRYPTION_KEY first." };
  const params = new URLSearchParams({
    client_id: creds.id, redirect_uri: googleRedirectUri(), response_type: "code",
    scope: SCOPES.join(" "), access_type: "offline", prompt: "consent", include_granted_scopes: "true", state,
  });
  return { ok: true, url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
}

interface GoogleTokens { access_token: string; refresh_token?: string; expiry_date?: number; scope?: string }

/** SERVER-ONLY gate-free core: exchange code → tokens, store encrypted on the calendar connection. */
export async function completeGoogleConnectCore(tenantId: string, calendarId: string, code: string): Promise<{ ok: boolean; message?: string; email?: string }> {
  const creds = await googleCalCreds();
  if (!creds) return { ok: false, message: "Google Calendar isn't configured." };
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: creds.id, client_secret: creds.secret, redirect_uri: googleRedirectUri(), grant_type: "authorization_code" }),
    });
    const tok: any = await res.json().catch(() => ({}));
    if (!res.ok || !tok?.access_token) return { ok: false, message: tok?.error_description || tok?.error || `Token exchange failed (${res.status}).` };
    const tokens: GoogleTokens = { access_token: tok.access_token, refresh_token: tok.refresh_token, expiry_date: Date.now() + (tok.expires_in ?? 3600) * 1000, scope: tok.scope };

    let email = "";
    try {
      const u = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` } });
      const uj: any = await u.json().catch(() => ({})); email = uj?.email || "";
    } catch { /* email best-effort */ }

    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from("tenant_calendar_connections").upsert(
      { tenant_id: tenantId, calendar_id: calendarId, provider: "google", account_email: email || null, external_calendar_id: "primary", encrypted_tokens: encryptSecret(JSON.stringify(tokens)), status: "connected", updated_at: new Date().toISOString() },
      { onConflict: "tenant_id,calendar_id,provider" }
    );
    if (error) return { ok: false, message: error.message };
    return { ok: true, email };
  } catch (e: any) { return { ok: false, message: e?.message ?? "Google connection failed." }; }
}

export interface CalConnection { accountEmail: string | null; externalCalendarId: string; status: string }
export async function getCalendarConnection(tenantId: string, calendarId: string): Promise<CalConnection | null> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from("tenant_calendar_connections").select("account_email, external_calendar_id, status").eq("tenant_id", tenantId).eq("calendar_id", calendarId).eq("provider", "google").maybeSingle();
  return data ? { accountEmail: (data as any).account_email, externalCalendarId: (data as any).external_calendar_id || "primary", status: (data as any).status } : null;
}

export async function disconnectGoogle(tenantId: string, calendarId: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  await supabase.from("tenant_calendar_connections").delete().eq("tenant_id", tenantId).eq("calendar_id", calendarId).eq("provider", "google");
}

/** Get a valid access token (refresh if expired). Returns null if no/invalid connection. */
async function validAccessToken(tenantId: string, calendarId: string): Promise<{ token: string; externalCalendarId: string } | null> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from("tenant_calendar_connections").select("encrypted_tokens, external_calendar_id").eq("tenant_id", tenantId).eq("calendar_id", calendarId).eq("provider", "google").maybeSingle();
  if (!data?.encrypted_tokens) return null;
  let tokens: GoogleTokens;
  try { tokens = JSON.parse(decryptSecret(data.encrypted_tokens as string)); } catch { return null; }
  const externalCalendarId = (data as any).external_calendar_id || "primary";
  if (tokens.expiry_date && tokens.expiry_date > Date.now() + 60_000) return { token: tokens.access_token, externalCalendarId };
  // Refresh.
  const creds = await googleCalCreds();
  if (!creds || !tokens.refresh_token) return tokens.access_token ? { token: tokens.access_token, externalCalendarId } : null;
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: creds.id, client_secret: creds.secret, refresh_token: tokens.refresh_token, grant_type: "refresh_token" }),
    });
    const tok: any = await res.json().catch(() => ({}));
    if (res.ok && tok?.access_token) {
      const next: GoogleTokens = { access_token: tok.access_token, refresh_token: tokens.refresh_token, expiry_date: Date.now() + (tok.expires_in ?? 3600) * 1000, scope: tokens.scope };
      await supabase.from("tenant_calendar_connections").update({ encrypted_tokens: encryptSecret(JSON.stringify(next)), updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("calendar_id", calendarId).eq("provider", "google");
      return { token: tok.access_token, externalCalendarId };
    }
  } catch { /* fall through */ }
  return null;
}

export interface BusyInterval { start: number; end: number } // epoch ms
/** Free/busy of the connected Google calendar in [timeMin, timeMax]. Empty array if not connected. */
export async function getGoogleBusy(tenantId: string, calendarId: string, timeMinIso: string, timeMaxIso: string): Promise<BusyInterval[]> {
  const auth = await validAccessToken(tenantId, calendarId);
  if (!auth) return [];
  try {
    const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST", headers: { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ timeMin: timeMinIso, timeMax: timeMaxIso, items: [{ id: auth.externalCalendarId }] }),
    });
    const j: any = await res.json().catch(() => ({}));
    const busy = j?.calendars?.[auth.externalCalendarId]?.busy ?? [];
    return busy.map((b: any) => ({ start: new Date(b.start).getTime(), end: new Date(b.end).getTime() }));
  } catch { return []; }
}

/** Create the booked appointment as an event on the agent's Google calendar (best-effort). */
export async function createGoogleEvent(tenantId: string, calendarId: string, ev: { summary: string; description?: string; startIso: string; endIso: string; attendeeEmail?: string }): Promise<string | null> {
  const auth = await validAccessToken(tenantId, calendarId);
  if (!auth) return null;
  try {
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.externalCalendarId)}/events`, {
      method: "POST", headers: { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: ev.summary, description: ev.description,
        start: { dateTime: ev.startIso }, end: { dateTime: ev.endIso },
        ...(ev.attendeeEmail ? { attendees: [{ email: ev.attendeeEmail }] } : {}),
      }),
    });
    const j: any = await res.json().catch(() => ({}));
    return res.ok ? (j?.id ?? null) : null;
  } catch { return null; }
}

/** Outbound propagation of a reschedule/rename onto the mirrored Google event (D-243). */
export async function updateGoogleEvent(tenantId: string, calendarId: string, eventId: string, ev: { summary?: string; startIso?: string; endIso?: string }): Promise<boolean> {
  const auth = await validAccessToken(tenantId, calendarId);
  if (!auth) return false;
  try {
    const body: Record<string, unknown> = {};
    if (ev.summary != null) body.summary = ev.summary;
    if (ev.startIso) body.start = { dateTime: ev.startIso };
    if (ev.endIso) body.end = { dateTime: ev.endIso };
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.externalCalendarId)}/events/${encodeURIComponent(eventId)}`, {
      method: "PATCH", headers: { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch { return false; }
}

export async function deleteGoogleEvent(tenantId: string, calendarId: string, eventId: string): Promise<boolean> {
  const auth = await validAccessToken(tenantId, calendarId);
  if (!auth) return false;
  try {
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.externalCalendarId)}/events/${encodeURIComponent(eventId)}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${auth.token}` },
    });
    return res.ok || res.status === 404 || res.status === 410; // already gone = success
  } catch { return false; }
}
