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
