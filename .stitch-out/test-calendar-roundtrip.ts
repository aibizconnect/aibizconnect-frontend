// Full round-trip verification of Calendar v1 against the LIVE DB (post-0043):
// create calendar → manual appointment → blocked time → range list → status update →
// availableSlots excludes the blocked window → cleanup. Self-contained, leaves no data.
import { createClient } from "@supabase/supabase-js";
import {
  listCalendars, createCalendar, deleteCalendar,
  createManualAppointment, createBlockedTime, listEntriesRange, updateEntry, deleteEntry,
  availableSlots,
} from "../lib/calendars";

const TENANT = "d723a086-eac0-4b61-8742-25313370d0b7"; // Ottawa test tenant

(async () => {
  const fail = (m: string) => { console.error("FAIL:", m); process.exit(1); };

  // 1) Calendar
  const c = await createCalendar(TENANT, { name: "Parity Test Cal", durationMin: 30 });
  if (!c.ok) fail(`createCalendar: ${c.error}`);
  const cal = (await listCalendars(TENANT)).find((x) => x.name === "Parity Test Cal");
  if (!cal) fail("calendar not found after create");
  console.log("1. calendar created:", cal!.id);

  // Tomorrow 10:00 / blocked 14:00-16:00 (a weekday within working hours: shift to next Mon-Fri)
  const base = new Date(); base.setDate(base.getDate() + 1);
  while (!cal!.weekdays.includes(base.getDay())) base.setDate(base.getDate() + 1);
  const at = (h: number, m = 0) => { const d = new Date(base); d.setHours(h, m, 0, 0); return d.toISOString(); };

  // 2) Manual appointment
  const a = await createManualAppointment(TENANT, { calendarId: cal!.id, title: "Test consult", name: "Test Person", email: "test@example.com", startAt: at(10) });
  if (!a.ok) fail(`createManualAppointment: ${a.error}`);
  console.log("2. manual appointment created");

  // 3) Blocked time 14:00–16:00
  const b = await createBlockedTime(TENANT, { calendarId: cal!.id, startAt: at(14), endAt: at(16), title: "Lunch block" });
  if (!b.ok) fail(`createBlockedTime: ${b.error}`);
  console.log("3. blocked time created");

  // 4) Range list sees both, with kinds + end times
  const from = new Date(base); from.setHours(0, 0, 0, 0);
  const to = new Date(from); to.setDate(to.getDate() + 1);
  const entries = await listEntriesRange(TENANT, { fromISO: from.toISOString(), toISO: to.toISOString(), calendarIds: [cal!.id] });
  const appt = entries.find((e) => e.kind === "appointment");
  const blk = entries.find((e) => e.kind === "blocked");
  if (!appt || !blk) fail(`range list missing kinds: ${JSON.stringify(entries.map((e) => e.kind))}`);
  if (!appt!.endAt) fail("appointment endAt not set");
  console.log("4. range list OK:", entries.map((e) => `${e.kind}@${new Date(e.startAt).getHours()}h→${e.endAt ? new Date(e.endAt).getHours() + "h" : "?"} [${e.source}]`).join(", "));

  // 5) Status update
  const u = await updateEntry(TENANT, appt!.id, { status: "confirmed" });
  if (!u.ok) fail(`updateEntry: ${u.error}`);
  console.log("5. status → confirmed OK");

  // 6) availableSlots excludes 10:00-10:30 (appt) and 14:00-16:00 (blocked)
  const days = await availableSlots(TENANT, cal!, 7);
  const dayKey = from.toISOString().slice(0, 10);
  const todaySlots = days.find((d) => d.date === dayKey)?.slots ?? [];
  const hits = (h: number, m = 0) => todaySlots.includes(at(h, m));
  if (hits(10)) fail("slot 10:00 should be taken (confirmed appointment)");
  if (hits(14) || hits(15) || hits(15, 30)) fail("blocked window 14-16 still bookable");
  if (!hits(11)) console.log("   (note: 11:00 not offered — check working hours)", todaySlots.slice(0, 4));
  console.log("6. availableSlots excludes appointment + blocked window OK");

  // 7) Cleanup
  await deleteEntry(TENANT, appt!.id);
  await deleteEntry(TENANT, blk!.id);
  await deleteCalendar(TENANT, cal!.id);
  const left = await listCalendars(TENANT);
  if (left.some((x) => x.id === cal!.id)) fail("cleanup failed");
  console.log("7. cleanup OK — ALL CHECKS PASS");
})();
