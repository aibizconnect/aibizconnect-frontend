// Step 0 — intake URL validation + Supervisor gate (PURE, no network/DB/AI).
//
// These functions encode the Supervisor's Step-0 checks (S0_V1..S0_V5) so they can be unit-
// tested and run BEFORE any paid AI call. The server action does the actual fetch and feeds
// the HTML here. Keeping this pure makes the gate deterministic and verifiable.

export type Severity = "block" | "warn";
export interface Check { id: string; assertion: string; severity: Severity; pass: boolean; detail?: string }
export type InputType = "website" | "instagram" | "facebook" | "linkedin" | "tiktok" | "google_business";

/** Add a protocol if missing; return a normalized absolute URL or null. */
export function normalizeUrl(raw: string): string | null {
  const t = (raw || "").trim();
  if (!t) return null;
  const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try { return new URL(withProto).toString(); } catch { return null; }
}

/** Classify the link by host so the analyzer knows website vs social. */
export function detectInputType(url: string): InputType {
  let host = "";
  try { host = new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return "website"; }
  if (host.includes("instagram.")) return "instagram";
  if (host.includes("facebook.") || host.includes("fb.com")) return "facebook";
  if (host.includes("linkedin.")) return "linkedin";
  if (host.includes("tiktok.")) return "tiktok";
  if (host.includes("google.") && host.includes("business")) return "google_business";
  if (host.includes("g.page") || host.includes("maps.")) return "google_business";
  return "website";
}

/** Format-only validation (no network). */
export function validateIntakeUrl(raw: string): { ok: boolean; url?: string; inputType?: InputType; error?: string } {
  const url = normalizeUrl(raw);
  if (!url) return { ok: false, error: "Enter a valid website or social link." };
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return { ok: false, error: "Only http(s) links are supported." };
    if (!u.hostname.includes(".")) return { ok: false, error: "That doesn't look like a real domain." };
  } catch { return { ok: false, error: "Enter a valid URL." }; }
  return { ok: true, url, inputType: detectInputType(url) };
}

const SAFETY_BLOCKLIST = [
  "porn", "xxx", "escort", "casino-bonus", "phishing", "malware",
];
const LOGIN_HINTS = ["sign in", "log in", "login", "password", "create account"];

function tag(html: string, re: RegExp): string | null {
  const m = html.match(re);
  return m ? (m[1] ?? m[0]) : null;
}

/**
 * Run the Step-0 Supervisor checks against the fetched page.
 * `fetched` = { ok (2xx/3xx resolved), status, finalUrl, html }.
 */
export function runStep0Checks(fetched: { ok: boolean; status: number; html: string }): { checks: Check[]; blocked: boolean } {
  const html = fetched.html || "";
  const lower = html.toLowerCase();
  const title = (tag(html, /<title[^>]*>([\s\S]*?)<\/title>/i) || "").trim();
  const hasMetaDesc = /<meta[^>]+name=["']description["'][^>]+content=["'][^"']+["']/i.test(html);
  const headingCount = (html.match(/<h[12][\s>]/gi) || []).length;
  const paragraphCount = (html.match(/<p[\s>]/gi) || []).length;
  const textLen = lower.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length;

  // S0_V2: looks like a login/empty page if very little content AND login hints dominate.
  const loginHeavy = LOGIN_HINTS.some((h) => title.toLowerCase().includes(h)) && textLen < 400;
  const empty = textLen < 200 && headingCount === 0 && paragraphCount === 0;

  const unsafe = SAFETY_BLOCKLIST.some((w) => lower.includes(w));

  const checks: Check[] = [
    { id: "S0_V1", assertion: "URL resolves (2xx/3xx)", severity: "block", pass: !!fetched.ok, detail: `status ${fetched.status}` },
    { id: "S0_V2", assertion: "Not a login/empty page", severity: "block", pass: !loginHeavy && !empty },
    { id: "S0_V3", assertion: "Has <title> + meta description", severity: "block", pass: !!title && hasMetaDesc, detail: title ? `title: "${title.slice(0, 60)}"` : "no title" },
    { id: "S0_V4", assertion: "Has >=1 H1/H2 and >=1 paragraph", severity: "block", pass: headingCount >= 1 && paragraphCount >= 1, detail: `${headingCount} headings, ${paragraphCount} paragraphs` },
    { id: "S0_V5", assertion: "Content is safe", severity: "block", pass: !unsafe },
  ];
  const blocked = checks.some((c) => c.severity === "block" && !c.pass);
  return { checks, blocked };
}
