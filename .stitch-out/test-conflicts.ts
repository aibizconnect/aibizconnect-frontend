// D-241..D-244 round trip: conflict detection on manual create + reschedule (warn + force),
// blocked-time conflicts, self-exclusion, synthetic external-busy path. Self-cleaning.
import {
  createCalendar, listCalendars, deleteCalendar,
  createManualAppointment, createBlockedTime, updateEntry, deleteEntry,
  listEntriesRange, findConflicts,
} from "../lib/calendars";

const T = "d723a086-eac0-4b61-8742-25313370d0b7";
const fail = (m: string) => { console.error("FAIL:", m); process.exit(1); };

(async () => {
  await createCalendar(T, { name: "Conflict Test Cal", durationMin: 30 });
  const cal = (await listCalendars(T)).find((c) => c.name === "Conflict Test Cal");
  if (!cal) fail("test calendar missing");

  const day = new Date(); day.setDate(day.getDate() + 7); day.setHours(10, 0, 0, 0);
  const at = (h: number, m = 0) => { const d = new Date(day); d.setHours(h, m, 0, 0); return d.toISOString(); };

  // 1) first appointment books clean
  const a = await createManualAppointment(T, { calendarId: cal!.id, title: "First", startAt: at(10), endAt: at(11) });
  if (!a.ok) fail(`first create: ${a.error}`);
  console.log("1. clean create OK");

  // 2) overlapping create → conflict refused with detail
  const b = await createManualAppointment(T, { calendarId: cal!.id, title: "Second", startAt: at(10, 30), endAt: at(11, 30) });
  if (b.ok) fail("overlap was NOT detected on create");
  if (!b.conflicts?.length) fail("no conflicts payload on refusal");
  console.log(`2. overlap refused OK — "${b.error}"`);

  // 3) force override books anyway
  const c = await createManualAppointment(T, { calendarId: cal!.id, title: "Second", startAt: at(10, 30), endAt: at(11, 30), force: true });
  if (!c.ok) fail(`force create: ${c.error}`);
  console.log("3. force override OK");

  // 4) reschedule onto a busy window → conflict; force → OK; own-slot reschedule → no conflict
  const entries = await listEntriesRange(T, { fromISO: at(0), toISO: at(23), calendarIds: [cal!.id] });
  const second = entries.find((e) => e.title === "Second");
  if (!second) fail("second entry not found");
  const r1 = await updateEntry(T, second!.id, { startAt: at(10), endAt: at(11) });
  if (r1.ok) fail("reschedule conflict NOT detected");
  console.log(`4a. reschedule refused OK — "${r1.error}"`);
  // Distinct start (10:15) overlaps First's interval — works on any schema version.
  const r2 = await updateEntry(T, second!.id, { startAt: at(10, 15), endAt: at(11, 15), force: true });
  if (!r2.ok) fail(`force reschedule: ${r2.error}`);
  console.log("4b. force reschedule OK");
  // Identical start: pre-0047 the v0 unique index refuses with a migration hint; post-0047 it books.
  const same = await updateEntry(T, second!.id, { startAt: at(10), endAt: at(11), force: true });
  if (same.ok) console.log("4d. identical-start override OK (0047 applied)");
  else if (/0047/.test(same.error ?? "")) console.log(`4d. identical-start gated with clear hint (0047 pending) — "${same.error}"`);
  else fail(`identical-start gave wrong error: ${same.error}`);
  const self = await findConflicts(T, cal!.id, at(10), at(11), second!.id);
  if (self.some((x) => x.label.includes("Second"))) fail("self not excluded from conflict check");
  console.log("4c. self-exclusion OK");

  // 5) blocked window refuses new appointments (labeled)
  const blk = await createBlockedTime(T, { calendarId: cal!.id, startAt: at(14), endAt: at(15), title: "Lunch" });
  if (!blk.ok) fail(`block: ${blk.error}`);
  const d = await createManualAppointment(T, { calendarId: cal!.id, title: "InBlock", startAt: at(14, 0), endAt: at(14, 30) });
  if (d.ok) fail("appointment inside blocked window was NOT refused");
  if (!/blocked/i.test(d.error ?? "")) fail(`blocked label missing: ${d.error}`);
  console.log(`5. blocked-window refusal OK — "${d.error}"`);

  // 6) includeExternalBusy path runs without a connection (no synthetics, no crash)
  const withBusy = await listEntriesRange(T, { fromISO: at(0), toISO: at(23), calendarIds: [cal!.id], includeExternalBusy: true });
  if (withBusy.some((e) => e.kind === "external_busy")) fail("unexpected synthetic busy (no connection on test cal)");
  console.log(`6. external-busy merge path OK (${withBusy.length} entries, 0 synthetic — no connection)`);

  // cleanup
  for (const e of withBusy) await deleteEntry(T, e.id);
  await deleteCalendar(T, cal!.id);
  console.log("7. cleanup OK — ALL CHECKS PASS");
})();
