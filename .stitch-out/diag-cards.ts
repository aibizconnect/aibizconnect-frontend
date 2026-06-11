// Dump the "Comprehensive Mortgage Solutions" band + its Cards row from the live draft,
// to see what the preview actually renders (contentWidth / widths / colStyles / nesting).
import { createClient } from "@supabase/supabase-js";

const PAGE = "6e33e369-490d-46a6-845e-56d47c1be1de";
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const walk = (n: any, depth: number, out: string[]) => {
  if (Array.isArray(n)) { n.forEach((c) => walk(c, depth, out)); return; }
  if (!n || typeof n !== "object") return;
  if (n.type) {
    const bits: string[] = [n.type];
    if (n._name) bits.push(`name=${n._name}`);
    if (n.columns) bits.push(`cols=${n.columns}`);
    if (n.contentWidth) bits.push(`cw=${n.contentWidth}`);
    if (Array.isArray(n.widths)) bits.push(`widths=${JSON.stringify(n.widths)}`);
    if (Array.isArray(n.colStyles)) bits.push(`colStyles=${JSON.stringify(n.colStyles.map((s: any) => ({ w: s?.widthPx, bg: s?.bg, pl: s?.pl, pr: s?.pr })))}`);
    if (n._style) bits.push(`style=${JSON.stringify(n._style)}`);
    out.push("  ".repeat(depth) + bits.join(" | "));
  }
  if (Array.isArray(n.children)) n.children.forEach((col: any) => walk(col, depth + 1, out));
};

(async () => {
  const { data } = await supa.from("website_pages").select("draft_sections").eq("id", PAGE).single();
  const sections = (data?.draft_sections as any[]) ?? [];
  for (const [i, s] of sections.entries()) {
    const name = (s as any)._name || (s as any).type;
    if (!/comprehensive|cards/i.test(String(name)) && i !== 3 && i !== 4) continue;
    const out: string[] = [`=== section ${i}: ${name} ===`];
    walk(s, 0, out);
    console.log(out.join("\n"));
  }
})();
