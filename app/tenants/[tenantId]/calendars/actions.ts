"use server";

import { listCalendars, createCalendar, deleteCalendar, listAppointments, type Calendar, type Appointment } from "@/lib/calendars";

export async function listCalendarsAction(tenantId: string): Promise<Calendar[]> { return listCalendars(tenantId); }

export async function createCalendarAction(tenantId: string, name: string, durationMin: number): Promise<{ ok: boolean; error?: string; calendars: Calendar[] }> {
  const r = await createCalendar(tenantId, name, durationMin);
  return { ...r, calendars: await listCalendars(tenantId) };
}

export async function deleteCalendarAction(tenantId: string, id: string): Promise<{ calendars: Calendar[] }> {
  await deleteCalendar(tenantId, id);
  return { calendars: await listCalendars(tenantId) };
}

export async function listAppointmentsAction(tenantId: string, calendarId: string): Promise<Appointment[]> {
  return listAppointments(tenantId, calendarId);
}
