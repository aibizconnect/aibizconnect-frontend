import { createClient } from "@supabase/supabase-js";

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const pad = (s: any) => {
  if (!s) return "";
  const keys = ["pt", "pb", "pl", "pr", "mt", "mb", "paddingY", "paddingX", "marginY", "minHeight"];
  const out = keys.filter((k) => s[k] != null).map((k) => `${k}:${s[k]}`).join(" ");
  return out;
};

(async () => {
  const { data } = await supa.from("website_pages").select("draft_sections").eq("id", "6e33e369-490d-46a6-845e-56d47c1be1de").single();
  const ss = (data?.draft_sections as any[]) ?? [];
  for (const [i, s] of ss.entries()) {
    console.log(`${i} ${s._name || s.type} [${pad(s._style)}] minH=${s.minHeight ?? "-"}`);
    const walk = (n: any, d: number) => {
      if (Array.isArray(n)) return n.forEach((c) => walk(c, d));
      if (!n || typeof n !== "object") return;
      if (n.type) {
        const extra = n.type === "spacer" ? ` size=${n.size}` : "";
        const mh = n.minHeight != null ? ` minH=${n.minHeight}` : "";
        console.log(`${"  ".repeat(d)}- ${n.type}${extra} [${pad(n._style)}]${mh}`);
      }
      if (Array.isArray(n.children)) n.children.forEach((col: any) => walk(col, d + 1));
    };
    if (Array.isArray(s.children)) s.children.forEach((col: any) => walk(col, 1));
  }
})();
