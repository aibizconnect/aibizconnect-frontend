import { parse } from "node-html-parser";

/**
 * INSPECTOR (architect D-206/D-207, Copilot: "a first-class stage" in Bill's chain).
 *
 * Structural QA over a page's FINAL output: runs automatically at the end of every Bill
 * import and on demand. v1 checks the assembled draft (bands + custom CSS + native sections);
 * the visual pixel-diff gate (≤2-3%) remains the CI phase on top of this.
 */

export type InspectorIssue = {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  where?: string;
};

export type InspectorReport = {
  ok: boolean;            // no errors (warnings allowed)
  score: number;          // 100 - 15/error - 5/warning (floored at 0)
  checkedImages: number;
  issues: InspectorIssue[];
};

const IMG_CHECK_CAP = 20;

export async function inspectPage(
  sections: Record<string, unknown>[],
  customCss: string | null | undefined,
  opts?: { checkImages?: boolean },
): Promise<InspectorReport> {
  const issues: InspectorIssue[] = [];
  const bands = sections.filter((s) => s.type === "imported-html") as { html?: string; _name?: string }[];
  const carrier = sections.find((s) => s.type === "imported-css") as { css?: string } | undefined;
  const css = (customCss || "") + (carrier?.css || "");

  // 1. Design CSS present when imported bands exist.
  if (bands.length && !css.trim()) {
    issues.push({ severity: "error", code: "css-missing", message: "Imported bands exist but no design CSS (custom_css or carrier) is attached — the page will render unstyled." });
  }

  // 2. Per-band structural checks.
  let h1Count = 0;
  const imgSrcs = new Set<string>();
  let ligatureSeen = false;
  for (const band of bands) {
    const name = band._name || "band";
    let root;
    try { root = parse(band.html || "", { comment: false }); } catch {
      issues.push({ severity: "error", code: "band-parse", message: `Band "${name}" failed to parse.`, where: name });
      continue;
    }
    h1Count += root.querySelectorAll("h1").length;
    for (const img of root.querySelectorAll("img")) {
      const src = img.getAttribute("src") || "";
      if (!src) issues.push({ severity: "error", code: "img-empty-src", message: `An image in "${name}" has no src.`, where: name });
      else if (/^https?:/.test(src)) imgSrcs.add(src);
      if (!img.getAttribute("alt")) issues.push({ severity: "warning", code: "img-no-alt", message: `An image in "${name}" has no alt text (SEO/accessibility).`, where: name });
    }
    for (const a of root.querySelectorAll("a")) {
      const href = a.getAttribute("href") || "";
      if (/^\s*javascript:/i.test(href)) issues.push({ severity: "error", code: "href-script", message: `A link in "${name}" carries a javascript: URL — sanitization gap.`, where: name });
    }
    // un-stamped nodes can't be selected/edited in the Layer Tree
    const total = root.querySelectorAll("*").length;
    const stamped = root.querySelectorAll("[data-uid]").length;
    if (total > 0 && stamped / total < 0.5) {
      issues.push({ severity: "warning", code: "uid-coverage", message: `Band "${name}": only ${stamped}/${total} nodes carry data-uid — re-capture through the bridge for full editability.`, where: name });
    }
    if (/material-symbols|material-icons/.test(band.html || "")) ligatureSeen = true;
  }

  // 3. Icon font available when icon ligatures are used.
  if (ligatureSeen && !/Material\s*Symbols|material-symbols/i.test(css) && !/fonts\.googleapis[^"' )]*Material\+Symbols/i.test(css)) {
    issues.push({ severity: "error", code: "icon-font-missing", message: "Material icon ligatures found but the icon font is not imported — icons will render as words ('home','share')." });
  }

  // 4. Headings discipline.
  if (bands.length && h1Count === 0) issues.push({ severity: "warning", code: "h1-none", message: "No <h1> on the page (SEO)." });
  if (h1Count > 1) issues.push({ severity: "warning", code: "h1-multi", message: `${h1Count} <h1> elements — exactly one is best for SEO.` });

  // 5. Contact forms wired to the CRM.
  for (const s of sections) {
    if (s.type !== "contact-form") continue;
    const fields = (s as any).fields as { name?: string }[] | undefined;
    const crm = new Set(["name", "email", "phone", "message"]);
    if (fields?.length && !fields.some((f) => crm.has(f.name || ""))) {
      issues.push({ severity: "warning", code: "form-crm-names", message: "A contact form has no CRM-mapped field names (name/email/phone/message) — submissions won't create Contacts." });
    }
  }

  // 6. Broken images (HEAD, capped + best-effort).
  let checkedImages = 0;
  if (opts?.checkImages !== false) {
    const list = Array.from(imgSrcs).slice(0, IMG_CHECK_CAP);
    const results = await Promise.allSettled(list.map(async (u) => {
      const res = await fetch(u, { method: "HEAD", signal: AbortSignal.timeout(5000), redirect: "follow" });
      return { u, ok: res.ok };
    }));
    for (const r of results) {
      checkedImages++;
      if (r.status === "fulfilled" && !r.value.ok) {
        issues.push({ severity: "error", code: "img-broken", message: `Image not reachable: ${r.value.u.slice(0, 90)}…` });
      }
    }
    if (imgSrcs.size > IMG_CHECK_CAP) {
      issues.push({ severity: "info", code: "img-check-capped", message: `Checked ${IMG_CHECK_CAP} of ${imgSrcs.size} images (cap).` });
    }
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  return { ok: errors === 0, score: Math.max(0, 100 - errors * 15 - warnings * 5), checkedImages, issues };
}
