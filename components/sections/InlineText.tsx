"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties, ElementType } from "react";

/**
 * In-place editable text node for the editor canvas (polished direct editing).
 *
 * Rendered ONLY when an `onChange` is passed (i.e. inside the editor) — published
 * pages render plain text, so this never affects the live site. The text is
 * managed imperatively via a ref (not React children) so React re-renders during
 * typing never reset the caret. Commits on blur.
 */
export default function InlineText({
  as, text, onChange, className, style, multiline,
}: {
  as?: ElementType;
  text: string;
  onChange: (next: string) => void;
  className?: string;
  style?: CSSProperties;
  multiline?: boolean;
}) {
  const As: any = as || "span";
  const ref = useRef<HTMLElement>(null);

  // Sync the DOM text only when not actively editing, so typing is never clobbered.
  useEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.textContent !== (text ?? "")) {
      el.textContent = text ?? "";
    }
  }, [text]);

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
      onBlur={(e: React.FocusEvent<HTMLElement>) => onChange(e.currentTarget.textContent ?? "")}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !multiline && !e.shiftKey) { e.preventDefault(); (e.currentTarget as HTMLElement).blur(); }
        if (e.key === "Escape") { (e.currentTarget as HTMLElement).blur(); }
      }}
    />
  );
}
