"use client";

import { useEffect, useState } from "react";

interface Trigger {
  id: string;
  provider: string;
  event: string;
  workflow_id: string;
}

interface TriggerForm {
  provider: string;
  event: string;
  workflow_id: string;
}

const PROVIDERS = ["twilio", "stripe", "supabase", "webhook"];

export default function TriggerManager({ tenantId }: { tenantId: string }) {
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [form, setForm] = useState<TriggerForm>({ provider: "twilio", event: "", workflow_id: "" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch(`/agent/tenants/${tenantId}/triggers`);
      if (res.ok) setTriggers(await res.json());
    } catch {
      setError("Failed to load triggers.");
    }
  }

  useEffect(() => { load(); }, [tenantId]);

  async function saveTrigger() {
    if (!form.event.trim()) { setError("Event is required."); return; }
    if (!form.workflow_id.trim()) { setError("Workflow ID is required."); return; }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/agent/tenants/${tenantId}/triggers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      setForm({ provider: "twilio", event: "", workflow_id: "" });
      await load();
    } catch (err: any) {
      setError(err.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTrigger(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/agent/tenants/${tenantId}/triggers/${id}`, { method: "DELETE" });
      await load();
    } catch {
      setError("Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Trigger Configuration</h1>

      {/* Add trigger form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Add Trigger</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
          <select
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={form.provider}
            onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
          >
            {PROVIDERS.map(p => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Event</label>
          <input
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="e.g. message.received"
            value={form.event}
            onChange={e => setForm(f => ({ ...f, event: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Workflow ID</label>
          <input
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Workflow to trigger"
            value={form.workflow_id}
            onChange={e => setForm(f => ({ ...f, workflow_id: e.target.value }))}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          onClick={saveTrigger}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {saving ? "Saving..." : "Save Trigger"}
        </button>
      </div>

      {/* Existing triggers */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Existing Triggers
          {triggers.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">({triggers.length})</span>
          )}
        </h2>

        {triggers.length === 0 && (
          <p className="text-sm text-gray-400">No triggers configured yet.</p>
        )}

        <ul className="space-y-3">
          {triggers.map(t => (
            <li key={t.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                    {t.provider}
                  </span>
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">Event:</span> {t.event}
                  </p>
                  <p className="text-sm text-gray-500 font-mono">
                    Workflow: {t.workflow_id}
                  </p>
                </div>
                <button
                  onClick={() => deleteTrigger(t.id)}
                  disabled={deletingId === t.id}
                  className="shrink-0 text-sm text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
                >
                  {deletingId === t.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
