"use client";

import { TIMEZONES, gmtOffset } from "@/lib/timezones";

/** The one way to pick a Time Zone (Ali's ruling): a dropdown of standard zones with live
 *  GMT offsets — never a free-text IANA field. An existing nonstandard value is preserved
 *  as an extra option so saved data never breaks. */
export default function TimezoneSelect({ value, onChange, disabled, className, allowEmpty }: {
  value: string;
  onChange: (tz: string) => void;
  disabled?: boolean;
  className?: string;
  /** Show a blank "—" first option (for optional fields). */
  allowEmpty?: boolean;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={className}>
      {allowEmpty && <option value="">— not set —</option>}
      {value && !TIMEZONES.some((z) => z.tz === value) && <option value={value}>{value} (current)</option>}
      {TIMEZONES.map((z) => <option key={z.tz} value={z.tz}>({gmtOffset(z.tz)}) {z.label}</option>)}
    </select>
  );
}
