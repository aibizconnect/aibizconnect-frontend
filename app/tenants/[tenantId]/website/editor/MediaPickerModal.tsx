"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import MediaLibraryRoot from "@/components/media/MediaLibraryRoot";

interface MediaPickerModalProps {
  tenantId: string;
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

/**
 * In-editor Media Library — a modal wrapper around the shared MediaLibraryRoot in
 * insert mode (Copilot Q4: one component, no drift). Selecting an asset returns its
 * URL to the caller and closes.
 */
export default function MediaPickerModal({ tenantId, open, onClose, onSelect }: MediaPickerModalProps) {
  // Render into a portal at <body> so the modal escapes the inspector's stacking context
  // and sits above EVERYTHING (canvas, toolbars, panels). Close on Escape too.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;
  const modal = (
    <div className="fixed inset-0 z-[2147483600] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex max-h-[84vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-lg font-semibold text-slate-800">Media Library</h3>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">✕</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <MediaLibraryRoot tenantId={tenantId} mode="insert" onSelect={(url) => { onSelect(url); onClose(); }} />
        </div>
      </div>
    </div>
  );
  return createPortal(modal, document.body);
}
