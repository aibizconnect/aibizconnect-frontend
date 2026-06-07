"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type SaveMode = "template" | "global";

/**
 * polished "Save This Section" dialog (portal). Name + two save modes:
 *  - Section Template: saves a COPY reusable anywhere (website_section_templates).
 *  - Global Section: saves at WEBSITE level (website_global_blocks); edits to one instance
 *    sync across the whole site. (the leading builder's account-level "Universal Sections" is intentionally
 *    omitted per Ali.)
 */
export default function SaveAssetModal({
  open, defaultName, alreadySavedAs, isAlreadyGlobal, onSave, onClose,
}: {
  open: boolean;
  defaultName: string;
  alreadySavedAs?: string | null;     // existing template with identical content
  isAlreadyGlobal?: boolean;          // this section is already a global instance
  onSave: (name: string, description: string, mode: SaveMode) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(defaultName);
  const [mode, setMode] = useState<SaveMode>("template");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (open) { setName(defaultName); setMode("template"); setDone(false); setBusy(false); } }, [open, defaultName]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  async function save() {
    if (!name.trim() || busy) return;
    setBusy(true);
    try { await onSave(name.trim(), "", mode); setDone(true); setTimeout(onClose, 900); }
    catch (e: any) { alert(e?.message ?? "Could not save."); setBusy(false); }
  }

  const Card = ({ m, title, blurb, icon, color, disabled }: { m: SaveMode; title: string; blurb: string; icon: string; color: string; disabled?: boolean }) => (
    <button type="button" disabled={disabled} onClick={() => !disabled && setMode(m)}
      className={`flex flex-1 flex-col items-center rounded-xl border-2 p-3 text-center transition ${disabled ? "cursor-not-allowed border-slate-200 opacity-50" : mode === m ? "border-[#1e3a8a] bg-[#1e3a8a]/5" : "border-slate-200 hover:border-slate-300"}`}>
      <div className={`mb-2 flex h-16 w-full items-center justify-center rounded-lg ${color}`}><span className="text-2xl">{icon}</span></div>
      <span className="text-sm font-semibold text-slate-800">{title}</span>
      <span className="mt-0.5 text-[11px] leading-snug text-slate-500">{blurb}</span>
    </button>
  );

  // NOTE: clicking the backdrop does NOT close the dialog (a notification stealing focus
  // used to dismiss it mid-name). Close only via ✕ / Cancel / Esc.
  return createPortal(
    <div className="fixed inset-0 z-[2147483600] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-800">💾 Save This Section</h3>
            <p className="text-xs text-slate-500">Choose how you want to save your section</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">✕</button>
        </div>

        {done ? (
          <div className="rounded-lg bg-emerald-50 px-3 py-5 text-center text-sm font-medium text-emerald-700">
            {mode === "global" ? "Saved as a Global Section ✓ — edits will sync across the site." : "Saved to your Section Templates ✓"}
          </div>
        ) : (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">Give your saved section a name</span>
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") save(); }}
                placeholder="Name section…" className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
            </label>

            {alreadySavedAs && mode === "template" && (
              <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700">
                Already saved as a template: <b>“{alreadySavedAs}”</b>. Saving creates a separate copy.
              </div>
            )}
            {isAlreadyGlobal && mode === "global" && (
              <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[12px] text-amber-700">
                <b>This section is already a Global Section.</b> Its edits already sync across the whole site — there's nothing more to save here. To reuse its design on another page, pick <b>Section Templates</b> instead.
              </div>
            )}

            <p className="mb-2 mt-4 text-xs font-medium text-slate-600">Choose how you want to save</p>
            <div className="flex gap-3">
              <Card m="template" title="Section Templates" icon="🧩" color="bg-indigo-50"
                blurb="Saves as a copy you can reuse anywhere as a template." />
              <Card m="global" title="Global Sections" icon="🔗" color="bg-violet-50"
                blurb={isAlreadyGlobal ? "This section is already global — edits already sync site‑wide." : "Saves at website level. Edits in one instance sync across this website."} />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600">Cancel</button>
              <button onClick={save} disabled={!name.trim() || busy || (isAlreadyGlobal && mode === "global")}
                className="rounded-lg bg-[#1e3a8a] px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
