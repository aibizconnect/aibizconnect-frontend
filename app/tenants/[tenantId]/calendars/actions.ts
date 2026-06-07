"use server";

import { listCalendars, createCalendar, updateCalendar, deleteCalendar, listAppointments, type Calendar, type Appointment, type CalendarInput, type CalendarPatch } from "@/lib/calendars";

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

// ── Google Calendar connect (per calendar) ──────────────────────────────────
async function requireAdmin(): Promise<void> {
  const { isPlatformAdmin } = await import("@/lib/auth/platform-admin");
  if (!(await isPlatformAdmin())) throw new Error("Not authorized — admin only.");
}

export async function getGoogleConnectUrl(tenantId: string, calendarId: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  const { requireTenantAccess } = await import("@/lib/auth/tenant-access");
  await requireTenantAccess(tenantId);
  try { await requireAdmin(); } catch (e: any) { return { ok: false, error: e?.message }; }
  const { buildGoogleAuthUrl } = await import("@/lib/server/google-calendar");
  return buildGoogleAuthUrl(tenantId, calendarId);
}

export interface GoogleCalStatus { ready: boolean; connected: boolean; accountEmail: string | null }
export async function getGoogleStatus(tenantId: string, calendarId: string): Promise<GoogleCalStatus> {
  const { requireTenantAccess } = await import("@/lib/auth/tenant-access");
  await requireTenantAccess(tenantId);
  const { googleCalReady, getCalendarConnection } = await import("@/lib/server/google-calendar");
  const [ready, conn] = await Promise.all([googleCalReady(), getCalendarConnection(tenantId, calendarId)]);
  return { ready, connected: !!conn, accountEmail: conn?.accountEmail ?? null };
}

export async function disconnectGoogleAction(tenantId: string, calendarId: string): Promise<{ ok: boolean; error?: string }> {
  const { requireTenantAccess } = await import("@/lib/auth/tenant-access");
  await requireTenantAccess(tenantId);
  try { await requireAdmin(); } catch (e: any) { return { ok: false, error: e?.message }; }
  const { disconnectGoogle } = await import("@/lib/server/google-calendar");
  await disconnectGoogle(tenantId, calendarId);
  return { ok: true };
}
