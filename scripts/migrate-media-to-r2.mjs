/**
 * One-time migration: copy every media object from the Supabase `website-media` bucket to
 * Cloudflare R2, and repoint each website_media row's `url` to the R2 public URL. Idempotent —
 * rows already on R2 are skipped, so it's safe to re-run.
 *
 * Prereqs: set these in .env.local first (same vars lib/media/storage.ts reads):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE
 *   (+ existing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 *
 * Run:  node scripts/migrate-media-to-r2.mjs            (dry run — counts only)
 *       node scripts/migrate-media-to-r2.mjs --apply    (actually copy + update URLs)
 */
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { AwsClient } from "aws4fetch";

const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const need = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_BASE"];
const missing = need.filter((k) => !env[k]);
if (missing.length) { console.error("Missing env in .env.local:", missing.join(", ")); process.exit(1); }

const APPLY = process.argv.includes("--apply");
const BUCKET = "website-media";
const PUBLIC_BASE = env.R2_PUBLIC_BASE.replace(/\/+$/, "");
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const r2 = new AwsClient({ accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY, region: "auto", service: "s3" });
const r2Url = (p) => `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET}/${p.split("/").map(encodeURIComponent).join("/")}`;
const CT = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", svg: "image/svg+xml", avif: "image/avif", mp4: "video/mp4", pdf: "application/pdf" };
const ct = (p) => CT[(p.split(".").pop() || "").toLowerCase()] || "application/octet-stream";

let from = 0, copied = 0, skipped = 0, failed = 0, total = 0;
const PAGE = 500;
for (;;) {
  const { data, error } = await sb.from("website_media").select("id, url, storage_path, mime_type").not("storage_path", "is", null).range(from, from + PAGE - 1);
  if (error) { console.error("DB read error:", error.message); break; }
  if (!data?.length) break;
  for (const row of data) {
    total++;
    if (!row.storage_path) { skipped++; continue; }
    if ((row.url || "").startsWith(PUBLIC_BASE)) { skipped++; continue; } // already on R2
    if (!APPLY) { copied++; continue; }
    try {
      const dl = await sb.storage.from(BUCKET).download(row.storage_path);
      if (!dl.data) { failed++; continue; }
      const buf = Buffer.from(await dl.data.arrayBuffer());
      const put = await r2.fetch(r2Url(row.storage_path), { method: "PUT", body: buf, headers: { "content-type": row.mime_type || ct(row.storage_path), "cache-control": "public, max-age=31536000, immutable" } });
      if (!put.ok) { console.error("R2 PUT failed", row.storage_path, put.status); failed++; continue; }
      const newUrl = `${PUBLIC_BASE}/${row.storage_path}`;
      const { error: upErr } = await sb.from("website_media").update({ url: newUrl }).eq("id", row.id);
      if (upErr) { failed++; continue; }
      copied++;
      if (copied % 50 === 0) console.log(`… ${copied} copied`);
    } catch (e) { console.error("error", row.storage_path, e?.message || e); failed++; }
  }
  from += PAGE;
}
console.log(`\n${APPLY ? "MIGRATED" : "DRY RUN"}: ${total} rows | ${APPLY ? "copied" : "would copy"}: ${copied} | already-R2/skipped: ${skipped} | failed: ${failed}`);
if (!APPLY) console.log("Re-run with --apply to perform the migration.");
