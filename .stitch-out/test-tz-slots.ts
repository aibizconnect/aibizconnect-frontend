// D-250: slots must respect the CALENDAR's timezone, not the server's.
// The live ABC Consultation cal is 11:00–18:00 America/Toronto → first slot of any day
// must be 11:00 Toronto wall-clock regardless of server TZ. Also verifies all-sub-calendar
// busy (D-252) flows into exclusions.
import { getCalendarBySlug, availableSlots } from "../lib/calendars";
import { getAllBusy } from "../lib/server/calendar-busy";

const T = "d723a086-eac0-4b61-8742-25313370d0b7";
const fail = (m: string) => { console.error("FAIL:", m); process.exit(1); };

(async () => {
  const cal = await getCalendarBySlug(T, "abc-consultation");
  if (!cal) fail("calendar missing");
  console.log(`cal: ${cal!.startHour}:00–${cal!.endHour}:00 ${cal!.timezone} (server TZ: ${Intl.DateTimeFormat().resolvedOptions().timeZone})`);

  const days = await availableSlots(T, cal!, 7);
  if (!days.length) fail("no slot days returned");
  const tz = cal!.timezone || "America/Toronto";
  const wall = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
  for (const d of days) {
    const hours = d.slots.map(wall);
    const bad = hours.filter((h) => +h.slice(0, 2) < cal!.startHour || +h.slice(0, 2) >= cal!.endHour);
    if (bad.length) fail(`${d.date}: slots outside ${cal!.startHour}–${cal!.endHour} ${tz}: ${bad.join(", ")}`);
  }
  console.log(`1. all ${days.reduce((a, d) => a + d.slots.length, 0)} slots across ${days.length} days sit inside ${cal!.startHour}:00–${cal!.endHour}:00 ${tz} OK`);
  console.log(`   first day ${days[0].date}: ${days[0].slots.slice(0, 3).map(wall).join(", ")} (${tz} wall-clock)`);

  // D-252: all-sub-calendars busy — count intervals now vs the 3 primary-only ones before.
  const from = new Date(); const to = new Date(); to.setDate(to.getDate() + 7);
  const busy = await getAllBusy(T, cal!.id, from.toISOString(), to.toISOString());
  console.log(`2. getAllBusy across ALL sub-calendars → ${busy.length} intervals (was 3 primary-only)`);
  for (const b of busy.slice(0, 12)) console.log(`   ${b.provider}: ${new Date(b.start).toLocaleString("en-CA", { timeZone: tz })} – ${new Date(b.end).toLocaleTimeString("en-CA", { timeZone: tz })}`);

  // Cross-check: no offered slot overlaps any busy interval.
  const durMs = cal!.durationMin * 60_000;
  for (const d of days) for (const s of d.slots) {
    const sm = new Date(s).getTime();
    if (busy.some((b) => sm < b.end && sm + durMs > b.start)) fail(`slot ${s} overlaps busy`);
  }
  console.log("3. zero offered slots overlap any busy interval — ALL CHECKS PASS");
})();
