// ALI RULE amendment (2026-06-11): spacing cap raised 20 → 40. The earlier migration squeezed
// captured values to 20; restore them by re-translating the original capture (style-capture now
// caps at 40) and, walking fresh vs live drafts IN PARALLEL (same types only), raising any
// spacing key the old migration left at exactly 20 where the design wanted more. Ali's own
// edits (0s, 5s, deliberate 20s where the design was ≤20) are untouched.
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { htmlToSections } from "../lib/sites/html-importer";

const PAGE = "6e33e369-490d-46a6-845e-56d47c1be1de";
const KEYS = ["pt", "pb", "pl", "pr", "mt", "mb", "ml", "mr"] as const;

let raised = 0;
const mergeStyle = (live: any, fresh: any) => {
  if (!live || !fresh) return;
  for (const k of KEYS) {
    if (live[k] === 20 && typeof fresh[k] === "number" && fresh[k] > 20) { live[k] = fresh[k]; raised++; }
  }
};
const walk = (live: any, fresh: any) => {
  if (Array.isArray(live) && Array.isArray(fresh)) {
    for (let i = 0; i < Math.min(live.length, fresh.length); i++) walk(live[i], fresh[i]);
    return;
  }
  if (!live || !fresh || typeof live !== "object" || typeof fresh !== "object") return;
  if (live.type !== fresh.type) return; // structural guard — only merge identical shapes
  mergeStyle(live._style, fresh._style);
  if (Array.isArray(live.colStyles) && Array.isArray(fresh.colStyles)) {
    for (let i = 0; i < Math.min(live.colStyles.length, fresh.colStyles.length); i++) mergeStyle(live.colStyles[i], fresh.colStyles[i]);
  }
  if (Array.isArray(live.children) && Array.isArray(fresh.children)) walk(live.children, fresh.children);
};

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
(async () => {
  const html = readFileSync(".stitch-out/ottawa-rendered.html", "utf8");
  const fresh = (htmlToSections as any)(html, "https://stitch.googleapis.com", { faithful: true });
  const { data, error } = await supa.from("website_pages").select("draft_sections").eq("id", PAGE).single();
  if (error) throw error;
  const live = (data?.draft_sections as any[]) ?? [];
  console.log(`live sections: ${live.length}, fresh: ${fresh.length}`);
  walk(live, fresh);
  const { error: e2 } = await supa.from("website_pages").update({ draft_sections: live }).eq("id", PAGE);
  if (e2) throw e2;
  console.log(`raised ${raised} spacing values (old cap 20 → captured value, max 40)`);
})();
