"use client";

/**
 * App-wide, in-app replacements for the browser's native alert() / confirm() / prompt()
 * "system popups" (Ali's rule — no native gray dialogs anywhere). Imperative API so any
 * call site (even outside React) can use it:
 *
 *   notify("Saved")                              // ← was alert(...)
 *   if (await confirmDialog("Delete this?")) …   // ← was confirm(...)
 *   const name = await promptDialog("Folder name", { defaultValue: "" })  // ← was prompt(...)
 *
 * A single <GlobalDialogs/> (mounted once in ThemeWrapper) renders the toasts + modal.
 */

import { useSyncExternalStore, useEffect, useRef, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────
export type ToastVariant = "info" | "success" | "error" | "warning";

interface Toast {
  id: number;
  message: string;
  title?: string;
  variant: ToastVariant;
  duration: number;
}

type ModalKind = "confirm" | "prompt";
interface ModalState {
  id: number;
  kind: ModalKind;
  message: string;
  title?: string;
  confirmText: string;
  cancelText: string;
  danger?: boolean;
  // prompt-only
  defaultValue?: string;
  placeholder?: string;
  multiline?: boolean;
  resolve: (value: boolean | string | null) => void;
}

// ── Store ────────────────────────────────────────────────────────────────────
let _id = 1;
const nextId = () => _id++;

let toasts: Toast[] = [];
let modal: ModalState | null = null;
const listeners = new Set<() => void>();

function emit() {
  // new array/ref each time so useSyncExternalStore re-renders
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
const snapshot = () => state;
let state: { toasts: Toast[]; modal: ModalState | null } = { toasts, modal };
function commit() {
  state = { toasts, modal };
  emit();
}

function pushToast(t: Toast) {
  toasts = [...toasts, t];
  commit();
}
function dropToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  commit();
}
function setModal(m: ModalState | null) {
  modal = m;
  commit();
}

// ── Public imperative API ──────────────────────────────────────────────────────
export function notify(
  message: string,
  opts?: { variant?: ToastVariant; title?: string; duration?: number },
): void {
  const t: Toast = {
    id: nextId(),
    message: String(message ?? ""),
    title: opts?.title,
    variant: opts?.variant ?? "info",
    duration: opts?.duration ?? 4200,
  };
  pushToast(t);
}

/** Convenience: error-styled toast. */
export function notifyError(message: string, title = "Something went wrong") {
  notify(message, { variant: "error", title, duration: 6000 });
}

export function confirmDialog(
  message: string,
  opts?: { title?: string; confirmText?: string; cancelText?: string; danger?: boolean },
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    setModal({
      id: nextId(),
      kind: "confirm",
      message: String(message ?? ""),
      title: opts?.title,
      confirmText: opts?.confirmText ?? "OK",
      cancelText: opts?.cancelText ?? "Cancel",
      danger: opts?.danger,
      resolve: (v) => resolve(v === true),
    });
  });
}

export function promptDialog(
  message: string,
  opts?: { title?: string; defaultValue?: string; placeholder?: string; confirmText?: string; cancelText?: string; multiline?: boolean },
): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    setModal({
      id: nextId(),
      kind: "prompt",
      message: String(message ?? ""),
      title: opts?.title,
      defaultValue: opts?.defaultValue ?? "",
      placeholder: opts?.placeholder,
      multiline: opts?.multiline,
      confirmText: opts?.confirmText ?? "OK",
      cancelText: opts?.cancelText ?? "Cancel",
      resolve: (v) => resolve(typeof v === "string" ? v : null),
    });
  });
}

// ── Renderer (mounted once) ────────────────────────────────────────────────────
const VARIANT_STYLES: Record<ToastVariant, { bar: string; icon: string; ring: string }> = {
  info: { bar: "bg-blue-500", icon: "ℹ", ring: "ring-blue-100" },
  success: { bar: "bg-emerald-500", icon: "✓", ring: "ring-emerald-100" },
  error: { bar: "bg-red-500", icon: "✕", ring: "ring-red-100" },
  warning: { bar: "bg-amber-500", icon: "!", ring: "ring-amber-100" },
};

function ToastCard({ t }: { t: Toast }) {
  const s = VARIANT_STYLES[t.variant];
  useEffect(() => {
    if (t.duration <= 0) return;
    const h = setTimeout(() => dropToast(t.id), t.duration);
    return () => clearTimeout(h);
  }, [t.id, t.duration]);
  return (
    <div
      role="status"
      className={`pointer-events-auto flex w-80 max-w-[92vw] overflow-hidden rounded-lg bg-white shadow-lg ring-1 ${s.ring} animate-[abcToastIn_.18s_ease-out]`}
    >
      <div className={`w-1.5 shrink-0 ${s.bar}`} />
      <div className="flex flex-1 items-start gap-2 px-3 py-2.5">
        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${s.bar}`}>{s.icon}</span>
        <div className="min-w-0 flex-1">
          {t.title && <div className="text-sm font-semibold text-gray-900">{t.title}</div>}
          <div className="text-sm text-gray-600 break-words">{t.message}</div>
        </div>
        <button
          onClick={() => dropToast(t.id)}
          className="ml-1 shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Dismiss"
        >✕</button>
      </div>
    </div>
  );
}

function ModalView({ m }: { m: ModalState }) {
  const [value, setValue] = useState(m.defaultValue ?? "");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = inputRef.current;
    if (el) { el.focus(); if ("select" in el) (el as HTMLInputElement).select(); }
  }, [m.id]);

  const close = (result: boolean | string | null) => {
    const r = m.resolve;
    setModal(null);
    r(result);
  };
  const onConfirm = () => close(m.kind === "prompt" ? value : true);
  const onCancel = () => close(m.kind === "prompt" ? null : false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      else if (e.key === "Enter" && (m.kind === "confirm" || !m.multiline)) { e.preventDefault(); onConfirm(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.id, value]);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 animate-[abcFadeIn_.15s_ease-out]" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-2xl animate-[abcPopIn_.16s_ease-out]">
        {m.title && <h3 className="mb-1 text-base font-semibold text-gray-900">{m.title}</h3>}
        <p className="whitespace-pre-line text-sm text-gray-600">{m.message}</p>
        {m.kind === "prompt" && (
          m.multiline ? (
            <textarea
              ref={(el) => { inputRef.current = el; }}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={m.placeholder}
              rows={4}
              className="mt-3 w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          ) : (
            <input
              ref={(el) => { inputRef.current = el; }}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={m.placeholder}
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          )
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >{m.cancelText}</button>
          <button
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${m.danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}
          >{m.confirmText}</button>
        </div>
      </div>
    </div>
  );
}

export function GlobalDialogs() {
  const s = useSyncExternalStore(subscribe, snapshot, snapshot);
  return (
    <>
      <style>{`
        @keyframes abcToastIn { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: none; } }
        @keyframes abcFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes abcPopIn { from { opacity: 0; transform: translateY(6px) scale(.98); } to { opacity: 1; transform: none; } }
      `}</style>
      <div className="pointer-events-none fixed right-4 top-4 z-[10001] flex flex-col gap-2">
        {s.toasts.map((t) => <ToastCard key={t.id} t={t} />)}
      </div>
      {s.modal && <ModalView key={s.modal.id} m={s.modal} />}
    </>
  );
}
