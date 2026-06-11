import { listEntriesRange, listCalendars } from "../lib/calendars";

const TENANT = "d723a086-eac0-4b61-8742-25313370d0b7";
(async () => {
  const cals = await listCalendars(TENANT);
  console.log("calendars:", cals.map((c) => `${c.name} (${c.durationMin}m)`).join(", ") || "(none)");
  const from = new Date(); from.setDate(from.getDate() - 60);
  const to = new Date(); to.setDate(to.getDate() + 60);
  const entries = await listEntriesRange(TENANT, { fromISO: from.toISOString(), toISO: to.toISOString() });
  console.log("entries in ±60d:", entries.length);
  for (const e of entries.slice(0, 5)) console.log(` - ${e.kind} ${e.startAt} → ${e.endAt ?? "(null end)"} ${e.title ?? e.name} [${e.status}]`);
})();
