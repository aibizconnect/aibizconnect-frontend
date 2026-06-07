"use client";

import { useState } from "react";

export default function MergeConflictVisualizer({
  merge
}: {
  merge: any;
}) {
  if (!merge) {
    return (
      <div style={{ opacity: 0.6, padding: 16 }}>
        No merge data available.
      </div>
    );
  }

  const { base, ours, theirs, merged, conflicts } = merge;

  return (
    <div
      style={{
        padding: 24,
        border: "1px solid #ddd",
        borderRadius: 8,
        marginTop: 32
      }}
    >
      <h2 style={{ marginBottom: 16 }}>Merge Conflict Visualizer</h2>

      {/* Conflicts */}
      {conflicts && conflicts.length > 0 ? (
        <div
          style={{
            background: "#fff4f4",
            border: "1px solid #ffcccc",
            padding: 16,
            borderRadius: 6,
            marginBottom: 24
          }}
        >
          <h3 style={{ marginBottom: 8 }}>Conflicts Detected</h3>
          <ul>
            {conflicts.map((c: any, i: number) => (
              <li key={i} style={{ marginBottom: 6 }}>
                {c}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div
          style={{
            background: "#f0fff4",
            border: "1px solid #c6f6d5",
            padding: 16,
            borderRadius: 6,
            marginBottom: 24
          }}
        >
          <strong>No conflicts — merge was clean.</strong>
        </div>
      )}

      {/* Side-by-side diff */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16
        }}
      >
        <DiffBlock title="Base" content={base} />
        <DiffBlock title="Ours (Builder)" content={ours} />
        <DiffBlock title="Theirs (Reviewer)" content={theirs} />
      </div>

      {/* Final merged output */}
      <section style={{ marginTop: 32 }}>
        <h3>Merged Output</h3>
        <pre
          style={{
            background: "#fafafa",
            padding: 16,
            borderRadius: 6,
            overflowX: "auto",
            whiteSpace: "pre-wrap"
          }}
        >
          {merged || "// No merged output"}
        </pre>
      </section>
    </div>
  );
}

function DiffBlock({
  title,
  content
}: {
  title: string;
  content: string;
}) {
  return (
    <div>
      <h3 style={{ marginBottom: 8 }}>{title}</h3>
      <pre
        style={{
          background: "#fafafa",
          padding: 12,
          borderRadius: 6,
          overflowX: "auto",
          whiteSpace: "pre-wrap",
          minHeight: 200
        }}
      >
        {content || "// No content"}
      </pre>
    </div>
  );
}
