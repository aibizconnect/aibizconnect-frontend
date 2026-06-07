import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createContact } from "./crm";

/**
 * Calendars — booking calendars + appointments. A visitor books a slot on a public
 * booking page → an appointment is created AND a Contact lands in the CRM (lead capture).
 * No sends/charges (confirmation emails are a later, gated step).
 */
function service(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

export interface Calendar {
  id: string; name: string; slug: string; durationMin: number; bufferMin: number;
  weekdays: number[]; startHour: number; endHour: number; timezone: string | null;
  assignedToEmail: string | null; assignedToName: string | null;
}
export interface Appointment { id: string; name: string; email: string; startAt: string; status: string; }

const slugify = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "call";

function rowToCal(r: any): Calendar {
  return {
    id: r.id, name: r.name, slug: r.slug, durationMin: r.duration_min, bufferMin: r.buffer_min ?? 0,
    weekdays: r.weekdays ?? [1, 2, 3, 4, 5], startHour: r.start_hour, endHour: r.end_hour, timezone: r.timezone ?? null,
    assignedToEmail: r.assigned_to_email ?? null, assignedToName: r.assigned_to_name ?? null,
  };
}

export async function listCalendars(tenantId: string): Promise<Calendar[]> {
  const { data } = await service().from("tenant_calendars").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  return (data ?? []).map(rowToCal);
}
export async function getCalendarBySlug(tenantId: string, slug: string): Promise<Calendar | null> {
  const { data } = await service().from("tenant_calendars").select("*").eq("tenant_id", tenantId).eq("slug", slug).maybeSingle();
  return data ? rowToCal(data) : null;
}
export interface CalendarInput { name: string; durationMin?: number; assignedToEmail?: string; assignedToName?: string; timezone?: string }
export async function createCalendar(tenantId: string, input: CalendarInput): Promise<{ ok: boolean; error?: string }> {
  const name = (input.name || "").trim() || "Discovery Call";
  const { error } = await service().from("tenant_calendars").insert({
    tenant_id: tenantId, name, slug: slugify(name) || "call", duration_min: input.durationMin ?? 30,
    assigned_to_email: input.assignedToEmail || null, assigned_to_name: input.assignedToName || null, timezone: input.timezone || null,
  });
  return { ok: !error, error: error?.message };
}

export interface CalendarPatch {
  name?: string; durationMin?: number; bufferMin?: number; weekdays?: number[]; startHour?: number; endHour?: number;
  timezone?: string; assignedToEmail?: string; assignedToName?: string;
}
export async function updateCalendar(tenantId: string, id: string, patch: CalendarPatch): Promise<{ ok: boolean; error?: string }> {
  const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name != null) { upd.name = patch.name.trim() || "Calendar"; upd.slug = slugify(patch.name) || "call"; }
  if (patch.durationMin != null) upd.duration_min = patch.durationMin;
  if (patch.bufferMin != null) upd.buffer_min = patch.bufferMin;
  if (patch.weekdays != null) upd.weekdays = patch.weekdays;
  if (patch.startHour != null) upd.start_hour = patch.startHour;
  if (patch.endHour != null) upd.end_hour = patch.endHour;
  if (patch.timezone != null) upd.timezone = patch.timezone;
  if (patch.assignedToEmail != null) upd.assigned_to_email = patch.assignedToEmail;
  if (patch.assignedToName != null) upd.assigned_to_name = patch.assignedToName;
  const { error } = await service().from("tenant_calendars").update(upd).eq("tenant_id", tenantId).eq("id", id);
  return { ok: !error, error: error?.message };
}
export async function deleteCalendar(tenantId: string, id: string): Promise<void> {
  const sb = service();
  await sb.from("tenant_appointments").delete().eq("tenant_id", tenantId).eq("calendar_id", id);
  await sb.from("tenant_calendars").delete().eq("tenant_id", tenantId).eq("id", id);
}

export async function listAppointments(tenantId: string, calendarId: string): Promise<Appointment[]> {
  const { data } = await service().from("tenant_appointments").select("id,name,email,start_at,status").eq("tenant_id", tenantId).eq("calendar_id", calendarId).order("start_at");
  return (data ?? []).map((r: any) => ({ id: r.id, name: r.name ?? "", email: r.email ?? "", startAt: r.start_at, status: r.status }));
}

/** Generate bookable slots for the next `days` days, excluding already-booked times. */
export async function availableSlots(tenantId: string, cal: Calendar, days = 14): Promise<{ date: string; slots: string[] }[]> {
  const sb = service();
  const { data: booked } = await sb.from("tenant_appointments").select("start_at").eq("tenant_id", tenantId).eq("calendar_id", cal.id).eq("status", "booked");
  const taken = new Set((booked ?? []).map((b: any) => new Date(b.start_at).toISOString()));
  const out: { date: string; slots: string[] }[] = [];
  const now = new Date();
  for (let d = 0; d < days; d++) {
    const day = new Date(now); day.setDate(now.getDate() + d); day.setHours(0, 0, 0, 0);
    if (!cal.weekdays.includes(day.getDay())) continue;
    const slots: string[] = [];
    for (let h = cal.startHour; h < cal.endHour; h++) {
      for (let m = 0; m < 60; m += cal.durationMin) {
        const slot = new Date(day); slot.setHours(h, m, 0, 0);
        if (slot <= now) continue;
        if (taken.has(slot.toISOString())) continue;
        slots.push(slot.toISOString());
      }
    }
    if (slots.length) out.push({ date: day.toISOString().slice(0, 10), slots });
  }
  return out;
}

/** Public booking: create an appointment + a CRM contact (lead). */
export async function bookAppointment(tenantId: string, calendarId: string, b: { name: string; email: string; phone?: string; startAt: string }): Promise<{ ok: boolean; error?: string }> {
  const sb = service();
  // guard against double-booking the same slot
  const { data: clash } = await sb.from("tenant_appointments").select("id").eq("tenant_id", tenantId).eq("calendar_id", calendarId).eq("start_at", b.startAt).eq("status", "booked").maybeSingle();
  if (clash) return { ok: false, error: "That time was just taken — pick another." };
  const { error } = await sb.from("tenant_appointments").insert({ tenant_id: tenantId, calendar_id: calendarId, name: b.name, email: b.email, phone: b.phone, start_at: b.startAt });
  if (error) return { ok: false, error: error.message };
  await createContact(tenantId, { name: b.name, email: b.email, phone: b.phone, source: "calendar booking" });
  return { ok: true };
}
