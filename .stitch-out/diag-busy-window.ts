import { getAllBusy } from "../lib/server/calendar-busy";
import { getCalendarBySlug } from "../lib/calendars";
const T = "d723a086-eac0-4b61-8742-25313370d0b7";
(async () => {
  const cal = await getCalendarBySlug(T, "abc-consultation");
  const busy = await getAllBusy(T, cal!.id, new Date().toISOString(), new Date(Date.now() + 27 * 3600_000).toISOString());
  console.log(`busy intervals in next 27h: ${busy.length}`);
  for (const b of busy) console.log(`  ${new Date(b.start).toLocaleString("en-CA", { timeZone: "America/Toronto" })} – ${new Date(b.end).toLocaleString("en-CA", { timeZone: "America/Toronto" })} (${b.provider})`);
})();
