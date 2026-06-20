"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Small, dependency-free WYSIWYG editor for email signatures (D-404). A contentEditable surface plus
 * a formatting toolbar (bold / italic / underline / link / lists / clear). It emits simple inline
 * HTML via onChange — exactly what an email signature needs (no block frameworks, no external fonts).
 *
 *   <RichTextEditor value={html} onChange={setHtml} placeholder="Jane Agent, Broker…" />
 *
 * Reusable anywhere a light HTML editor is wanted. We sync the prop into the DOM only when it differs
 * AND the field isn't focused, so typing never loses the caret.
 */
export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 140,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [focused, setFocused] = useState(false);
  const [empty, setEmpty] = useState(!value);

  // Load external value in (initial mount + programmatic resets) without clobbering an active caret.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!focused && el.innerHTML !== value) el.innerHTML = value || "";
    setEmpty(!(el.textContent || "").trim() && !/<img|<br/i.test(el.innerHTML));
  }, [value, focused]);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    setEmpty(!(el.textContent || "").trim() && !/<img|<br/i.test(el.innerHTML));
    onChange(el.innerHTML);
  };

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    try { document.execCommand(command, false, arg); } catch { /* no-op */ }
    emit();
  };

  const addLink = () => {
    const url = window.prompt("Link URL (https://…)");
    if (!url) return;
    const href = /^https?:\/\/|^mailto:|^tel:/i.test(url) ? url : `https://${url}`;
    exec("createLink", href);
  };

  const Btn = ({ on, label, title }: { on: () => void; label: ReactNode; title: string }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); on(); }}
      className="grid h-7 min-w-7 place-items-center rounded px-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    >
      {label}
    </button>
  );

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 focus-within:border-[#1e3a8a] focus-within:ring-1 focus-within:ring-[#1e3a8a]">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-1.5 py-1">
        <Btn on={() => exec("bold")} label={<b>B</b>} title="Bold" />
        <Btn on={() => exec("italic")} label={<i>I</i>} title="Italic" />
        <Btn on={() => exec("underline")} label={<u>U</u>} title="Underline" />
        <span className="mx-1 h-4 w-px bg-slate-200" />
        <Btn on={addLink} label="🔗" title="Insert link" />
        <Btn on={() => exec("insertUnorderedList")} label="•" title="Bulleted list" />
        <Btn on={() => exec("insertOrderedList")} label="1." title="Numbered list" />
        <span className="mx-1 h-4 w-px bg-slate-200" />
        <Btn on={() => exec("removeFormat")} label="⌫" title="Clear formatting" />
      </div>
      <div className="relative">
        {empty && placeholder && (
          <div className="pointer-events-none absolute left-3 top-2.5 text-sm text-slate-400">{placeholder}</div>
        )}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onBlur={() => { setFocused(false); emit(); }}
          onFocus={() => setFocused(true)}
          spellCheck
          className="prose-sm max-w-none px-3 py-2.5 text-sm leading-relaxed text-slate-800 outline-none [&_a]:text-[#1e3a8a] [&_a]:underline"
          style={{ minHeight }}
        />
      </div>
    </div>
  );
}
