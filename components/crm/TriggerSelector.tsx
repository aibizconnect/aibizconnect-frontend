"use client";

export default function TriggerSelector({
  value,
  onChange
}: {
  value: string | null;
  onChange: (v: string) => void;
}) {
  const triggers = [
    "contact.created",
    "deal.created",
    "deal.stage_changed",
    "task.created",
    "task.overdue"
  ];

  return (
    <div style={{ marginBottom: 24 }}>
      <h3>Trigger</h3>

      <select
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: "var(--card)",
          color: "var(--text)"
        }}
      >
        <option value="">Select trigger…</option>
        {triggers.map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
    </div>
  );
}
