// Compare fresh-translation band spacing (cap 40) vs live draft spacing, per section.
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { htmlToSections } from "../lib/sites/html-importer";

const PAGE = "6e33e369-490d-46a6-845e-56d47c1be1de";
const KEYS = ["pt", "pb", "pl", "pr", "mt", "mb"] as const;
const sp = (s: any) => (s ? KEYS.filter((k) => s[k] != null).map((k) => `${k}:${s[k]}`).join(" ") : "");

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
(async () => {
  const html = readFileSync(".stitch-out/ottawa-rendered.html", "utf8");
  const fresh = (htmlToSections as any)(html, "https://stitch.googleapis.com", { faithful: true });
  const { data } = await supa.from("website_pages").select("draft_sections").eq("id", PAGE).single();
  const live = (data?.draft_sections as any[]) ?? [];
  for (let i = 0; i < Math.max(live.length, fresh.length); i++) {
    console.log(`${i} live[${live[i]?._name ?? live[i]?.type}] {${sp(live[i]?._style)}}  fresh[${fresh[i]?._name ?? fresh[i]?.type}] {${sp(fresh[i]?._style)}}`);
  }
})();
