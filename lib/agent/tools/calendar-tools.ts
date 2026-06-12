import { z } from "zod";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Agent Calendar Tools (D-261..D-263, Blueprint v3.2) — the VA-ready surface for AI agents
 * to book, reschedule and cancel appointments FOR PEOPLE. Thin, typed, AUDITED wrappers
 * around the battle-tested calendar core, so every call inherits for free:
 *   - timezone-correct slot generation (D-250)
 *   - conflict checks vs internal entries + EVERY connected personal calendar (D-241/D-252)
 *   - provider mirroring with native Google/Outlook invites + cancellation notices (D-243/D-256)
 *   - the transactional confirmation/reminder engine gates (D-257)
 * Uniform return: { ok, data?, error?, conflicts? } so an agent runtime can chain calls.
 * Invocation stays manual/orchestrator-gated — this file adds CAPABILITY, not autonomy.
 */

const audit = async (tenantId: string, op: string, meta: Record<string, unknown>) => {
  try {
    const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
    await logPlatformEvent({ action: `agent.calendar.${op}`, meta: { tenantId, ...meta } });
  } catch { /* audit is best-effort */ }
};

type ToolResult<T> = { ok: true; data: T } | { ok: false; error: string; conflicts?: { label: string; startAt: string; endAt: string }[] };

// ── list calendars ───────────────────────────────────────────────────────────
export async function toolListCalendars(tenantId: string): Promise<ToolResult<{ id: string; slug: string; name: string; durationMin: number; timezone: string | null; host: string | null }[]>> {
  const { listCalendars } = await import("@/lib/calendars");
  const cals = await listCalendars(tenantId);
  return { ok: true, data: cals.map((c) => ({ id: c.id, slug: c.slug, name: c.name, durationMin: c.durationMin, timezone: c.timezone, host: c.assignedToName || c.assignedToEmail })) };
}

// ── availability ─────────────────────────────────────────────────────────────
const availabilityInput = z.object({ calendar: z.string().min(1), days: z.number().int().min(1).max(31).default(14) });
export async function toolGetAvailability(tenantId: string, raw: unknown): Promise<ToolResult<{ date: string; slots: string[] }[]>> {
  const p = availabilityInput.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Invalid input." };
  const { listCalendars, availableSlots } = await import("@/lib/calendars");
  const cals = await listCalendars(tenantId);
  const cal = cals.find((c) => c.id === p.data.calendar || c.slug === p.data.calendar);
  if (!cal) return { ok: false, error: `No calendar "${p.data.calendar}" — options: ${cals.map((c) => c.slug).join(", ")}` };
  const days = await availableSlots(tenantId, cal, p.data.days);
  return { ok: true, data: days };
}

// ── find a person's appointments ─────────────────────────────────────────────
const findInput = z.object({ email: z.string().email().optional(), phone: z.string().min(7).optional() }).refine((v) => v.email || v.phone, "Provide an email or phone.");
export async function toolFindAppointments(tenantId: string, raw: unknown): Promise<ToolResult<{ id: string; calendarId: string; title: string | null; startAt: string; endAt: string | null; status: string; venue: string | null }[]>> {
  const p = findInput.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Invalid input." };
  const sb = createSupabaseServiceClient();
  let q = sb.from("tenant_appointments").select("*")
    .eq("tenant_id", tenantId)
    .in("status", ["booked", "confirmed"])
    .gte("start_at", new Date().toISOString())
    .order("start_at").limit(20);
  if (p.data.email) q = q.eq("email", p.data.email.toLowerCase());
  else q = q.eq("phone", p.data.phone!);
  const { data, error } = await q;
  if (error) return { ok: false, error: error.message };
  await audit(tenantId, "find", { by: p.data.email ? "email" : "phone", found: (data ?? []).length });
  return {
    ok: true,
    data: ((data ?? []) as any[]).filter((r) => (r.kind ?? "appointment") === "appointment").map((r) => ({
      id: r.id, calendarId: r.calendar_id, title: r.title ?? null, startAt: r.start_at, endAt: r.end_at ?? null,
      status: r.status, venue: r.venue?.label ? `${r.venue.label}${r.venue.detail ? `: ${r.venue.detail}` : ""}` : null,
    })),
  };
}

// ── book ─────────────────────────────────────────────────────────────────────
const bookInput = z.object({
  calendar: z.string().min(1),
  startAt: z.string().datetime(),
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  venueIdx: z.number().int().min(0).max(20).optional(),
  invitees: z.array(z.string().email()).max(5).optional(),
});
export async function toolBookAppointment(tenantId: string, raw: unknown): Promise<ToolResult<{ booked: true; startAt: string }>> {
  const p = bookInput.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Invalid input." };
  const { listCalendars, bookAppointment } = await import("@/lib/calendars");
  const cals = await listCalendars(tenantId);
  const cal = cals.find((c) => c.id === p.data.calendar || c.slug === p.data.calendar);
  if (!cal) return { ok: false, error: `No calendar "${p.data.calendar}".` };
  const r = await bookAppointment(tenantId, cal.id, {
    name: p.data.name, email: p.data.email, phone: p.data.phone, startAt: p.data.startAt,
    venueIdx: p.data.venueIdx, invitees: p.data.invitees,
  });
  if (!r.ok) return { ok: false, error: r.error ?? "Could not book." };
  await audit(tenantId, "book", { calendarId: cal.id, startAt: p.data.startAt, email: p.data.email });
  return { ok: true, data: { booked: true, startAt: p.data.startAt } };
}

// ── reschedule ───────────────────────────────────────────────────────────────
const reschedInput = z.object({
  appointmentId: z.string().uuid(),
  newStartAt: z.string().datetime(),
  durationMin: z.number().int().min(5).max(480).optional(),
  /** Set true ONLY after the customer explicitly confirmed despite a conflict warning. */
  force: z.boolean().optional(),
});
export async function toolRescheduleAppointment(tenantId: string, raw: unknown): Promise<ToolResult<{ rescheduled: true; startAt: string }>> {
  const p = reschedInput.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Invalid input." };
  const sb = createSupabaseServiceClient();
  const { data: cur } = await sb.from("tenant_appointments").select("start_at, end_at").eq("tenant_id", tenantId).eq("id", p.data.appointmentId).maybeSingle();
  if (!cur) return { ok: false, error: "Appointment not found." };
  const oldDur = (cur as any).end_at ? (+new Date((cur as any).end_at) - +new Date((cur as any).start_at)) / 60_000 : 30;
  const mins = p.data.durationMin ?? Math.max(5, Math.round(oldDur));
  const endAt = new Date(new Date(p.data.newStartAt).getTime() + mins * 60_000).toISOString();
  const { updateEntry } = await import("@/lib/calendars");
  const r = await updateEntry(tenantId, p.data.appointmentId, { startAt: p.data.newStartAt, endAt, force: p.data.force });
  if (!r.ok) return { ok: false, error: r.error ?? "Could not reschedule.", conflicts: r.conflicts };
  await audit(tenantId, "reschedule", { id: p.data.appointmentId, newStartAt: p.data.newStartAt, forced: !!p.data.force });
  return { ok: true, data: { rescheduled: true, startAt: p.data.newStartAt } };
}

// ── cancel ───────────────────────────────────────────────────────────────────
const cancelInput = z.object({ appointmentId: z.string().uuid(), reason: z.string().max(300).optional() });
export async function toolCancelAppointment(tenantId: string, raw: unknown): Promise<ToolResult<{ cancelled: true }>> {
  const p = cancelInput.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Invalid input." };
  const { updateEntry } = await import("@/lib/calendars");
  // Status → cancelled frees the slot AND removes the mirrored provider events with
  // attendee cancellation notices (D-243).
  const r = await updateEntry(tenantId, p.data.appointmentId, { status: "cancelled", notes: p.data.reason });
  if (!r.ok) return { ok: false, error: r.error ?? "Could not cancel." };
  await audit(tenantId, "cancel", { id: p.data.appointmentId, reason: p.data.reason ?? null });
  return { ok: true, data: { cancelled: true } };
}

/** Tool manifest (D-263): discovery surface for agent runtimes / future MCP exposure. */
export const CALENDAR_TOOL_MANIFEST = [
  { name: "calendar.list", description: "List the tenant's booking calendars (id, slug, name, duration, timezone, host).", params: {} },
  { name: "calendar.availability", description: "Timezone-correct open slots for a calendar (conflicts with the host's connected personal calendars already excluded).", params: { calendar: "calendar id or slug", days: "1-31, default 14" } },
  { name: "calendar.find", description: "A person's upcoming appointments by email or phone.", params: { email: "optional", phone: "optional (one required)" } },
  { name: "calendar.book", description: "Book a slot for a person: creates the appointment + CRM contact, sends native calendar invites + confirmation email, schedules reminders.", params: { calendar: "id or slug", startAt: "ISO datetime (an open slot)", name: "", email: "", phone: "optional", venueIdx: "optional index into the calendar's venues", invitees: "optional guest emails (≤5)" } },
  { name: "calendar.reschedule", description: "Move an appointment. Refuses with a conflict list unless force=true (set only after the customer confirms). Mirrored events update + attendees are notified.", params: { appointmentId: "uuid", newStartAt: "ISO datetime", durationMin: "optional", force: "optional boolean" } },
  { name: "calendar.cancel", description: "Cancel an appointment: frees the slot, removes mirrored events, attendees get cancellation notices.", params: { appointmentId: "uuid", reason: "optional" } },
] as const;
