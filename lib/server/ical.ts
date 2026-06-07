/**
 * Server-only iCal (.ics) busy reader. Subscribes to a public/secret .ics feed URL and extracts
 * busy intervals (VEVENT DTSTART/DTEND) within a window — read-only, no OAuth. Recurring events
 * (RRULE) are not expanded in v1; single-instance events are honored.
 */

export interface BusyInterval { start: number; end: number }

function parseIcsDate(val: string): number | null {
  // Forms: 20260115T140000Z | 20260115T140000 | 20260115 (all-day)
  const m = val.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/);
  if (!m) return null;
  const [, y, mo, d, hh = "0", mm = "0", ss = "0", z] = m;
  const ms = z
    ? Date.UTC(+y, +mo - 1, +d, +hh, +mm, +ss)
    : new Date(+y, +mo - 1, +d, +hh, +mm, +ss).getTime(); // floating → server local; acceptable for v1
  return ms;
}

export async function fetchICalBusy(url: string, minMs: number, maxMs: number): Promise<BusyInterval[]> {
  if (!/^https?:\/\//i.test(url) && !/^webcal:\/\//i.test(url)) return [];
  const httpUrl = url.replace(/^webcal:\/\//i, "https://");
  let text = "";
  try {
    const res = await fetch(httpUrl, { signal: AbortSignal.timeout(10000), redirect: "follow" });
    if (!res.ok) return [];
    text = (await res.text()).slice(0, 2_000_000);
  } catch { return []; }

  // Unfold folded lines (RFC 5545: continuation lines start with a space/tab).
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const out: BusyInterval[] = [];
  const blocks = unfolded.split(/BEGIN:VEVENT/i).slice(1);
  for (const b of blocks) {
    const body = b.split(/END:VEVENT/i)[0];
    if (/^TRANSP:TRANSPARENT/im.test(body)) continue;     // marked "free"
    if (/^STATUS:CANCELLED/im.test(body)) continue;
    const ds = body.match(/^DTSTART[^:\r\n]*:([^\r\n]+)/im);
    const de = body.match(/^DTEND[^:\r\n]*:([^\r\n]+)/im);
    if (!ds) continue;
    const start = parseIcsDate(ds[1].trim());
    let end = de ? parseIcsDate(de[1].trim()) : null;
    if (start == null) continue;
    if (end == null) end = start + 60 * 60 * 1000; // default 1h
    if (end <= minMs || start >= maxMs) continue;       // outside window
    out.push({ start, end });
    if (out.length >= 500) break;
  }
  return out;
}
