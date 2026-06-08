"use client";

import { useEffect, useState } from "react";
import { getTheme, updateTheme } from "../actions";
import {
  DEFAULT_THEME,
  SAFE_FONTS,
  type ThemeTokens,
} from "@/lib/sections/theme";
import { notifyError } from "@/lib/ui/dialogs";

export default function DesignSystemPanel({ tenantId }: { tenantId: string }) {
  const [theme, setTheme] = useState<ThemeTokens>(DEFAULT_THEME);

  useEffect(() => {
    getTheme(tenantId).then(setTheme);
  }, [tenantId]);

  async function patch(p: Record<string, unknown>, optimistic: ThemeTokens) {
    setTheme(optimistic);
    try {
      const next = await updateTheme(tenantId, p);
      setTheme(next);
    } catch (e: any) {
      notifyError(e?.message ?? "Failed to update theme.");
      getTheme(tenantId).then(setTheme); // revert to server state
    }
  }

  const colorKeys = ["primary", "secondary", "accent", "background", "text"] as const;
  const sizeKeys = ["sm", "md", "lg"] as const;

  return (
    <div className="flex flex-col gap-4 border-t pt-4">
      <h3 className="text-md font-semibold">Design System</h3>

      {/* Colors */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Colors</span>
        {colorKeys.map((k) => (
          <label key={k} className="flex items-center justify-between gap-2 text-sm">
            <span className="capitalize">{k}</span>
            <input
              type="color"
              value={theme.colors[k]}
              onChange={(e) =>
                patch(
                  { colors: { [k]: e.target.value } },
                  { ...theme, colors: { ...theme.colors, [k]: e.target.value } }
                )
              }
              className="h-7 w-12 rounded border"
            />
          </label>
        ))}
      </div>

      {/* Fonts */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Fonts</span>
        {(["heading", "body"] as const).map((k) => (
          <label key={k} className="flex items-center justify-between gap-2 text-sm">
            <span className="capitalize">{k}</span>
            <select
              value={theme.fonts[k]}
              onChange={(e) =>
                patch(
                  { fonts: { [k]: e.target.value } },
                  { ...theme, fonts: { ...theme.fonts, [k]: e.target.value } }
                )
              }
              className="rounded border border-gray-300 px-2 py-1"
            >
              {SAFE_FONTS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {/* Radii + Spacing */}
      {(["radii", "spacing"] as const).map((group) => (
        <div key={group} className="flex flex-col gap-2">
          <span className="text-sm font-medium capitalize">{group}</span>
          <div className="flex gap-2">
            {sizeKeys.map((k) => (
              <label key={k} className="flex flex-1 flex-col gap-1 text-xs">
                <span className="uppercase text-gray-400">{k}</span>
                <input
                  type="number"
                  min={0}
                  value={theme[group][k]}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (Number.isNaN(v) || v < 0) return;
                    patch(
                      { [group]: { [k]: v } },
                      { ...theme, [group]: { ...theme[group], [k]: v } }
                    );
                  }}
                  className="rounded border border-gray-300 px-2 py-1"
                />
              </label>
            ))}
          </div>
        </div>
      ))}

      {/* Live swatch grid */}
      <div className="flex flex-wrap gap-2">
        {colorKeys.map((k) => (
          <div key={k} className="flex flex-col items-center text-[10px]">
            <span
              className="h-8 w-8 rounded border"
              style={{
                backgroundColor: theme.colors[k],
                borderRadius: theme.radii.md,
              }}
            />
            {k}
          </div>
        ))}
      </div>
    </div>
  );
}
