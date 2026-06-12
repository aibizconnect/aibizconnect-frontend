/**
 * Curated standard timezones (D-253, extended app-wide per Ali) — friendly names with live
 * GMT offsets. Shared by every Time Zone field: calendars, business profile, preferences,
 * website settings. People don't know IANA names — always render through TimezoneSelect.
 */
export const TIMEZONES: { tz: string; label: string }[] = [
  { tz: "America/St_Johns", label: "Newfoundland — St. John's" },
  { tz: "America/Halifax", label: "Atlantic Time — Halifax" },
  { tz: "America/Toronto", label: "Eastern Time — Toronto, New York" },
  { tz: "America/Winnipeg", label: "Central Time — Winnipeg, Chicago" },
  { tz: "America/Edmonton", label: "Mountain Time — Edmonton, Denver" },
  { tz: "America/Phoenix", label: "Arizona — Phoenix (no DST)" },
  { tz: "America/Vancouver", label: "Pacific Time — Vancouver, Los Angeles" },
  { tz: "America/Anchorage", label: "Alaska — Anchorage" },
  { tz: "Pacific/Honolulu", label: "Hawaii — Honolulu" },
  { tz: "America/Mexico_City", label: "Mexico City" },
  { tz: "America/Sao_Paulo", label: "São Paulo" },
  { tz: "UTC", label: "UTC" },
  { tz: "Europe/London", label: "London, Dublin" },
  { tz: "Europe/Paris", label: "Paris, Berlin, Rome, Madrid" },
  { tz: "Europe/Athens", label: "Athens, Helsinki, Kyiv" },
  { tz: "Europe/Istanbul", label: "Istanbul" },
  { tz: "Asia/Dubai", label: "Dubai, Abu Dhabi" },
  { tz: "Asia/Tehran", label: "Tehran" },
  { tz: "Asia/Karachi", label: "Karachi, Islamabad" },
  { tz: "Asia/Kolkata", label: "India — Mumbai, Delhi" },
  { tz: "Asia/Dhaka", label: "Dhaka" },
  { tz: "Asia/Bangkok", label: "Bangkok, Jakarta" },
  { tz: "Asia/Shanghai", label: "China — Beijing, Shanghai" },
  { tz: "Asia/Singapore", label: "Singapore, Kuala Lumpur" },
  { tz: "Asia/Hong_Kong", label: "Hong Kong" },
  { tz: "Asia/Tokyo", label: "Tokyo, Seoul" },
  { tz: "Australia/Perth", label: "Perth" },
  { tz: "Australia/Sydney", label: "Sydney, Melbourne" },
  { tz: "Pacific/Auckland", label: "Auckland" },
];

export function gmtOffset(tz: string): string {
  try {
    const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(new Date()).find((x) => x.type === "timeZoneName");
    return p?.value?.replace("GMT", "GMT+0").replace("GMT+0-", "GMT-").replace("GMT+0+", "GMT+") ?? "";
  } catch { return ""; }
}
