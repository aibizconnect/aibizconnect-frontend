"use client";

import { useState } from "react";

export default function TestCoveragePanel({ test }: { test: any }) {
  if (!test) {
    return (
      <div style={{ opacity: 0.6, padding: 16 }}>
        No test data available.
      </div>
    );
  }

  const { summary, tests, coverage_notes, recommendation } = test;

  return (
    <div
      style={{
        padding: 24,
        border: "1px solid #ddd",
        borderRadius: 8,
        marginTop: 32
      }}
    >
      <h2 style={{ marginBottom: 16 }}>Test Coverage Panel</h2>

      {/* Summary */}
      {summary && (
        <section style={{ marginBottom: 24 }}>
          <h3>Summary</h3>
          <div
            style={{
              background: "#fafafa",
              padding: 12,
              borderRadius: 6,
              whiteSpace: "pre-wrap"
            }}
          >
            {summary}
          </div>
        </section>
      )}

      {/* Test Files */}
      <section style={{ marginBottom: 24 }}>
        <h3>Generated Test Files</h3>

        {(!tests || tests.length === 0) && (
          <div style={{ opacity: 0.6 }}>No test files generated.</div>
        )}

        {tests &&
          tests.map((file: any, i: number) => (
            <TestFileBlock key={i} file={file} index={i} />
          ))}
      </section>

      {/* Coverage Notes */}
      {coverage_notes && (
        <section style={{ marginBottom: 24 }}>
          <h3>Coverage Notes</h3>
          <pre
            style={{
              background: "#fafafa",
              padding: 12,
              borderRadius: 6,
              whiteSpace: "pre-wrap"
            }}
          >
            {coverage_notes}
          </pre>
        </section>
      )}

      {/* Recommendation */}
      {recommendation && (
        <section>
          <h3>Recommendation</h3>
          <pre
            style={{
              background: "#fafafa",
              padding: 12,
              borderRadius: 6,
              whiteSpace: "pre-wrap"
            }}
          >
            {recommendation}
          </pre>
        </section>
      )}
    </div>
  );
}

function TestFileBlock({ file, index }: { file: any; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 6,
        marginBottom: 12
      }}
    >
      <div
        onClick={() => setOpen(!open)}
        style={{
          padding: 12,
          cursor: "pointer",
          background: "#f7f7f7",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <strong>
          {index + 1}. {file.path}
        </strong>
        <span style={{ opacity: 0.6 }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <pre
          style={{
            background: "#fafafa",
            padding: 12,
            borderRadius: 6,
            overflowX: "auto",
            whiteSpace: "pre-wrap"
          }}
        >
          {file.content}
        </pre>
      )}
    </div>
  );
}
