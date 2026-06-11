/**
 * Inline rich text (D-220, Copilot-ratified storage model): text fields stay plain strings but
 * MAY carry a sanitized whitelist of inline tags — <b>/<strong>, <i>/<em>, <u>, <a href target>,
 * <br> — written by the floating text-format popup (selection bold/italic/underline/link).
 * Renderers call sanitizeInlineHtml right before dangerouslySetInnerHTML; the same function runs
 * at write time in the editor, so stored content is already clean — render-time is defense in
 * depth. SSR-safe: pure string processing, no DOM.
 */

const ALLOWED = new Set(["b", "strong", "i", "em", "u", "a", "br"]);

const escapeText = (s: string) => s.replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** True when the string contains (allowed) inline markup worth rendering as HTML. */
export const hasInlineMarkup = (s?: string | null): boolean =>
  !!s && /<(b|strong|i|em|u|a|br)\b/i.test(s);

/**
 * Whitelist-rebuild sanitizer: every tag is either rebuilt from scratch (allowed, with only the
 * attributes we permit) or stripped while keeping its text. Unbalanced tags are auto-closed.
 */
export function sanitizeInlineHtml(input?: string | null): string {
  if (!input) return "";
  if (!/[<>]/.test(input)) return input;
  // contentEditable line breaks arrive as <div>…</div> blocks — flatten them to <br>.
  const src = input
    .replace(/<div[^>]*>/gi, "<br>")
    .replace(/<\/div>/gi, "")
    .replace(/^<br>/i, "");
  let out = "";
  const open: { tag: string; html: string }[] = [];
  const re = /<\/?([a-zA-Z0-9]+)((?:[^>"']|"[^"]*"|'[^']*')*)\/?>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    out += escapeText(src.slice(last, m.index));
    last = m.index + m[0].length;
    const tag = m[1].toLowerCase();
    if (!ALLOWED.has(tag)) continue;                      // strip the tag, keep surrounding text
    if (tag === "br") { out += "<br>"; continue; }
    if (m[0].startsWith("</")) {
      const at = open.map((o) => o.tag).lastIndexOf(tag);
      if (at >= 0) {
        // Proper nesting even for misnested input: close everything above the target,
        // close the target, then reopen the intervening tags (with their attributes).
        const reopen = open.slice(at + 1);
        for (let i = open.length - 1; i >= at; i--) out += `</${open[i].tag}>`;
        open.splice(at);
        for (const o of reopen) { out += o.html; open.push(o); }
      }
      continue;
    }
    if (tag === "a") {
      const href = /href\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(m[2]);
      const url = (href?.[1] ?? href?.[2] ?? "").trim();
      if (!url || /^\s*(javascript|data|vbscript):/i.test(url)) continue; // unsafe link → strip tag
      const blank = /target\s*=\s*["']_blank["']/i.test(m[2]);
      const html = `<a href="${url.replace(/"/g, "&quot;")}"${blank ? ' target="_blank" rel="noopener noreferrer"' : ""}>`;
      out += html;
      open.push({ tag: "a", html });
      continue;
    }
    out += `<${tag}>`;
    open.push({ tag, html: `<${tag}>` });
  }
  out += escapeText(src.slice(last));
  for (let i = open.length - 1; i >= 0; i--) out += `</${open[i].tag}>`;
  // Drop empty formatting pairs left by misnesting repair or stray toggles.
  let prev = "";
  while (prev !== out) { prev = out; out = out.replace(/<(b|strong|i|em|u)><\/\1>/gi, ""); }
  return out;
}

/** Plain-text view of a (possibly marked-up) text field — for tree labels, SEO, dedupe keys. */
export function stripInlineMarkup(s?: string | null): string {
  if (!s) return "";
  return s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}
