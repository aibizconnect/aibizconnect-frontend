"use client";

import { useEffect, useState } from "react";

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Color picker swatch + paste-friendly #HEX text field. Used wherever a color is chosen
 * (Typography roles, element Styles/General). `allowEmpty` lets an empty value mean
 * "inherit/none" (onChange undefined); otherwise it always reports a hex string.
 */
export default function ColorField({
  label, value, onChange, allowEmpty = true, fallback = "#111827", className = "",
}: {
  label?: string;
  value?: string;
  onChange: (v: string | undefined) => void;
  allowEmpty?: boolean;
  fallback?: string;
  className?: string;
}) {
  const [text, setText] = useState(value ?? "");
  useEffect(() => { setText(value ?? ""); }, [value]);

  const apply = (raw: string) => {
    let v = raw.trim();
    if (v && !v.startsWith("#")) v = "#" + v;
    setText(v);
    if (v === "") { if (allowEmpty) onChange(undefined); }
    else if (HEX_RE.test(v)) onChange(v);
  };

  return (
    <label className={`flex items-center gap-1.5 ${className}`}>
      {label && <span>{label}</span>}
      <input
        type="color"
        value={value && HEX_RE.test(value) ? value : fallback}
        title={label ? `${label} color` : "Color"}
        onChange={(e) => { setText(e.target.value); onChange(e.target.value); }}
        className="h-7 w-8 cursor-pointer rounded border border-slate-300 p-0"
      />
      <input
        type="text"
        value={text}
        onChange={(e) => apply(e.target.value)}
        placeholder="#RRGGBB"
        spellCheck={false}
        className="w-[78px] rounded border border-slate-300 px-1.5 py-0.5 font-mono text-[11px] uppercase"
      />
      {allowEmpty && value && (
        <button type="button" title="Clear" onClick={() => { setText(""); onChange(undefined); }}
          className="text-slate-400 hover:text-slate-700">✕</button>
      )}
    </label>
  );
}
