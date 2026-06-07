"use client";

export default function DealCard({ deal }: { deal: any }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 6,
        border: "1px solid var(--border)",
        background: "var(--card)"
      }}
    >
      <strong>{deal.title}</strong>
      <div style={{ opacity: 0.8 }}>
        {deal.value ? `$${deal.value}` : "No value"} • {deal.status}
      </div>
    </div>
  );
}
