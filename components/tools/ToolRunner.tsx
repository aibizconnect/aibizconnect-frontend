"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { runToolAction, saveRunAction } from "@/app/tenants/[tenantId]/tools/actions";

/** Client field shape (registry field + prefilled value from the shared profile). */
type Field = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select";
  required?: boolean;
  placeholder?: string;
  options?: string[];
  prefill?: string;
};

export default function ToolRunner({ tenantId, toolKey, fields }: { tenantId: string; toolKey: string; fields: Field[] }) {
  const init: Record<string, string> = {};
  for (const f of fields) init[f.key] = f.prefill || (f.type === "select" && f.options?.length ? f.options[0] : "");
  const [inputs, setInputs] = useState<Record<string, string>>(init);
  const [output, setOutput] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [err, setErr] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const set = (k: string, v: string) => setInputs((p) => ({ ...p, [k]: v }));

  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
  const styledHtml = () =>
    `<!doctype html><meta charset="utf-8"><title>${toolKey} draft</title><pre style="font:14px/1.6 system-ui,Segoe UI,Arial;white-space:pre-wrap;color:#0f172a;max-width:720px;margin:48px auto;padding:0 24px">${esc(output)}</pre>`;

  const download = (ext: "md" | "txt" | "html") => {
    const name = `${toolKey}-draft.${ext}`;
    const body = ext === "html" ? styledHtml() : output;
    const blob = new Blob([body], { type: ext === "html" ? "text/html" : "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  // PDF via the browser print pipeline (no external dependency) — opens a clean print
  // window and triggers Save-as-PDF. Still a private draft; nothing is sent.
  const exportPdf = () => {
    const w = window.open("", "_blank");
    if (!w) { setExportOpen(false); return; }
    w.document.write(`${styledHtml()}<script>window.onload=function(){window.print();}<\/script>`);
    w.document.close();
    setExportOpen(false);
  };

  const generate = () => start(async () => {
    setErr(""); setOutput(""); setSaved(false);
    const r = await runToolAction(tenantId, toolKey, inputs);
    if (!r.ok) { setErr(r.error || "Could not generate."); return; }
    setOutput(r.output); setSource(r.source);
  });

  const save = () => start(async () => {
    const r = await saveRunAction(tenantId, toolKey, inputs, output);
    setSaved(r.ok);
    if (r.ok) router.refresh();
    else setErr(r.error || "Could not save (drafts table may not be applied yet).");
  });

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {f.label}{f.required && <span className="text-red-500"> *</span>}
              </label>
              {f.type === "textarea" ? (
                <textarea value={inputs[f.key]} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder}
                  rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1e3a8a]" />
              ) : f.type === "select" ? (
                <select value={inputs[f.key]} onChange={(e) => set(f.key, e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1e3a8a]">
                  {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input value={inputs[f.key]} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1e3a8a]" />
              )}
            </div>
          ))}
        </div>
        <button onClick={generate} disabled={pending}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#2563eb] to-[#22d3ee] py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Generating…" : "✨ Generate"}
        </button>
        <p className="mt-2 text-center text-[11px] text-slate-400">Uses your brand voice automatically. Output is a private draft — nothing is published, sent, or charged.</p>
      </div>

      {err && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}

      {output && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-700">Draft output</span>
            <div className="flex flex-wrap items-center gap-2">
              {source === "fallback" && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700">no model key — structured draft</span>}
              <button onClick={() => { setEditing((e) => !e); setSaved(false); }} className={`rounded border px-2 py-1 text-xs ${editing ? "border-[#1e3a8a] bg-[#1e3a8a]/5 text-[#1e3a8a]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{editing ? "Done editing" : "Edit"}</button>
              <button onClick={() => navigator.clipboard?.writeText(output)} className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">Copy</button>
              <div className="relative">
                <button onClick={() => setExportOpen((o) => !o)} className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">Export ▾</button>
                {exportOpen && (
                  <div className="absolute right-0 z-10 mt-1 w-32 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                    <button onClick={exportPdf} className="block w-full px-3 py-1.5 text-left text-xs font-medium text-[#1e3a8a] hover:bg-slate-50">PDF</button>
                    {(["md", "txt", "html"] as const).map((x) => (
                      <button key={x} onClick={() => download(x)} className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50">.{x}</button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={save} disabled={pending} className="rounded bg-[#1e3a8a] px-3 py-1 text-xs text-white disabled:opacity-60">{saved ? "Saved ✓" : "Save draft"}</button>
            </div>
          </div>
          {editing ? (
            <textarea value={output} onChange={(e) => { setOutput(e.target.value); setSaved(false); }} rows={18}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm leading-relaxed text-slate-800 outline-none focus:border-[#1e3a8a]" />
          ) : (
            <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-slate-800">{output}</pre>
          )}
        </div>
      )}
    </div>
  );
}
