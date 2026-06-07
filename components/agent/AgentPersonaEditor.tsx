"use client";

import { useEffect, useState } from "react";

interface Persona {
  name: string;
  role: string;
  personality: string;
  tone: string;
  expertise: string;
  instructions: string;
}

const FIELD_LABELS: Record<keyof Persona, string> = {
  name: "Name",
  role: "Role",
  personality: "Personality",
  tone: "Tone",
  expertise: "Expertise",
  instructions: "Instructions"
};

// Short single-line fields vs long multi-line fields
const MULTILINE_FIELDS: (keyof Persona)[] = ["personality", "expertise", "instructions"];

type SaveState = "idle" | "saving" | "saved" | "error";

export default function AgentPersonaEditor({ tenantId }: { tenantId: string }) {
  const [persona, setPersona] = useState<Persona>({
    name: "",
    role: "",
    personality: "",
    tone: "",
    expertise: "",
    instructions: ""
  });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/agent/tenants/${tenantId}/agent/persona`, {
          cache: "no-store"
        });
        if (res.ok) {
          const data = await res.json();
          if (data) setPersona(prev => ({ ...prev, ...data }));
        }
      } catch {
        setLoadError("Could not load existing persona.");
      }
    }
    load();
  }, [tenantId]);

  async function save() {
    setSaveState("saving");
    setError(null);

    try {
      const res = await fetch(`/agent/tenants/${tenantId}/agent/persona`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(persona)
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 3000);
    } catch (err: any) {
      setError(err.message ?? "Save failed.");
      setSaveState("error");
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agent Persona</h1>
        <p className="text-sm text-gray-500 mt-1">
          Define your agent's identity, tone, and behavior for this tenant.
        </p>
      </div>

      {loadError && (
        <p className="text-sm text-yellow-700 bg-yellow-50 rounded-lg px-3 py-2">{loadError}</p>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
        {(Object.keys(FIELD_LABELS) as (keyof Persona)[]).map(key => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {FIELD_LABELS[key]}
            </label>
            {MULTILINE_FIELDS.includes(key) ? (
              <textarea
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                rows={key === "instructions" ? 5 : 3}
                placeholder={
                  key === "instructions"
                    ? "e.g. Always respond in a concise, professional manner..."
                    : undefined
                }
                value={persona[key]}
                onChange={e => setPersona(p => ({ ...p, [key]: e.target.value }))}
              />
            ) : (
              <input
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder={
                  key === "name" ? "e.g. Aria" :
                  key === "role" ? "e.g. Customer Support Specialist" :
                  key === "tone" ? "e.g. Friendly, professional, concise" :
                  undefined
                }
                value={persona[key]}
                onChange={e => setPersona(p => ({ ...p, [key]: e.target.value }))}
              />
            )}
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
        {saveState === "saving" ? "Saving..." : saveState === "saved" ? "✓ Persona Saved!" : "Save Persona"}
      </button>
    </div>
  );
}
