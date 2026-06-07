"use client";

import { useEffect, useState } from "react";
import { getCustomCss, saveCustomCss } from "../css-actions";

/** Per-page Custom CSS editor (builder "Code" tab). Applied on the public page render. */
export default function CustomCssPanel({ tenantId, selectedPageId }: { tenantId: string; selectedPageId: string | null }) {
  const [css, setCss] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedPageId) return;
    setLoading(true);
    getCustomCss(tenantId, selectedPageId).then((v) => { setCss(v); setLoading(false); });
  }, [tenantId, selectedPageId]);

  if (!selectedPageId) return <div className="text-sm text-gray-500">Select a page to add custom CSS.</div>;

  async function save() {
    setStatus("Saving…");
    const r = await saveCustomCss(tenantId, selectedPageId!, css);
    setStatus(r.ok ? "Saved ✓" : (r.error ?? "Failed").includes("custom_css") ? "Run the Custom CSS migration first." : `Error: ${r.error}`);
    setTimeout(() => setStatus(null), 2500);
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">Custom CSS</h2>
      <p className="text-xs text-gray-400">Advanced. Applied to this page on publish, inside your brand-token sandbox. Use <code>.abc-*</code> vars for brand colors.</p>
      <textarea
        value={css} onChange={(e) => setCss(e.target.value)} spellCheck={false}
        rows={16} placeholder={loading ? "Loading…" : "/* e.g. */\n.hero h1 { letter-spacing: -0.02em; }"}
        className="w-full rounded border border-gray-300 bg-gray-900 px-3 py-2 font-mono text-xs text-gray-100"
      />
      <div className="flex items-center gap-3">
        <button onClick={save} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">Save CSS</button>
        {status && <span className="text-xs text-gray-500">{status}</span>}
      </div>
    </div>
  );
}
