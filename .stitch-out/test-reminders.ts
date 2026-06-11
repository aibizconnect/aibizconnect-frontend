// D-255..D-257 round trip: venue + invitees stored on booking; reminder engine scans the
// right windows and gates on channel config (test tenant has no verified email / Twilio →
// expect skips, no sends, no markers). Self-cleaning.
import { createClient } from "@supabase/supabase-js";
import { getCalendarBySlug, bookAppointment, listEntriesRange, deleteEntry, updateCalendar } from "../lib/calendars";
import { runDueAppointmentReminders } from "../lib/server/appointment-reminders";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const T = "d723a086-eac0-4b61-8742-25313370d0b7";
const fail = (m: string) => { console.error("FAIL:", m); process.exit(1); };

(async () => {
  const cal = await getCalendarBySlug(T, "abc-consultation");
  if (!cal) fail("calendar missing");

  // 0) venues + reminders persist on the calendar (0049)
  const up = await updateCalendar(T, cal!.id, {
    venues: [{ kind: "zoom", label: "Zoom", detail: "https://zoom.us/j/test" }, { kind: "phone", label: "Phone call", detail: "We call you" }],
    reminders: { enabled: true, dayBefore: true, morningOf: true, hourBeforeSms: true },
  });
  if (!up.ok) { console.log(`0. venues/reminders save: ${up.error}`); if (!/0049/.test(up.error ?? "")) fail(up.error!); }
  else console.log("0. venues + reminders saved on calendar OK");

  // 1) book ~23h out with a venue + 2 guests (inside the day-before window)
  const start = new Date(Date.now() + 23 * 3600_000); start.setMinutes(0, 0, 0);
  const r = await bookAppointment(T, cal!.id, {
    name: "Reminder Test", email: "reminder-test@example.com", phone: "+16135550199",
    startAt: start.toISOString(), venueIdx: 0, invitees: ["guest-one@example.com", "guest-two@example.com", "bad-email"],
  });
  if (!r.ok) fail(`book: ${r.error}`);
  const entries = await listEntriesRange(T, { fromISO: new Date().toISOString(), toISO: new Date(Date.now() + 30 * 3600_000).toISOString(), calendarIds: [cal!.id] });
  const appt = entries.find((e) => e.email === "reminder-test@example.com");
  if (!appt) fail("booked appt not found");
  if (appt!.venue?.kind !== "zoom") fail(`venue not stored: ${JSON.stringify(appt!.venue)}`);
  if (appt!.invitees.length !== 2) fail(`invitees not filtered/stored: ${JSON.stringify(appt!.invitees)}`);
  console.log(`1. booked w/ venue=${appt!.venue?.label} + ${appt!.invitees.length} guests (bad email dropped) OK`);

  // 2) engine scan: day-before window hits, but channels unconfigured → skip, no marker
  const run = await runDueAppointmentReminders(T);
  console.log(`2. engine: scanned ${run.scanned}, emails ${run.emails}, sms ${run.sms}, skips: ${run.skipped.join(" | ") || "none"}`);
  if (run.scanned < 1) fail("engine scanned nothing");
  if (run.emails > 0 || run.sms > 0) fail("sent without configured channels?!");
  const { data: row } = await sb.from("tenant_appointments").select("reminders_sent").eq("tenant_id", T).eq("id", appt!.id).single();
  if (((row as any).reminders_sent ?? []).length) fail("marker set despite failed send");
  console.log("3. channel gates hold — nothing sent, no false markers OK");

  // cleanup
  await deleteEntry(T, appt!.id);
  await updateCalendar(T, cal!.id, { venues: [] });
  const { data: c } = await sb.from("tenant_contacts").select("id").eq("tenant_id", T).eq("email", "reminder-test@example.com");
  for (const x of (c ?? []) as any[]) await sb.from("tenant_contacts").delete().eq("id", x.id);
  console.log("4. cleanup OK — ALL CHECKS PASS");
})();
