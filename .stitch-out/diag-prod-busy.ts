// Compare PROD-offered slots vs local (correct-key) busy computation. If prod offers slots
// inside known busy windows, prod can no longer decrypt connection tokens (env key damaged).
import { readFileSync } from "node:fs";
import { getCalendarBySlug, availableSlots } from "../lib/calendars";
const T = "d723a086-eac0-4b61-8742-25313370d0b7";
(async () => {
  const html = readFileSync(".stitch-out/prod-booking.html", "utf8");
  const m = html.match(/"days\?":(\[.*?\])\s*[,}]/) ?? html.match(/\\"days\\":(\[[^\]]*?\]\}\])/);
  const cal = await getCalendarBySlug(T, "abc-consultation");
  const local = await availableSlots(T, cal!, 7);
  const localSet = new Set(local.flatMap((d) => d.slots));
  // Extract ISO timestamps offered by prod from the serialized payload.
  const prodSlots = [...html.matchAll(/"(20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)"/g)].map((x) => x[1]);
  const uniq = [...new Set(prodSlots)];
  console.log(`prod page offers ${uniq.length} unique slot timestamps; local computes ${localSet.size}`);
  const extra = uniq.filter((s) => !localSet.has(s)).slice(0, 6);
  const missing = [...localSet].filter((s) => !uniq.includes(s)).slice(0, 6);
  console.log("offered by prod but EXCLUDED locally (busy leaks?):", extra.length ? extra : "none");
  console.log("computed locally but absent on prod:", missing.length ? missing : "none");
})();
