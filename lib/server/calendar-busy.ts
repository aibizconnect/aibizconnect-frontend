import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { encryptSecret, decryptSecret } from "./encryption";

/**
 * Unified availability across ALL external calendars connected to a booking calendar
 * (Google + Outlook + iCal). Used by lib/calendars to block conflicting slots and to mirror the
 * booking onto the connected providers (iCal is read-only).
 */
export interface BusyInterval { start: number; end: number; provider?: string }

export async function getAllBusy(tenantId: string, calendarId: string, minIso: string, maxIso: string): Promise<BusyInterval[]> {
  const sb = createSupabaseServiceClient();
  const { data } = await sb.from("tenant_calendar_connections").select("id, provider, encrypted_tokens").eq("tenant_id", tenantId).eq("calendar_id", calendarId);
  const conns = (data ?? []) as { id: string; provider: string; encrypted_tokens: string }[];
  if (!conns.length) return [];
  const tag = (xs: { start: number; end: number }[], provider: string) => xs.map((x) => ({ ...x, provider }));
  // Per connection ROW (D-251: several accounts per provider), in parallel — one account
  // failing must not block the others.
  const all = await Promise.all(conns.map(async (c): Promise<BusyInterval[]> => {
    try {
      if (c.provider === "google") { const { getGoogleBusy } = await import("./google-calendar"); return tag(await getGoogleBusy(tenantId, calendarId, minIso, maxIso, c.id), "google"); }
      if (c.provider === "microsoft") { const { getMsBusy } = await import("./microsoft-calendar"); return tag(await getMsBusy(tenantId, calendarId, minIso, maxIso, c.id), "microsoft"); }
      if (c.provider === "ical") {
        let url = ""; try { url = JSON.parse(decryptSecret(c.encrypted_tokens)).url; } catch { /* */ }
        if (url) { const { fetchICalBusy } = await import("./ical"); return tag(await fetchICalBusy(url, new Date(minIso).getTime(), new Date(maxIso).getTime()), "ical"); }
      }
    } catch { /* skip this account */ }
    return [];
  }));
  return all.flat();
}

/** A mirrored event's identity on one provider account — stored (JSON array) in
 *  tenant_appointments.external_event_id. connectionId pins the account (D-251);
 *  legacy refs without it fall back to the provider's first connection. */
export interface ExternalRef { provider: string; eventId: string; connectionId?: string }

/** Mirror a booking onto every connected write-capable account (Google, Outlook — D-251 v1:
 *  all accounts). Returns refs (with connection ids) for later update/delete propagation. */
export async function createExternalEvents(tenantId: string, calendarId: string, ev: { summary: string; description?: string; startIso: string; endIso: string; attendeeEmail?: string }): Promise<ExternalRef[]> {
  const sb = createSupabaseServiceClient();
  const { data } = await sb.from("tenant_calendar_connections").select("id, provider").eq("tenant_id", tenantId).eq("calendar_id", calendarId);
  const refs: ExternalRef[] = [];
  for (const c of (data ?? []) as { id: string; provider: string }[]) {
    try {
      if (c.provider === "google") {
        const { createGoogleEvent } = await import("./google-calendar");
        const id = await createGoogleEvent(tenantId, calendarId, ev, c.id);
        if (id) refs.push({ provider: "google", eventId: id, connectionId: c.id });
      } else if (c.provider === "microsoft") {
        const { createMsEvent } = await import("./microsoft-calendar");
        const id = await createMsEvent(tenantId, calendarId, ev, c.id);
        if (id) refs.push({ provider: "microsoft", eventId: id, connectionId: c.id });
      }
    } catch { /* best-effort */ }
  }
  return refs;
}

/** Propagate a reschedule/rename onto previously-mirrored events (best-effort, D-243). */
export async function updateExternalEvents(tenantId: string, calendarId: string, refs: ExternalRef[], ev: { summary?: string; startIso?: string; endIso?: string }): Promise<void> {
  for (const r of refs) {
    try {
      if (r.provider === "google") { const { updateGoogleEvent } = await import("./google-calendar"); await updateGoogleEvent(tenantId, calendarId, r.eventId, ev, r.connectionId); }
      else if (r.provider === "microsoft") { const { updateMsEvent } = await import("./microsoft-calendar"); await updateMsEvent(tenantId, calendarId, r.eventId, ev, r.connectionId); }
    } catch { /* best-effort */ }
  }
}

/** Remove previously-mirrored events (on delete/cancel — best-effort, D-243). */
export async function deleteExternalEvents(tenantId: string, calendarId: string, refs: ExternalRef[]): Promise<void> {
  for (const r of refs) {
    try {
      if (r.provider === "google") { const { deleteGoogleEvent } = await import("./google-calendar"); await deleteGoogleEvent(tenantId, calendarId, r.eventId, r.connectionId); }
      else if (r.provider === "microsoft") { const { deleteMsEvent } = await import("./microsoft-calendar"); await deleteMsEvent(tenantId, calendarId, r.eventId, r.connectionId); }
    } catch { /* best-effort */ }
  }
}

/** Connect an iCal (.ics) feed (read-only). The URL is stored encrypted on the connection;
 *  account_email carries the feed URL so several feeds can coexist and the UI can tell them apart. */
export async function connectICalFeed(tenantId: string, calendarId: string, url: string): Promise<{ ok: boolean; error?: string }> {
  const u = (url || "").trim();
  if (!/^(https?|webcal):\/\//i.test(u)) return { ok: false, error: "Enter a valid .ics URL (https:// or webcal://)." };
  const sb = createSupabaseServiceClient();
  const row = { tenant_id: tenantId, calendar_id: calendarId, provider: "ical", account_email: u.slice(0, 200), external_calendar_id: "ical", encrypted_tokens: encryptSecret(JSON.stringify({ url: u })), status: "connected", updated_at: new Date().toISOString() };
  const { data: existing } = await sb.from("tenant_calendar_connections").select("id")
    .eq("tenant_id", tenantId).eq("calendar_id", calendarId).eq("provider", "ical").eq("account_email", u.slice(0, 200)).maybeSingle();
  const { error } = existing
    ? await sb.from("tenant_calendar_connections").update(row).eq("id", (existing as any).id)
    : await sb.from("tenant_calendar_connections").insert(row);
  if (error && /duplicate key|unique/i.test(error.message)) {
    return { ok: false, error: "A second feed needs a DB upgrade — apply supabase/migrations/0048_multi_account_connections.sql first." };
  }
  return { ok: !error, error: error?.message };
}

export interface ProviderConn { id: string; provider: string; accountEmail: string | null; status: string }
export async function listConnections(tenantId: string, calendarId: string): Promise<ProviderConn[]> {
  const sb = createSupabaseServiceClient();
  const { data } = await sb.from("tenant_calendar_connections").select("id, provider, account_email, status").eq("tenant_id", tenantId).eq("calendar_id", calendarId).order("provider").order("account_email");
  return ((data ?? []) as any[]).map((c) => ({ id: c.id, provider: c.provider, accountEmail: c.account_email ?? null, status: c.status }));
}

/** Disconnect ONE account (by connection id) or, without an id, every connection of the provider. */
export async function disconnectProvider(tenantId: string, calendarId: string, provider: string, connectionId?: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  let q = sb.from("tenant_calendar_connections").delete().eq("tenant_id", tenantId).eq("calendar_id", calendarId).eq("provider", provider);
  if (connectionId) q = q.eq("id", connectionId);
  await q;
}
