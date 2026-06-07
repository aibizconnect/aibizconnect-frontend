"use client";

export default function ConditionBuilder({
  value,
  onChange
}: {
  value: any;
  onChange: (v: any) => void;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3>Conditions (optional)</h3>

      <textarea
        value={JSON.stringify(value, null, 2)}
        onChange={e => {
          try {
            onChange(JSON.parse(e.target.value));
          } catch {}
        }}
        placeholder="{}"
        style={{
          width: "100%",
          height: 120,
          padding: 12,
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: "var(--card)",
          color: "var(--text)"
        }}
      />
    </div>
  );
}
