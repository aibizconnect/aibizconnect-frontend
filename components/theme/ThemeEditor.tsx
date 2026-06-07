"use client";

import { useState } from "react";
import { loadTenantTheme } from "@/lib/theme";

interface ThemeFields {
  primary: string;
  secondary: string;
  accent: string;
  sidebar_color: string;
  logo_url: string;
}

const FIELD_LABELS: Record<keyof ThemeFields, string> = {
  primary: "Primary Color",
  secondary: "Secondary Color",
  accent: "Accent Color",
  sidebar_color: "Sidebar Color",
  logo_url: "Logo URL"
};

const COLOR_FIELDS: (keyof ThemeFields)[] = ["primary", "secondary", "accent", "sidebar_color"];

type SaveState = "idle" | "saving" | "saved" | "error";

export default function ThemeEditor({ tenantId }: { tenantId: string }) {
  const [theme, setTheme] = useState<ThemeFields>({
    primary: "",
    secondary: "",
    accent: "",
    sidebar_color: "",
    logo_url: ""
  });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaveState("saving");
    setError(null);

    try {
      const res = await fetch(`/agent/tenants/${tenantId}/theme`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(theme)
      });

      if (!res.ok) throw new Error(`Server responded ${res.status}`);

      // Apply the new theme immediately in the browser
      await loadTenantTheme(tenantId);

      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 3000);
    } catch (err: any) {
      setError(err.message ?? "Save failed.");
      setSaveState("error");
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900">Theme Settings</h1>
      <p className="text-sm text-gray-500">
        Customize your tenant's colors and branding. Changes are applied instantly.
      </p>

      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
        {(Object.keys(FIELD_LABELS) as (keyof ThemeFields)[]).map(key => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {FIELD_LABELS[key]}
            </label>
            <div className="flex items-center gap-3">
              {COLOR_FIELDS.includes(key) && theme[key] && (
                <span
                  className="h-8 w-8 rounded-full border border-gray-200 shrink-0"
                  style={{ backgroundColor: theme[key] }}
                />
              )}
              <input
                className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder={COLOR_FIELDS.includes(key) ? "#3b82f6 or hsl(217, 91%, 60%)" : "https://..."}
                value={theme[key]}
                onChange={e => setTheme(t => ({ ...t, [key]: e.target.value }))}
              />
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        onClick={save}
        disabled={saveState === "saving"}
        className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
      >
        {saveState === "saving" ? "Saving..." : saveState === "saved" ? "✓ Theme Applied!" : "Save Theme"}
      </button>
    </div>
  );
}
