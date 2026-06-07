"use client";

import { useState } from "react";

export default function ArchitectPlanViewer({ architect }: { architect: any }) {
  if (!architect) {
    return (
      <div style={{ opacity: 0.6, padding: 16 }}>
        No architect plan available.
      </div>
    );
  }

  const { plan, reasoning, steps } = architect;

  return (
    <div
      style={{
        padding: 24,
        border: "1px solid #ddd",
        borderRadius: 8,
        marginTop: 32
      }}
    >
      <h2 style={{ marginBottom: 16 }}>Architect Plan</h2>

      {/* High-level plan */}
      {plan && (
        <section style={{ marginBottom: 24 }}>
          <h3>High-Level Plan</h3>
          <pre
            style={{
              background: "#fafafa",
              padding: 12,
              borderRadius: 6,
              whiteSpace: "pre-wrap"
            }}
          >
            {plan}
          </pre>
        </section>
      )}

      {/* Reasoning */}
      {reasoning && (
        <section style={{ marginBottom: 24 }}>
          <h3>Reasoning</h3>
          <pre
            style={{
              background: "#fafafa",
              padding: 12,
              borderRadius: 6,
              whiteSpace: "pre-wrap"
            }}
          >
            {reasoning}
          </pre>
        </section>
      )}

      {/* Steps */}
      {steps && steps.length > 0 && (
        <section>
          <h3>Steps</h3>
          <ul style={{ lineHeight: "1.8" }}>
            {steps.map((s: string, i: number) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
