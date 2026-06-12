// D-255..D-257 round trip (post-0049): venue + invitees stored through the REAL booking
// path (first genuinely free slot); reminder engine scans a seeded day-before appointment
// and the channel gates hold (test tenant has no verified email / Twilio → skips, no
// sends, no markers). Self-cleaning.
import { createClient } from "@supabase/supabase-js";
import { getCalendarBySlug, bookAppointment, availableSlots, updateCalendar } from "../lib/calendars";
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
  if (!up.ok) fail(`venues/reminders save: ${up.error}`);
  console.log("0. venues + reminders saved on calendar OK");

  // 1) book through the REAL path at the first available slot (conflict-engine approved)
  const days = await availableSlots(T, await getCalendarBySlug(T, "abc-consultation") as any, 14);
  const slot = days[0]?.slots[0];
  if (!slot) fail("no available slot in 14 days");
  const r = await bookAppointment(T, cal!.id, {
    name: "Reminder Test", email: "reminder-test@example.com", phone: "+16135550199",
    startAt: slot, venueIdx: 0, invitees: ["guest-one@example.com", "guest-two@example.com", "bad-email"],
  });
  if (!r.ok) fail(`book: ${r.error}`);
  const { data: appt } = await sb.from("tenant_appointments").select("*").eq("tenant_id", T).eq("email", "reminder-test@example.com").single();
  if ((appt as any).venue?.kind !== "zoom") fail(`venue not stored: ${JSON.stringify((appt as any).venue)}`);
  if (((appt as any).invitees ?? []).length !== 2) fail(`invitees not filtered/stored: ${JSON.stringify((appt as any).invitees)}`);
  console.log(`1. real booking stored venue=zoom + 2 guests (bad email dropped) OK — slot ${new Date(slot).toLocaleString("en-CA", { timeZone: "America/Toronto" })}`);

  // 2) seed a day-before-window appointment directly (the live calendar is fully busy
  //    22–26h out tonight — the engine refusing those slots is correct behavior)
  const dayBeforeStart = new Date(Date.now() + 23 * 3600_000);
  const { data: seeded } = await sb.from("tenant_appointments").insert({
    tenant_id: T, calendar_id: cal!.id, name: "Window Test", email: "reminder-test@example.com",
    phone: "+16135550199", start_at: dayBeforeStart.toISOString(),
    end_at: new Date(dayBeforeStart.getTime() + 30 * 60_000).toISOString(),
    kind: "appointment", source: "manual", status: "booked",
    venue: { kind: "phone", label: "Phone call", detail: "We call you" },
    invitees: ["guest-one@example.com"], reminders_sent: [],
  }).select("id").single();

  const run = await runDueAppointmentReminders(T);
  console.log(`2. engine: scanned ${run.scanned}, emails ${run.emails}, sms ${run.sms}, skips: ${run.skipped.join(" | ") || "none"}`);
  if (run.scanned < 1) fail("engine scanned nothing");
  if (run.emails > 0 || run.sms > 0) fail("sent without configured channels?!");
  const { data: row } = await sb.from("tenant_appointments").select("reminders_sent").eq("tenant_id", T).eq("id", (seeded as any).id).single();
  if (((row as any).reminders_sent ?? []).length) fail("marker set despite failed send");
  console.log("3. channel gates hold — nothing sent, no false markers OK");

  // cleanup
  await sb.from("tenant_appointments").delete().eq("tenant_id", T).eq("email", "reminder-test@example.com");
  await sb.from("tenant_contacts").delete().eq("tenant_id", T).eq("email", "reminder-test@example.com");
  await updateCalendar(T, cal!.id, { venues: [] });
  console.log("4. cleanup OK — ALL CHECKS PASS");
})();
