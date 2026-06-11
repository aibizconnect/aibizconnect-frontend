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

/** Full calendar entry (GHL-parity, D-225): appointments AND blocked time, with real end
 *  times. Pre-migration rows surface with endAt=null (renderers default to the calendar's
 *  duration) and kind="appointment". kind="external_busy" entries are SYNTHETIC (D-242):
 *  busy windows from the connected personal calendar, read-only, never stored. */
export interface CalendarEntry {
  id: string; calendarId: string;
  kind: "appointment" | "blocked" | "external_busy";
  source: string;                       // booking | manual | sync
  title: string | null;
  name: string; email: string; phone: string | null;
  startAt: string; endAt: string | null;
  status: string;                       // booked | confirmed | cancelled | completed | no_show
  notes: string | null;
  createdAt: string | null;
}

function rowToEntry(r: any): CalendarEntry {
  return {
    id: r.id, calendarId: r.calendar_id,
    kind: r.kind === "blocked" ? "blocked" : "appointment",
    source: r.source ?? "booking",
    title: r.title ?? null,
    name: r.name ?? "", email: r.email ?? "", phone: r.phone ?? null,
    startAt: r.start_at, endAt: r.end_at ?? null,
    status: r.status ?? "booked",
    notes: r.notes ?? null,
    createdAt: r.created_at ?? null,
  };
}

/** Friendly error when the 0043 migration hasn't been applied yet. */
const MIGRATION_HINT = "Calendar upgrade pending — apply supabase/migrations/0043_calendar_parity.sql first.";
const isMissingColumn = (msg?: string) => !!msg && /column .* does not exist|could not find/i.test(msg);
/** Pre-0047 DBs still carry the v0 exact-start unique index, which blocks forced double-booking. */
const SLOT_IDX_HINT = "Same-start override needs a DB upgrade — apply supabase/migrations/0047_drop_slot_unique.sql first.";
const isSlotIdx = (msg?: string) => !!msg && /tenant_appointments_slot_idx/i.test(msg);

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

// ── GHL-parity API (D-225) ──────────────────────────────────────────────────

const PROVIDER_LABEL: Record<string, string> = { google: "Google", microsoft: "Outlook", ical: "iCal" };

/** Mirrored-event refs live as a JSON array in tenant_appointments.external_event_id (text). */
function decodeRefs(text: unknown): { provider: string; eventId: string }[] {
  if (typeof text !== "string" || !text) return [];
  try { const a = JSON.parse(text); return Array.isArray(a) ? a.filter((r) => r?.provider && r?.eventId) : []; } catch { return []; }
}

/** Every entry (appointments + blocked time) in [fromISO, toISO), optionally per calendar.
 *  includeExternalBusy=true (D-242) appends the connected personal calendar's busy windows
 *  as synthetic read-only entries so staff SEE conflicts on the grid. */
export async function listEntriesRange(
  tenantId: string,
  opts: { fromISO: string; toISO: string; calendarIds?: string[]; includeExternalBusy?: boolean },
): Promise<CalendarEntry[]> {
  let q = service().from("tenant_appointments").select("*")
    .eq("tenant_id", tenantId)
    .gte("start_at", opts.fromISO).lt("start_at", opts.toISO)
    .order("start_at");
  if (opts.calendarIds?.length) q = q.in("calendar_id", opts.calendarIds);
  const { data } = await q;
  const entries = (data ?? []).map(rowToEntry);
  if (!opts.includeExternalBusy) return entries;

  let calIds = opts.calendarIds ?? [];
  if (!calIds.length) calIds = (await listCalendars(tenantId)).map((c) => c.id);
  // Internal intervals per calendar, minute precision — used to drop the echo of events WE
  // mirrored out (they'd otherwise show twice: our chip + a "Busy" chip at the same time).
  const own = new Set(entries.map((e) => `${e.calendarId}|${e.startAt.slice(0, 16)}|${(e.endAt ?? "").slice(0, 16)}`));
  try {
    const { getAllBusy } = await import("./server/calendar-busy");
    for (const calId of calIds) {
      const busy = await getAllBusy(tenantId, calId, opts.fromISO, opts.toISO);
      for (const b of busy) {
        const startAt = new Date(b.start).toISOString();
        const endAt = new Date(b.end).toISOString();
        if (own.has(`${calId}|${startAt.slice(0, 16)}|${endAt.slice(0, 16)}`)) continue;
        const label = PROVIDER_LABEL[b.provider ?? ""] ?? "personal calendar";
        entries.push({
          id: `sync-${calId}-${b.provider ?? "ext"}-${b.start}`,
          calendarId: calId, kind: "external_busy", source: "sync",
          title: `Busy — ${label}`, name: "", email: "", phone: null,
          startAt, endAt, status: "busy", notes: null, createdAt: null,
        });
      }
    }
    entries.sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
  } catch { /* connectors unavailable → internal-only view */ }
  return entries;
}

// ── Conflict detection (D-241): one shared checker for every write path ─────
export interface ConflictInfo { label: string; startAt: string; endAt: string }

/** Everything that overlaps [startISO, endISO) on this calendar: live internal appointments,
 *  blocked windows, AND the connected personal calendar's busy times (labeled by provider). */
export async function findConflicts(
  tenantId: string, calendarId: string, startISO: string, endISO: string, excludeEntryId?: string,
): Promise<ConflictInfo[]> {
  const startMs = new Date(startISO).getTime();
  const endMs = new Date(endISO).getTime();
  const out: ConflictInfo[] = [];

  const { data: rows } = await service().from("tenant_appointments").select("*")
    .eq("tenant_id", tenantId).eq("calendar_id", calendarId)
    .in("status", ["booked", "confirmed"])
    .gte("start_at", new Date(startMs - 24 * 3600_000).toISOString())
    .lt("start_at", endISO);
  for (const r of (rows ?? []) as any[]) {
    if (excludeEntryId && r.id === excludeEntryId) continue;
    const s = new Date(r.start_at).getTime();
    const e = r.end_at ? new Date(r.end_at).getTime() : s + 30 * 60_000;
    if (startMs < e && endMs > s) {
      out.push({
        label: r.kind === "blocked" ? `Blocked time (${r.title || "Blocked"})` : (r.title || r.name || "an appointment"),
        startAt: new Date(s).toISOString(), endAt: new Date(e).toISOString(),
      });
    }
  }

  try {
    const { getAllBusy } = await import("./server/calendar-busy");
    const busy = await getAllBusy(tenantId, calendarId, startISO, endISO);
    for (const b of busy) {
      if (startMs < b.end && endMs > b.start) {
        out.push({
          label: `personal calendar (${PROVIDER_LABEL[b.provider ?? ""] ?? "connected"})`,
          startAt: new Date(b.start).toISOString(), endAt: new Date(b.end).toISOString(),
        });
      }
    }
  } catch { /* connectors unavailable → internal-only check */ }
  return out;
}

const conflictMessage = (cs: ConflictInfo[]) => {
  const f = (iso: string) => new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return `This time conflicts with ${cs.slice(0, 3).map((c) => `${c.label} (${f(c.startAt)}–${new Date(c.endAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })})`).join("; ")}${cs.length > 3 ? ` and ${cs.length - 3} more` : ""}.`;
};

export interface ManualAppointmentInput {
  calendarId: string; title?: string; name?: string; email?: string; phone?: string;
  startAt: string; endAt?: string; notes?: string;
  /** D-241: skip the conflict warning after the user explicitly confirms "book anyway". */
  force?: boolean;
}
/** Staff-created appointment ("+ New" on the calendar). Checks conflicts against internal
 *  entries AND the connected personal calendar (D-241, warn + override), then mirrors onto
 *  connected providers and stores the refs for later propagation (D-243/D-244). No sends. */
export async function createManualAppointment(tenantId: string, input: ManualAppointmentInput): Promise<{ ok: boolean; error?: string; conflicts?: ConflictInfo[] }> {
  const sb = service();
  const { data: cal } = await sb.from("tenant_calendars").select("duration_min, name").eq("tenant_id", tenantId).eq("id", input.calendarId).maybeSingle();
  const durMin = (cal as any)?.duration_min ?? 30;
  const endAt = input.endAt || new Date(new Date(input.startAt).getTime() + durMin * 60_000).toISOString();

  if (!input.force) {
    const conflicts = await findConflicts(tenantId, input.calendarId, input.startAt, endAt);
    if (conflicts.length) return { ok: false, error: conflictMessage(conflicts), conflicts };
  }

  const title = (input.title || "").trim() || "Appointment";
  const { data: inserted, error } = await sb.from("tenant_appointments").insert({
    tenant_id: tenantId, calendar_id: input.calendarId,
    title,
    name: input.name || null, email: input.email || null, phone: input.phone || null,
    start_at: input.startAt, end_at: endAt, notes: input.notes || null,
    kind: "appointment", source: "manual", status: "booked",
  }).select("id").single();
  if (error) return { ok: false, error: isMissingColumn(error.message) ? MIGRATION_HINT : isSlotIdx(error.message) ? SLOT_IDX_HINT : error.message };
  if (input.email) {
    try { await createContact(tenantId, { name: input.name || input.email, email: input.email, phone: input.phone, source: "manual appointment" }); } catch { /* best-effort */ }
  }
  await mirrorOut(tenantId, input.calendarId, (inserted as any)?.id, {
    summary: input.name ? `${title} — ${input.name}` : title,
    description: `Created in AIBizConnect.${input.name ? `\nName: ${input.name}` : ""}${input.email ? `\nEmail: ${input.email}` : ""}`,
    startIso: input.startAt, endIso: endAt, attendeeEmail: input.email || undefined,
  });
  return { ok: true };
}

/** Mirror an internal appointment onto connected providers and persist the refs (best-effort). */
async function mirrorOut(tenantId: string, calendarId: string, entryId: string | undefined, ev: { summary: string; description?: string; startIso: string; endIso: string; attendeeEmail?: string }): Promise<void> {
  try {
    const { createExternalEvents } = await import("./server/calendar-busy");
    const refs = await createExternalEvents(tenantId, calendarId, ev);
    if (refs.length && entryId) {
      await service().from("tenant_appointments").update({ external_event_id: JSON.stringify(refs) }).eq("tenant_id", tenantId).eq("id", entryId);
    }
  } catch { /* best-effort */ }
}

/** Block a window on a calendar — no bookings allowed inside it (gray hatched on the grid). */
export async function createBlockedTime(
  tenantId: string,
  input: { calendarId: string; startAt: string; endAt: string; title?: string },
): Promise<{ ok: boolean; error?: string }> {
  if (new Date(input.endAt) <= new Date(input.startAt)) return { ok: false, error: "End must be after start." };
  const { error } = await service().from("tenant_appointments").insert({
    tenant_id: tenantId, calendar_id: input.calendarId,
    title: (input.title || "").trim() || "Blocked",
    start_at: input.startAt, end_at: input.endAt,
    kind: "blocked", source: "manual", status: "booked",
  });
  if (error) return { ok: false, error: isMissingColumn(error.message) ? MIGRATION_HINT : error.message };
  return { ok: true };
}

export interface EntryPatch {
  status?: string; startAt?: string; endAt?: string; title?: string; notes?: string; calendarId?: string;
  /** D-241: skip the conflict warning after the user explicitly confirms. */
  force?: boolean;
}
export async function updateEntry(tenantId: string, id: string, patch: EntryPatch): Promise<{ ok: boolean; error?: string; conflicts?: ConflictInfo[] }> {
  const sb = service();
  const { data: cur } = await sb.from("tenant_appointments").select("*").eq("tenant_id", tenantId).eq("id", id).maybeSingle();
  if (!cur) return { ok: false, error: "Entry not found." };

  // Reschedule conflict check (D-241): appointments only — blocking over things is intentional.
  const timingChanged = patch.startAt != null || patch.endAt != null || patch.calendarId != null;
  const calId = patch.calendarId ?? (cur as any).calendar_id;
  const startAt = patch.startAt ?? (cur as any).start_at;
  const endAt = patch.endAt ?? (cur as any).end_at ?? new Date(new Date(startAt).getTime() + 30 * 60_000).toISOString();
  if (timingChanged && (cur as any).kind !== "blocked" && !patch.force) {
    const conflicts = await findConflicts(tenantId, calId, startAt, endAt, id);
    if (conflicts.length) return { ok: false, error: conflictMessage(conflicts), conflicts };
  }

  const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.status != null) upd.status = patch.status;
  if (patch.startAt != null) upd.start_at = patch.startAt;
  if (patch.endAt != null) upd.end_at = patch.endAt;
  if (patch.title != null) upd.title = patch.title;
  if (patch.notes != null) upd.notes = patch.notes;
  if (patch.calendarId != null) upd.calendar_id = patch.calendarId;
  const { error } = await sb.from("tenant_appointments").update(upd).eq("tenant_id", tenantId).eq("id", id);
  if (error) return { ok: false, error: isMissingColumn(error.message) ? MIGRATION_HINT : isSlotIdx(error.message) ? SLOT_IDX_HINT : error.message };

  // Outbound propagation onto mirrored events (D-243/D-244, best-effort).
  const refs = decodeRefs((cur as any).external_event_id);
  try {
    const { updateExternalEvents, deleteExternalEvents } = await import("./server/calendar-busy");
    if (patch.status === "cancelled" && refs.length) {
      // Cancelled here must free the personal calendar too.
      await deleteExternalEvents(tenantId, calId, refs);
      await sb.from("tenant_appointments").update({ external_event_id: null }).eq("tenant_id", tenantId).eq("id", id);
    } else if ((timingChanged || patch.title != null) && refs.length) {
      await updateExternalEvents(tenantId, calId, refs, { summary: patch.title ?? undefined, startIso: patch.startAt ?? undefined, endIso: patch.endAt ?? undefined });
    } else if (patch.status != null && patch.status !== "cancelled" && (cur as any).status === "cancelled" && !refs.length && (cur as any).kind !== "blocked") {
      // Un-cancelled → re-mirror.
      await mirrorOut(tenantId, calId, id, {
        summary: (cur as any).title || (cur as any).name || "Appointment",
        startIso: startAt, endIso: endAt, attendeeEmail: (cur as any).email || undefined,
      });
    }
  } catch { /* best-effort */ }
  return { ok: true };
}

export async function deleteEntry(tenantId: string, id: string): Promise<{ ok: boolean; error?: string }> {
  const sb = service();
  const { data: cur } = await sb.from("tenant_appointments").select("calendar_id, external_event_id").eq("tenant_id", tenantId).eq("id", id).maybeSingle();
  const { error } = await sb.from("tenant_appointments").delete().eq("tenant_id", tenantId).eq("id", id);
  if (!error && cur) {
    const refs = decodeRefs((cur as any).external_event_id);
    if (refs.length) {
      try { const { deleteExternalEvents } = await import("./server/calendar-busy"); await deleteExternalEvents(tenantId, (cur as any).calendar_id, refs); } catch { /* best-effort */ }
    }
  }
  return { ok: !error, error: error?.message };
}

/** Generate bookable slots for the next `days` days, excluding internally-booked times AND the agent's
 *  Google Calendar busy times (when connected), with the calendar's buffer applied. */
export async function availableSlots(tenantId: string, cal: Calendar, days = 14): Promise<{ date: string; slots: string[] }[]> {
  const sb = service();
  const now = new Date();
  const windowEnd = new Date(now); windowEnd.setDate(now.getDate() + days);

  const bufferMs = (cal.bufferMin ?? 0) * 60_000;
  const durMs = cal.durationMin * 60_000;

  // Internal busy windows: live appointments AND blocked time (D-225/CAL-V8), as real
  // intervals — end_at when present, else start + duration (legacy rows).
  const { data: booked } = await sb.from("tenant_appointments").select("*")
    .eq("tenant_id", tenantId).eq("calendar_id", cal.id)
    .in("status", ["booked", "confirmed"]);
  const internal = (booked ?? []).map((r: any) => {
    const start = new Date(r.start_at).getTime();
    return { start, end: r.end_at ? new Date(r.end_at).getTime() : start + durMs };
  });

  // External free/busy across every connected provider (Google + Outlook + iCal). No-op if none.
  let busy: { start: number; end: number }[] = [];
  try {
    const { getAllBusy } = await import("./server/calendar-busy");
    busy = await getAllBusy(tenantId, cal.id, now.toISOString(), windowEnd.toISOString());
  } catch { /* connectors unavailable → internal-only */ }
  busy = busy.concat(internal);

  const clashes = (startMs: number) => {
    const s = startMs - bufferMs, e = startMs + durMs + bufferMs;
    return busy.some((b) => s < b.end && e > b.start);
  };

  const out: { date: string; slots: string[] }[] = [];
  for (let d = 0; d < days; d++) {
    const day = new Date(now); day.setDate(now.getDate() + d); day.setHours(0, 0, 0, 0);
    if (!cal.weekdays.includes(day.getDay())) continue;
    const slots: string[] = [];
    for (let h = cal.startHour; h < cal.endHour; h++) {
      for (let m = 0; m < 60; m += cal.durationMin) {
        const slot = new Date(day); slot.setHours(h, m, 0, 0);
        if (slot <= now) continue;
        if (clashes(slot.getTime())) continue;
        slots.push(slot.toISOString());
      }
    }
    if (slots.length) out.push({ date: day.toISOString().slice(0, 10), slots });
  }
  return out;
}

/** Public booking: create an appointment + a CRM contact (lead) + (if connected) a Google event. */
export async function bookAppointment(tenantId: string, calendarId: string, b: { name: string; email: string; phone?: string; startAt: string }): Promise<{ ok: boolean; error?: string }> {
  const sb = service();
  const { data: cal } = await sb.from("tenant_calendars").select("duration_min, name").eq("tenant_id", tenantId).eq("id", calendarId).maybeSingle();
  const durMin = (cal as any)?.duration_min ?? 30;
  const startMs = new Date(b.startAt).getTime();
  const endIso = new Date(startMs + durMin * 60_000).toISOString();

  // Guard against double-booking: interval overlap vs every live entry — appointments AND
  // blocked time (D-225/CAL-V8) — not just exact start equality.
  const { data: dayRows } = await sb.from("tenant_appointments").select("*")
    .eq("tenant_id", tenantId).eq("calendar_id", calendarId)
    .in("status", ["booked", "confirmed"])
    .gte("start_at", new Date(startMs - 24 * 3600_000).toISOString())
    .lt("start_at", endIso);
  const endMs = startMs + durMin * 60_000;
  const overlaps = (dayRows ?? []).some((r: any) => {
    const s = new Date(r.start_at).getTime();
    const e = r.end_at ? new Date(r.end_at).getTime() : s + durMin * 60_000;
    return startMs < e && endMs > s;
  });
  if (overlaps) return { ok: false, error: "That time was just taken — pick another." };

  // Re-check the agent's Google calendar at booking time (avoid a race with their real calendar).
  try {
    const { getAllBusy } = await import("./server/calendar-busy");
    const busy = await getAllBusy(tenantId, calendarId, b.startAt, endIso);
    if (busy.some((x) => startMs < x.end && (startMs + durMin * 60_000) > x.start)) {
      return { ok: false, error: "That time is no longer available — pick another." };
    }
  } catch { /* connectors unavailable → internal-only guard */ }

  let inserted: any = null;
  let { data: ins, error } = await sb.from("tenant_appointments").insert({ tenant_id: tenantId, calendar_id: calendarId, name: b.name, email: b.email, phone: b.phone, start_at: b.startAt, end_at: endIso, kind: "appointment", source: "booking" }).select("id").single();
  inserted = ins;
  if (error && isMissingColumn(error.message)) {
    // 0043 not applied yet → legacy shape still books fine.
    ({ data: inserted, error } = await sb.from("tenant_appointments").insert({ tenant_id: tenantId, calendar_id: calendarId, name: b.name, email: b.email, phone: b.phone, start_at: b.startAt }).select("id").single());
  }
  if (error) return { ok: false, error: error.message };
  await createContact(tenantId, { name: b.name, email: b.email, phone: b.phone, source: "calendar booking" });

  // Mirror onto every connected provider that supports writes (Google, Outlook) — best-effort,
  // storing the refs so reschedule/cancel propagates (D-243/D-244).
  await mirrorOut(tenantId, calendarId, inserted?.id, {
    summary: `${(cal as any)?.name || "Appointment"} — ${b.name}`,
    description: `Booked via AIBizConnect.\nName: ${b.name}\nEmail: ${b.email}${b.phone ? `\nPhone: ${b.phone}` : ""}`,
    startIso: b.startAt, endIso, attendeeEmail: b.email,
  });

  return { ok: true };
}
