"use client";

import { useState } from "react";

export default function BuilderIterationViewer({
  iterations
}: {
  iterations: any[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!iterations || iterations.length === 0) {
    return (
      <div style={{ opacity: 0.6, padding: 16 }}>
        No builder iterations recorded.
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 24,
        border: "1px solid #ddd",
        borderRadius: 8,
        marginTop: 32
      }}
    >
      <h2 style={{ marginBottom: 16 }}>Builder Iterations</h2>

      {iterations.map((it, i) => {
        const isOpen = openIndex === i;

        return (
          <div
            key={i}
            style={{
              border: "1px solid #eee",
              borderRadius: 6,
              marginBottom: 12
            }}
          >
            <div
              onClick={() => setOpenIndex(isOpen ? null : i)}
              style={{
                padding: 12,
                cursor: "pointer",
                background: "#f7f7f7",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <strong>Iteration {i + 1}</strong>
              <span style={{ opacity: 0.6 }}>
                {isOpen ? "▲" : "▼"}
              </span>
            </div>

            {isOpen && (
              <div style={{ padding: 16 }}>
                {/* Reasoning */}
                {it.reasoning && (
                  <section style={{ marginBottom: 20 }}>
                    <h3>Reasoning</h3>
                    <pre
                      style={{
                        background: "#fafafa",
                        padding: 12,
                        borderRadius: 6,
                        overflowX: "auto"
                      }}
                    >
                      {JSON.stringify(it.reasoning, null, 2)}
                    </pre>
                  </section>
                )}

                {/* Generated Code */}
                {it.generated && (
                  <section style={{ marginBottom: 20 }}>
                    <h3>Generated Code</h3>
                    <pre
                      style={{
                        background: "#fafafa",
                        padding: 12,
                        borderRadius: 6,
                        overflowX: "auto"
                      }}
                    >
                      {it.generated}
                    </pre>
                  </section>
                )}

                {/* Diff */}
                {it.diff && (
                  <section style={{ marginBottom: 20 }}>
                    <h3>Diff</h3>
                    <pre
                      style={{
                        background: "#fafafa",
                        padding: 12,
                        borderRadius: 6,
                        overflowX: "auto",
                        whiteSpace: "pre-wrap"
                      }}
                    >
                      {it.diff}
                    </pre>
                  </section>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
