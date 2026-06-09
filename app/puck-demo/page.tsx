"use client";

import { useEffect, useState } from "react";
import { Puck, Render, type Data } from "@measured/puck";
import "@measured/puck/puck.css";
import { config, initialData } from "./puck.config";

/**
 * Puck editor PROTOTYPE (isolated at /puck-demo). A maintained, open-source drag-and-drop
 * editor running inside our Next.js app — drag blocks from the left, edit on the right,
 * nested columns, undo/redo. Data persists to localStorage so you can refine and "Preview".
 * This is the "evaluate Puck" experiment; it does not touch the existing editor.
 */
const KEY = "puck-demo-data-v1";

export default function PuckDemoPage() {
  const [data, setData] = useState<Data | null>(null);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); setData(raw ? JSON.parse(raw) : (initialData as unknown as Data)); }
    catch { setData(initialData as unknown as Data); }
  }, []);

  if (!data) return <div style={{ padding: 40, fontFamily: "Inter, sans-serif" }}>Loading editor…</div>;

  if (preview) {
    return (
      <div>
        <div style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", gap: 12, alignItems: "center", padding: "10px 16px", background: "#111", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: 14 }}>
          <strong>Preview</strong>
          <button onClick={() => setPreview(false)} style={{ marginLeft: "auto", background: "#fff", color: "#111", border: "none", borderRadius: 6, padding: "6px 14px", fontWeight: 600, cursor: "pointer" }}>← Back to editor</button>
        </div>
        <Render config={config} data={data} />
      </div>
    );
  }

  return (
    <Puck
      config={config}
      data={data}
      onPublish={(d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {} setData(d); setPreview(true); }}
      onChange={(d) => { setData(d); try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {} }}
      headerTitle="Puck prototype — Contemporary Luxury"
    />
  );
}
