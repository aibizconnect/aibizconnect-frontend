import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { htmlToSections } from "../lib/sites/html-importer";
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
(async () => {
  const html = readFileSync(".stitch-out/ottawa-rendered.html", "utf8");
  const fresh = (htmlToSections as any)(html, "https://stitch.googleapis.com", { faithful: true });
  const { data } = await supa.from("website_pages").select("draft_sections").eq("id", "6e33e369-490d-46a6-845e-56d47c1be1de").single();
  const live = (data?.draft_sections as any[]) ?? [];
  for (let i = 0; i < 9; i++) {
    const f = fresh[i]?._style ?? {}, l = live[i]?._style ?? {};
    console.log(i, live[i]?._name || live[i]?.type, "| live pt/pb:", l.pt, l.pb, "| fresh pt/pb:", f.pt, f.pb, "| types:", live[i]?.type, fresh[i]?.type);
  }
})();
