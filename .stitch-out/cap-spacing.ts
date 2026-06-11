// ALI RULE (2026-06-11): spacing/padding never exceed 20. Cap all existing draft style values
// in place (pt/pb/pl/pr/mt/mb/ml/mr + legacy paddingY/paddingX/marginY) on the Ottawa page.
import { createClient } from "@supabase/supabase-js";

const PAGE = "6e33e369-490d-46a6-845e-56d47c1be1de";
const MAX = 20;
const KEYS = ["pt", "pb", "pl", "pr", "mt", "mb", "ml", "mr", "paddingY", "paddingX", "marginY"];

let capped = 0;
const capStyle = (s: any) => {
  if (!s || typeof s !== "object") return;
  for (const k of KEYS) {
    if (typeof s[k] === "number" && s[k] > MAX) { s[k] = MAX; capped++; }
  }
};
const walk = (n: any) => {
  if (Array.isArray(n)) return n.forEach(walk);
  if (!n || typeof n !== "object") return;
  capStyle(n._style);
  if (Array.isArray(n.colStyles)) n.colStyles.forEach(capStyle);
  if (Array.isArray(n.children)) n.children.forEach(walk);
};

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
(async () => {
  const { data, error } = await supa.from("website_pages").select("draft_sections").eq("id", PAGE).single();
  if (error) throw error;
  const sections = (data?.draft_sections as any[]) ?? [];
  walk(sections);
  const { error: e2 } = await supa.from("website_pages").update({ draft_sections: sections }).eq("id", PAGE);
  if (e2) throw e2;
  console.log(`capped ${capped} spacing values to ${MAX} on page ${PAGE}`);
})();
