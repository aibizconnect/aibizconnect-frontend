// D-261..D-264 VA round trip on an UNCONNECTED calendar (no provider mirrors → no invite
// emails, no orphans): list → availability → book → find → reschedule (conflict + force)
// → cancel → find(empty). Self-cleaning.
import { createClient } from "@supabase/supabase-js";
import { createCalendar, listCalendars, deleteCalendar, deleteEntry, listEntriesRange } from "../lib/calendars";
import {
  toolListCalendars, toolGetAvailability, toolFindAppointments,
  toolBookAppointment, toolRescheduleAppointment, toolCancelAppointment,
} from "../lib/agent/tools/calendar-tools";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const T = "d723a086-eac0-4b61-8742-25313370d0b7";
const fail = (m: string) => { console.error("FAIL:", m); process.exit(1); };

(async () => {
  await createCalendar(T, { name: "VA Test Cal", durationMin: 30 });
  const cal = (await listCalendars(T)).find((c) => c.name === "VA Test Cal");
  if (!cal) fail("test calendar missing");

  // 1) list — VA discovers calendars
  const l = await toolListCalendars(T);
  if (!l.ok || !l.data.some((c) => c.slug === cal!.slug)) fail("list missing the calendar");
  console.log(`1. calendar.list OK (${l.data.length} calendars)`);

  // 2) availability — tz-correct open slots
  const a = await toolGetAvailability(T, { calendar: cal!.slug, days: 7 });
  if (!a.ok || !a.data.length || !a.data[0].slots.length) fail(`availability: ${JSON.stringify(a)}`);
  const slot1 = a.data[0].slots[0];
  const slot2 = a.data[0].slots[1] ?? a.data[1]?.slots[0];
  console.log(`2. calendar.availability OK (first slot ${slot1})`);

  // 3) book for a "caller"
  const b = await toolBookAppointment(T, { calendar: cal!.slug, startAt: slot1, name: "VA Caller", email: "va-caller@example.com", phone: "+16135550042" });
  if (!b.ok) fail(`book: ${(b as any).error}`);
  console.log("3. calendar.book OK");

  // 4) find by email AND by phone
  const f1 = await toolFindAppointments(T, { email: "va-caller@example.com" });
  if (!f1.ok || f1.data.length !== 1) fail(`find by email: ${JSON.stringify(f1)}`);
  const f2 = await toolFindAppointments(T, { phone: "+16135550042" });
  if (!f2.ok || f2.data.length !== 1) fail("find by phone failed");
  const apptId = f1.data[0].id;
  console.log(`4. calendar.find OK (id ${apptId.slice(0, 8)}…)`);

  // 5) book a second appointment, then reschedule it ONTO the first → conflict → force
  const c = await toolBookAppointment(T, { calendar: cal!.slug, startAt: slot2, name: "Second Caller", email: "va-second@example.com" });
  if (!c.ok) fail(`second book: ${(c as any).error}`);
  const f3 = await toolFindAppointments(T, { email: "va-second@example.com" });
  const secondId = f3.ok ? f3.data[0].id : fail("second not found") as never;
  const r1 = await toolRescheduleAppointment(T, { appointmentId: secondId, newStartAt: slot1 });
  if (r1.ok) fail("reschedule conflict NOT detected");
  if (!(r1 as any).conflicts?.length) fail("no conflicts payload");
  console.log(`5a. calendar.reschedule refused with conflicts OK — "${(r1 as any).error}"`);
  const r2 = await toolRescheduleAppointment(T, { appointmentId: secondId, newStartAt: slot1, force: true });
  if (!r2.ok) fail(`force reschedule: ${(r2 as any).error}`);
  console.log("5b. force reschedule (customer confirmed) OK");

  // 6) cancel the first → it disappears from find
  const x = await toolCancelAppointment(T, { appointmentId: apptId, reason: "caller asked to cancel" });
  if (!x.ok) fail(`cancel: ${(x as any).error}`);
  const f4 = await toolFindAppointments(T, { email: "va-caller@example.com" });
  if (!f4.ok || f4.data.length !== 0) fail("cancelled appt still found");
  console.log("6. calendar.cancel OK (gone from find)");

  // 7) audit trail exists
  const { data: log } = await sb.from("platform_audit_log").select("action").like("action", "agent.calendar.%").order("created_at", { ascending: false }).limit(5);
  if (!log?.length) fail("no agent.calendar.* audit entries");
  console.log(`7. audit OK (${log!.length} agent.calendar.* entries)`);

  // cleanup
  const entries = await listEntriesRange(T, { fromISO: new Date().toISOString(), toISO: new Date(Date.now() + 31 * 86400_000).toISOString(), calendarIds: [cal!.id] });
  for (const e of entries) await deleteEntry(T, e.id);
  await sb.from("tenant_appointments").delete().eq("tenant_id", T).eq("calendar_id", cal!.id);
  await deleteCalendar(T, cal!.id);
  for (const em of ["va-caller@example.com", "va-second@example.com"]) await sb.from("tenant_contacts").delete().eq("tenant_id", T).eq("email", em);
  console.log("8. cleanup OK — ALL CHECKS PASS");
})();
