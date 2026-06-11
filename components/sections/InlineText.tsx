"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties, ElementType } from "react";
import { sanitizeInlineHtml } from "@/lib/sections/rich-text";

/**
 * In-place editable text node for the editor canvas (polished direct editing).
 *
 * Rendered ONLY when an `onChange` is passed (i.e. inside the editor) — published
 * pages render plain text, so this never affects the live site. The text is
 * managed imperatively via a ref (not React children) so React re-renders during
 * typing never reset the caret. Commits on blur.
 *
 * D-220 additions:
 *  - `rich`: the field stores sanitized inline HTML (<b>/<i>/<u>/<a>/<br>) — editing keeps the
 *    markup, the floating popup's B/I/U/link act on the live selection, commit re-sanitizes.
 *  - `onEnter` / `onEmptyBackspace`: list-item editing hooks (Enter splits in a new item,
 *    Backspace on an empty item removes it) so Lists are edited entirely on the canvas.
 *  - `autoFocus`: focus this node on mount (the freshly-added list item).
 */
export default function InlineText({
  as, text, onChange, className, style, multiline, rich, onEnter, onEmptyBackspace, autoFocus,
}: {
  as?: ElementType;
  text: string;
  onChange: (next: string) => void;
  className?: string;
  style?: CSSProperties;
  multiline?: boolean;
  rich?: boolean;
  /** Enter pressed (non-multiline): receives the current text; preventDefaults instead of blurring. */
  onEnter?: (current: string) => void;
  /** Backspace pressed while the node is empty. */
  onEmptyBackspace?: () => void;
  autoFocus?: boolean;
}) {
  const As: any = as || "span";
  const ref = useRef<HTMLElement>(null);

  // Sync the DOM only when not actively editing, so typing is never clobbered.
  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    if (rich) {
      const clean = sanitizeInlineHtml(text ?? "");
      if (el.innerHTML !== clean) el.innerHTML = clean;
    } else if (el.textContent !== (text ?? "")) {
      el.textContent = text ?? "";
    }
  }, [text, rich]);

  useEffect(() => {
    if (autoFocus) {
      const el = ref.current;
      if (el) {
        el.focus();
        // caret at the end
        const sel = window.getSelection();
        if (sel) { sel.selectAllChildren(el); sel.collapseToEnd(); }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  const commitValue = (el: HTMLElement) => (rich ? sanitizeInlineHtml(el.innerHTML) : (el.textContent ?? ""));

  return (
    <As
      ref={ref}
      className={className}
      style={{ ...style, outline: "none", cursor: "text" }}
      contentEditable
      suppressContentEditableWarning
      data-placeholder="Type here…"
      onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      onBlur={(e: React.FocusEvent<HTMLElement>) => onChange(commitValue(e.currentTarget))}
      onKeyDown={(e: React.KeyboardEvent) => {
        const el = e.currentTarget as HTMLElement;
        if (e.key === "Enter" && !multiline && !e.shiftKey) {
          e.preventDefault();
          if (onEnter) onEnter(commitValue(el));
          else el.blur();
        }
        if (e.key === "Backspace" && onEmptyBackspace && !(el.textContent ?? "").length) {
          e.preventDefault();
          onEmptyBackspace();
        }
        if (e.key === "Escape") { el.blur(); }
      }}
    />
  );
}
