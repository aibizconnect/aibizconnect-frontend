// Cycle 2 — rollback / cleanup. Deletes ALL builder rows for one tenant.
// Safety net for builds made under an unverified tenant id. Reversible undo.
//
// Usage:
//   node scripts/cycle2-rollback.mjs <TENANT_UUID> --yes
//
// Requires --yes to actually delete (otherwise it only reports counts).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
function loadEnv(file) {
  const out = {};
  try {
    for (const line of readFileSync(join(root, file), "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
  return out;
}
const env = { ...loadEnv(".env"), ...loadEnv(".env.local") };

const ARGS = process.argv.slice(2);
const CONFIRM = ARGS.includes("--yes");
const TENANT_ID = ARGS.find((a) => !a.startsWith("--"));
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!TENANT_ID || !UUID_RE.test(TENANT_ID) || TENANT_ID.includes("<")) {
  console.error(`REFUSING: "${TENANT_ID}" is not a real UUID.`);
  process.exit(1);
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Delete order respects FKs (children before parents).
const tables = [
  "website_page_block_refs",
  "website_page_sections",
  "website_navigation",
  "website_global_blocks",
  "website_pages",
  "website_brand_settings",
];

async function main() {
  for (const t of tables) {
    const { count } = await sb
      .from(t)
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", TENANT_ID);
    if (!CONFIRM) {
      console.log(`${t}: ${count ?? 0} row(s) for tenant (dry — pass --yes to delete)`);
      continue;
    }
    const { error } = await sb.from(t).delete().eq("tenant_id", TENANT_ID);
    console.log(`${t}: deleted ${count ?? 0} row(s)${error ? " ERROR: " + error.message : ""}`);
  }
  console.log(CONFIRM ? "\nROLLBACK COMPLETE for " + TENANT_ID : "\n(report only — nothing deleted)");
}
main().catch((e) => {
  console.error("ROLLBACK FAILED:", e.message);
  process.exit(1);
});
