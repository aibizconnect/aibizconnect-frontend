"use client";

import { useState } from "react";

export default function ReviewerIssueInspector({ review }: { review: any }) {
  if (!review) {
    return (
      <div style={{ opacity: 0.6, padding: 16 }}>
        No reviewer data available.
      </div>
    );
  }

  const { issues, warnings, suggestions, autofix } = review;

  return (
    <div
      style={{
        padding: 24,
        border: "1px solid #ddd",
        borderRadius: 8,
        marginTop: 32
      }}
    >
      <h2 style={{ marginBottom: 16 }}>Reviewer Issue Inspector</h2>

      {/* Issues */}
      <Section title="Issues" items={issues} color="#fee2e2" />

      {/* Warnings */}
      <Section title="Warnings" items={warnings} color="#fef9c3" />

      {/* Suggestions */}
      <Section title="Suggestions" items={suggestions} color="#e0f2fe" />

      {/* Auto-fix */}
      {autofix && (
        <section style={{ marginTop: 24 }}>
          <h3>Auto‑Fix Recommendation</h3>
          <pre
            style={{
              background: "#fafafa",
              padding: 12,
              borderRadius: 6,
              whiteSpace: "pre-wrap"
            }}
          >
            {autofix}
          </pre>
        </section>
      )}
    </div>
  );
}

function Section({
  title,
  items,
  color
}: {
  title: string;
  items: any[];
  color: string;
}) {
  if (!items || items.length === 0) return null;

  return (
    <section style={{ marginBottom: 24 }}>
      <h3>{title}</h3>
      <div
        style={{
          background: color,
          padding: 12,
          borderRadius: 6
        }}
      >
        <ul style={{ lineHeight: "1.8" }}>
          {items.map((item: any, i: number) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
