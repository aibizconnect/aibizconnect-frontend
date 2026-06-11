import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Appointment confirmations + reminders (D-256/D-257, Blueprint v3.2) — TRANSACTIONAL,
 * owner-directed. Gates: per-calendar reminders toggles AND a configured channel
 * (verified email identity for email, connected Twilio for SMS) — nothing sends without
 * both. Idempotent via tenant_appointments.reminders_sent markers; safe to run every
 * 15 min or twice in a row. Marketing sends remain forbidden platform-wide.
 */

export interface AppointmentEmailInput {
  kind: "confirmation" | "day_before" | "morning_of";
  to: string[];
  calendarName: string;
  timezone: string;
  startIso: string;
  endIso?: string | null;
  bookerName?: string | null;
  venueLine?: string | null;
}

function whenLine(startIso: string, endIso: string | null | undefined, tz: string): string {
  const start = new Date(startIso);
  const day = start.toLocaleDateString("en-CA", { timeZone: tz, weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const t = (d: Date) => d.toLocaleTimeString("en-CA", { timeZone: tz, hour: "numeric", minute: "2-digit" });
  return `${day}, ${t(start)}${endIso ? ` – ${t(new Date(endIso))}` : ""} (${tz.replace(/_/g, " ")})`;
}

const SUBJECTS: Record<AppointmentEmailInput["kind"], (cal: string) => string> = {
  confirmation: (cal) => `Confirmed: ${cal}`,
  day_before: (cal) => `Tomorrow: ${cal}`,
  morning_of: (cal) => `Today: ${cal}`,
};
const LEADS: Record<AppointmentEmailInput["kind"], string> = {
  confirmation: "You're booked!",
  day_before: "A reminder — your appointment is tomorrow.",
  morning_of: "A reminder — your appointment is today.",
};

/** One appointment email (confirmation or reminder) to every recipient. No-op when the
 *  tenant's email identity isn't verified. */
export async function sendAppointmentEmail(tenantId: string, input: AppointmentEmailInput): Promise<{ sent: number; error?: string }> {
  const { sendEmail, emailReady } = await import("./email-send");
  const ready = await emailReady(tenantId);
  if (!ready.ok) return { sent: 0, error: ready.reason };

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:520px">
      <h2 style="margin:0 0 4px;color:#0f172a">${LEADS[input.kind]}</h2>
      <p style="margin:0 0 16px;color:#475569">${input.calendarName}${input.bookerName ? ` with ${input.bookerName}` : ""}</p>
      <table style="border-collapse:collapse;font-size:14px;color:#0f172a">
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">When</td><td style="padding:4px 0">${whenLine(input.startIso, input.endIso, input.timezone)}</td></tr>
        ${input.venueLine ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b">Where</td><td style="padding:4px 0">${input.venueLine}</td></tr>` : ""}
      </table>
    </div>`;

  let sent = 0;
  for (const to of [...new Set(input.to.filter(Boolean))]) {
    const r = await sendEmail(tenantId, { to, subject: SUBJECTS[input.kind](input.calendarName), html, footer: "appointment" });
    if (r.ok) sent++;
  }
  return { sent };
}

interface DueAppt {
  id: string; tenant_id: string; calendar_id: string;
  name: string | null; email: string | null; phone: string | null;
  start_at: string; end_at: string | null;
  invitees: string[]; venue: { label?: string; detail?: string } | null;
  reminders_sent: string[];
}

/** Hour of day right now in tz (0-23). */
function hourInTz(tz: string, now: Date): number {
  try { return +new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", hour12: false }).format(now) % 24; } catch { return now.getHours(); }
}
function sameDayInTz(tz: string, a: Date, b: Date): boolean {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  return f.format(a) === f.format(b);
}

/** The worker: sweep upcoming appointments, send whichever reminders are due + unsent.
 *  Optionally scoped to one tenant (the admin "Run now" button). */
export async function runDueAppointmentReminders(onlyTenantId?: string): Promise<{ scanned: number; emails: number; sms: number; skipped: string[] }> {
  const sb = createSupabaseServiceClient();
  const now = new Date();
  const horizon = new Date(now.getTime() + 26 * 3600_000);
  const skipped: string[] = [];

  let q = sb.from("tenant_appointments").select("*")
    .in("status", ["booked", "confirmed"])
    .gte("start_at", now.toISOString())
    .lte("start_at", horizon.toISOString());
  if (onlyTenantId) q = q.eq("tenant_id", onlyTenantId);
  const { data, error } = await q;
  if (error) return { scanned: 0, emails: 0, sms: 0, skipped: [/column .* does not exist|could not find/i.test(error.message) ? "0049 not applied" : error.message] };

  const appts = ((data ?? []) as any[])
    .filter((r) => (r.kind ?? "appointment") === "appointment" && (r.email || r.phone))
    .map((r): DueAppt => ({
      id: r.id, tenant_id: r.tenant_id, calendar_id: r.calendar_id,
      name: r.name ?? null, email: r.email ?? null, phone: r.phone ?? null,
      start_at: r.start_at, end_at: r.end_at ?? null,
      invitees: Array.isArray(r.invitees) ? r.invitees : [],
      venue: r.venue && typeof r.venue === "object" ? r.venue : null,
      reminders_sent: Array.isArray(r.reminders_sent) ? r.reminders_sent : [],
    }));
  if (!appts.length) return { scanned: 0, emails: 0, sms: 0, skipped };

  // Calendar prefs (reminders toggles + tz + name) per involved calendar.
  const calIds = [...new Set(appts.map((a) => a.calendar_id))];
  const { data: cals } = await sb.from("tenant_calendars").select("id, name, timezone, reminders").in("id", calIds);
  const calById = new Map(((cals ?? []) as any[]).map((c) => [c.id, c]));

  let emails = 0, sms = 0;
  for (const a of appts) {
    const cal = calById.get(a.calendar_id);
    if (!cal) continue;
    const prefs = { enabled: true, dayBefore: true, morningOf: true, hourBeforeSms: true, ...(cal.reminders && typeof cal.reminders === "object" ? cal.reminders : {}) };
    if (!prefs.enabled) continue;
    const tz = cal.timezone || "America/Toronto";
    const msToStart = new Date(a.start_at).getTime() - now.getTime();
    const recipients = [a.email, ...a.invitees].filter(Boolean) as string[];
    const venueLine = a.venue?.label ? `${a.venue.label}${a.venue.detail ? `: ${a.venue.detail}` : ""}` : null;
    const sentMarks = new Set(a.reminders_sent);
    const newMarks: string[] = [];

    const emailInput = (kind: "day_before" | "morning_of") => ({
      kind, to: recipients, calendarName: cal.name || "Appointment", timezone: tz,
      startIso: a.start_at, endIso: a.end_at, bookerName: a.name, venueLine,
    });

    // Day-before: start is 22–26h out.
    if (prefs.dayBefore && !sentMarks.has("day_before") && msToStart >= 22 * 3600_000 && msToStart <= 26 * 3600_000 && recipients.length) {
      const r = await sendAppointmentEmail(a.tenant_id, emailInput("day_before"));
      if (r.sent) { emails += r.sent; newMarks.push("day_before"); }
      else if (r.error) skipped.push(`email: ${r.error}`);
    }
    // Morning-of: same tz-day, after 7am there, still >90min out.
    if (prefs.morningOf && !sentMarks.has("morning_of") && sameDayInTz(tz, now, new Date(a.start_at)) && hourInTz(tz, now) >= 7 && msToStart > 90 * 60_000 && recipients.length) {
      const r = await sendAppointmentEmail(a.tenant_id, emailInput("morning_of"));
      if (r.sent) { emails += r.sent; newMarks.push("morning_of"); }
      else if (r.error) skipped.push(`email: ${r.error}`);
    }
    // Hour-before SMS to the booker: start is 30–75min out, Twilio connected.
    if (prefs.hourBeforeSms && !sentMarks.has("hour_before_sms") && msToStart >= 30 * 60_000 && msToStart <= 75 * 60_000 && a.phone) {
      try {
        const { sendSms, twilioReady } = await import("./twilio");
        if (await twilioReady(a.tenant_id)) {
          const t = new Date(a.start_at).toLocaleTimeString("en-CA", { timeZone: tz, hour: "numeric", minute: "2-digit" });
          const r = await sendSms(a.tenant_id, { to: a.phone, body: `Reminder: ${cal.name || "your appointment"} at ${t}${venueLine ? ` — ${venueLine}` : ""}.` });
          if (r.ok) { sms++; newMarks.push("hour_before_sms"); }
          else if (r.error) skipped.push(`sms: ${r.error}`);
        } else skipped.push("sms: twilio not connected");
      } catch { skipped.push("sms: twilio unavailable"); }
    }

    if (newMarks.length) {
      const { error: upErr } = await sb.from("tenant_appointments")
        .update({ reminders_sent: [...a.reminders_sent, ...newMarks] })
        .eq("tenant_id", a.tenant_id).eq("id", a.id);
      if (upErr) skipped.push(`mark: ${upErr.message}`);
    }
  }
  return { scanned: appts.length, emails, sms, skipped: [...new Set(skipped)].slice(0, 10) };
}
