import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { encryptSecret, decryptSecret } from "./encryption";

/**
 * Unified availability across ALL external calendars connected to a booking calendar
 * (Google + Outlook + iCal). Used by lib/calendars to block conflicting slots and to mirror the
 * booking onto the connected providers (iCal is read-only).
 */
export interface BusyInterval { start: number; end: number }

export async function getAllBusy(tenantId: string, calendarId: string, minIso: string, maxIso: string): Promise<BusyInterval[]> {
  const sb = createSupabaseServiceClient();
  const { data } = await sb.from("tenant_calendar_connections").select("provider, encrypted_tokens").eq("tenant_id", tenantId).eq("calendar_id", calendarId);
  const conns = (data ?? []) as { provider: string; encrypted_tokens: string }[];
  if (!conns.length) return [];
  const out: BusyInterval[] = [];
  for (const c of conns) {
    try {
      if (c.provider === "google") { const { getGoogleBusy } = await import("./google-calendar"); out.push(...await getGoogleBusy(tenantId, calendarId, minIso, maxIso)); }
      else if (c.provider === "microsoft") { const { getMsBusy } = await import("./microsoft-calendar"); out.push(...await getMsBusy(tenantId, calendarId, minIso, maxIso)); }
      else if (c.provider === "ical") {
        let url = ""; try { url = JSON.parse(decryptSecret(c.encrypted_tokens)).url; } catch { /* */ }
        if (url) { const { fetchICalBusy } = await import("./ical"); out.push(...await fetchICalBusy(url, new Date(minIso).getTime(), new Date(maxIso).getTime())); }
      }
    } catch { /* one provider failing must not block the others */ }
  }
  return out;
}

/** Mirror a confirmed booking onto every connected provider that supports writes (Google, Outlook). */
export async function createExternalEvents(tenantId: string, calendarId: string, ev: { summary: string; description?: string; startIso: string; endIso: string; attendeeEmail?: string }): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { data } = await sb.from("tenant_calendar_connections").select("provider").eq("tenant_id", tenantId).eq("calendar_id", calendarId);
  for (const c of (data ?? []) as { provider: string }[]) {
    try {
      if (c.provider === "google") { const { createGoogleEvent } = await import("./google-calendar"); await createGoogleEvent(tenantId, calendarId, ev); }
      else if (c.provider === "microsoft") { const { createMsEvent } = await import("./microsoft-calendar"); await createMsEvent(tenantId, calendarId, ev); }
    } catch { /* best-effort */ }
  }
}

/** Connect an iCal (.ics) feed (read-only). The URL is stored encrypted on the connection. */
export async function connectICalFeed(tenantId: string, calendarId: string, url: string): Promise<{ ok: boolean; error?: string }> {
  const u = (url || "").trim();
  if (!/^(https?|webcal):\/\//i.test(u)) return { ok: false, error: "Enter a valid .ics URL (https:// or webcal://)." };
  const sb = createSupabaseServiceClient();
  const { error } = await sb.from("tenant_calendar_connections").upsert(
    { tenant_id: tenantId, calendar_id: calendarId, provider: "ical", account_email: null, external_calendar_id: "ical", encrypted_tokens: encryptSecret(JSON.stringify({ url: u })), status: "connected", updated_at: new Date().toISOString() },
    { onConflict: "tenant_id,calendar_id,provider" }
  );
  return { ok: !error, error: error?.message };
}

export interface ProviderConn { provider: string; accountEmail: string | null; status: string }
export async function listConnections(tenantId: string, calendarId: string): Promise<ProviderConn[]> {
  const sb = createSupabaseServiceClient();
  const { data } = await sb.from("tenant_calendar_connections").select("provider, account_email, status").eq("tenant_id", tenantId).eq("calendar_id", calendarId);
  return ((data ?? []) as any[]).map((c) => ({ provider: c.provider, accountEmail: c.account_email ?? null, status: c.status }));
}

export async function disconnectProvider(tenantId: string, calendarId: string, provider: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  await sb.from("tenant_calendar_connections").delete().eq("tenant_id", tenantId).eq("calendar_id", calendarId).eq("provider", provider);
}
