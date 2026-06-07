"use client";

import DealCard from "./DealCard";

export default function PipelineColumn({
  stage,
  deals
}: {
  stage: any;
  deals: any[];
}) {
  return (
    <div
      style={{
        width: 280,
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 12
      }}
    >
      <h3>{stage.name}</h3>

      {deals.map(d => (
        <DealCard key={d.id} deal={d} />
      ))}
    </div>
  );
}
