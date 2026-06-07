"use client";

import { useState } from "react";
import TriggerSelector from "./TriggerSelector";
import ConditionBuilder from "./ConditionBuilder";
import ActionBuilder from "./ActionBuilder";

export default function AutomationBuilder({ tenantId }: { tenantId: string }) {
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<string | null>(null);
  const [conditions, setConditions] = useState<any>({});
  const [actions, setActions] = useState<any[]>([]);

  async function save() {
    await fetch(`/tenants/${tenantId}/automations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        event_type: trigger,
        conditions,
        actions
      })
    });

    window.location.href = `/tenants/${tenantId}/automations`;
  }

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ marginBottom: 24 }}>Create Automation</h1>

      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Automation name"
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: "var(--card)",
          color: "var(--text)",
          marginBottom: 24
        }}
      />

      <TriggerSelector value={trigger} onChange={setTrigger} />

      <ConditionBuilder value={conditions} onChange={setConditions} />

      <ActionBuilder value={actions} onChange={setActions} />

      <button
        onClick={save}
        style={{
          marginTop: 24,
          padding: "8px 16px",
          borderRadius: 6,
          background: "#4f46e5",
          color: "white",
          border: "none",
          cursor: "pointer"
        }}
      >
        Save Automation
      </button>
    </div>
  );
}
