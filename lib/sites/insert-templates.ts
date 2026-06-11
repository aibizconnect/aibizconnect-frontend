/**
 * HTML templates for elements DROPPED INTO an imported band (D-215, Ali's drag-drop spec).
 *
 * A dropped palette element becomes plain HTML with a fresh uid — ONE model: it is instantly
 * identified by the recognition rules, appears in the Layers tree, and edits like every other
 * imported node (projection + patches). Inline styles keep it presentable inside any design's
 * CSS (imported pages carry their own resets).
 */

let seq = 0;
export function freshInsertUid(): string {
  return `n${Date.now().toString(36)}${(++seq).toString(36)}`;
}

const PLACEHOLDER_IMG =
  "data:image/svg+xml," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360"><rect width="100%" height="100%" fill="#e2e8f0"/><text x="50%" y="50%" font-family="sans-serif" font-size="20" fill="#94a3b8" text-anchor="middle" dominant-baseline="middle">Drop an image URL or pick from Media</text></svg>',
  );

/** Template for a droppable element type ("heading@h2", "text", "image", …) or null if not v1-droppable. */
export function insertTemplate(type: string, uid: string): string | null {
  const [base, variant] = type.split("@");
  const H_SIZE: Record<string, number> = { h1: 36, h2: 30, h3: 24, h4: 20, h5: 17 };
  if (base === "heading") {
    const lvl = variant && H_SIZE[variant] ? variant : "h2";
    return `<${lvl} data-uid="${uid}" style="font-size:${H_SIZE[lvl]}px;font-weight:700;line-height:1.2;margin:0.4em 0">New ${lvl.toUpperCase()} heading</${lvl}>`;
  }
  switch (base) {
    case "text":
      return `<p data-uid="${uid}" style="font-size:16px;line-height:1.65;margin:0.5em 0">New paragraph — double-click to edit this text.</p>`;
    case "image":
      return `<img data-uid="${uid}" src="${PLACEHOLDER_IMG}" alt="" style="max-width:100%;border-radius:8px;display:block"/>`;
    case "button":
      return `<a data-uid="${uid}" href="#" style="display:inline-block;background:#2563eb;color:#ffffff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Button</a>`;
    case "divider":
      return `<hr data-uid="${uid}" style="border:none;border-top:1px solid #e2e8f0;margin:18px 0"/>`;
    case "spacer":
      return `<div data-uid="${uid}" style="height:32px"></div>`;
    default:
      return null; // not v1-droppable into imported bands (use a new section instead)
  }
}
