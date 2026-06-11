"use server";

import {
  listCalendars, createCalendar, updateCalendar, deleteCalendar, listAppointments,
  listEntriesRange, createManualAppointment, createBlockedTime, updateEntry, deleteEntry,
  type Calendar, type Appointment, type CalendarInput, type CalendarPatch,
  type CalendarEntry, type ManualAppointmentInput, type EntryPatch,
} from "@/lib/calendars";

export async function listCalendarsAction(tenantId: string): Promise<Calendar[]> { return listCalendars(tenantId); }

export async function createCalendarAction(tenantId: string, input: CalendarInput): Promise<{ ok: boolean; error?: string; calendars: Calendar[] }> {
  const r = await createCalendar(tenantId, input);
  return { ...r, calendars: await listCalendars(tenantId) };
}

export async function updateCalendarAction(tenantId: string, id: string, patch: CalendarPatch): Promise<{ ok: boolean; error?: string; calendars: Calendar[] }> {
  const r = await updateCalendar(tenantId, id, patch);
  return { ...r, calendars: await listCalendars(tenantId) };
}

export async function deleteCalendarAction(tenantId: string, id: string): Promise<{ calendars: Calendar[] }> {
  await deleteCalendar(tenantId, id);
  return { calendars: await listCalendars(tenantId) };
}

export async function listAppointmentsAction(tenantId: string, calendarId: string): Promise<Appointment[]> {
  return listAppointments(tenantId, calendarId);
}

// ── GHL-parity (D-225, Blueprint v3.2): calendar grid + manual entries ───────
async function requireTenant(tenantId: string): Promise<void> {
  const { requireTenantAccess } = await import("@/lib/auth/tenant-access");
  await requireTenantAccess(tenantId);
}
async function audit(tenantId: string, action: string, meta: Record<string, unknown>): Promise<void> {
  try {
    const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
    await logPlatformEvent({ action, meta: { tenantId, ...meta } });
  } catch { /* audit is best-effort — never blocks the operation */ }
}

export async function listEntriesRangeAction(tenantId: string, fromISO: string, toISO: string, calendarIds?: string[]): Promise<CalendarEntry[]> {
  await requireTenant(tenantId);
  return listEntriesRange(tenantId, { fromISO, toISO, calendarIds });
}

export async function createManualAppointmentAction(tenantId: string, input: ManualAppointmentInput): Promise<{ ok: boolean; error?: string }> {
  await requireTenant(tenantId);
  const r = await createManualAppointment(tenantId, input);
  if (r.ok) await audit(tenantId, "calendar.appointment.create", { calendarId: input.calendarId, startAt: input.startAt, source: "manual" });
  return r;
}

export async function createBlockedTimeAction(tenantId: string, input: { calendarId: string; startAt: string; endAt: string; title?: string }): Promise<{ ok: boolean; error?: string }> {
  await requireTenant(tenantId);
  const r = await createBlockedTime(tenantId, input);
  if (r.ok) await audit(tenantId, "calendar.blocked.create", { calendarId: input.calendarId, startAt: input.startAt, endAt: input.endAt });
  return r;
}

export async function updateEntryAction(tenantId: string, id: string, patch: EntryPatch): Promise<{ ok: boolean; error?: string }> {
  await requireTenant(tenantId);
  const r = await updateEntry(tenantId, id, patch);
  if (r.ok) await audit(tenantId, "calendar.entry.update", { id, patch });
  return r;
}

export async function deleteEntryAction(tenantId: string, id: string): Promise<{ ok: boolean; error?: string }> {
  await requireTenant(tenantId);
  const r = await deleteEntry(tenantId, id);
  if (r.ok) await audit(tenantId, "calendar.entry.delete", { id });
  return r;
}

// ── Google Calendar connect (per calendar) ──────────────────────────────────
async function requireAdmin(): Promise<void> {
  const { isPlatformAdmin } = await import("@/lib/auth/platform-admin");
  if (!(await isPlatformAdmin())) throw new Error("Not authorized — admin only.");
}

export async function getCalendarConnectUrl(tenantId: string, calendarId: string, provider: "google" | "microsoft"): Promise<{ ok: boolean; url?: string; error?: string }> {
  const { requireTenantAccess } = await import("@/lib/auth/tenant-access");
  await requireTenantAccess(tenantId);
  try { await requireAdmin(); } catch (e: any) { return { ok: false, error: e?.message }; }
  if (provider === "microsoft") { const { buildMsAuthUrl } = await import("@/lib/server/microsoft-calendar"); return buildMsAuthUrl(tenantId, calendarId); }
  const { buildGoogleAuthUrl } = await import("@/lib/server/google-calendar"); return buildGoogleAuthUrl(tenantId, calendarId);
}

export async function connectIcalAction(tenantId: string, calendarId: string, url: string): Promise<{ ok: boolean; error?: string }> {
  const { requireTenantAccess } = await import("@/lib/auth/tenant-access");
  await requireTenantAccess(tenantId);
  try { await requireAdmin(); } catch (e: any) { return { ok: false, error: e?.message }; }
  const { connectICalFeed } = await import("@/lib/server/calendar-busy");
  return connectICalFeed(tenantId, calendarId, url);
}

export interface CalendarConnectionsStatus {
  googleReady: boolean; microsoftReady: boolean;
  connections: { provider: string; accountEmail: string | null; status: string }[];
}
export async function getCalendarConnections(tenantId: string, calendarId: string): Promise<CalendarConnectionsStatus> {
  const { requireTenantAccess } = await import("@/lib/auth/tenant-access");
  await requireTenantAccess(tenantId);
  const { googleCalReady } = await import("@/lib/server/google-calendar");
  const { msCalReady } = await import("@/lib/server/microsoft-calendar");
  const { listConnections } = await import("@/lib/server/calendar-busy");
  const [googleReady, microsoftReady, connections] = await Promise.all([googleCalReady(), msCalReady(), listConnections(tenantId, calendarId)]);
  return { googleReady, microsoftReady, connections };
}

export async function disconnectProviderAction(tenantId: string, calendarId: string, provider: string): Promise<{ ok: boolean; error?: string }> {
  const { requireTenantAccess } = await import("@/lib/auth/tenant-access");
  await requireTenantAccess(tenantId);
  try { await requireAdmin(); } catch (e: any) { return { ok: false, error: e?.message }; }
  const { disconnectProvider } = await import("@/lib/server/calendar-busy");
  await disconnectProvider(tenantId, calendarId, provider);
  return { ok: true };
}
