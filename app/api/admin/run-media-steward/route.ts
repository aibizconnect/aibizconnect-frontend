import { NextResponse } from "next/server";
import { runMediaStewardNightly } from "@/jobs/mediaSteward";
import { generateAiImages, hasKey, imageGenEnabled, probeModel } from "@/lib/ai/generateAiImages";

/**
 * Manual trigger for the media_steward job (Copilot Media plan — Step 5).
 * Admin-gated: requires the ADMIN_JOB_SECRET via `x-admin-secret` header or `?secret=`.
 * GET/POST both run it and return the summary log.
 *
 * Generation still self-gates (no AI key / not enabled → maintenance only, no spend).
 */
async function run(req: Request) {
  const secret = process.env.ADMIN_JOB_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "ADMIN_JOB_SECRET not configured." }, { status: 503 });
  }
  const url = new URL(req.url);
  // Accept the admin secret (manual trigger) OR Vercel Cron's Bearer token (nightly).
  const provided = req.headers.get("x-admin-secret") || url.searchParams.get("secret") || "";
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const cronSecret = process.env.CRON_SECRET || "";
  const ok = provided === secret || (!!cronSecret && bearer === cronSecret);
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  // ?models=1 — diagnostic: list the image-capable models this key can actually use,
  // so we pick the correct model name/method. No generation, no spend, no key exposure.
  if (url.searchParams.get("models") === "1") {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "";
    if (!apiKey) return NextResponse.json({ error: "No GEMINI_API_KEY visible to the process." }, { status: 503 });
    try {
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
        headers: { "x-goog-api-key": apiKey },
      });
      const json: any = await res.json();
      const models = (json?.models ?? []).map((m: any) => ({
        name: m.name, methods: m.supportedGenerationMethods,
      }));
      // Surface the ones that look image-capable (predict, or image generateContent).
      const imageLike = models.filter((m: any) =>
        /imagen|image/i.test(m.name) || (m.methods ?? []).some((x: string) => /predict|image/i.test(x)));
      return NextResponse.json({ imageLike, allCount: models.length, all: models.map((m: any) => m.name) });
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? "ListModels failed." }, { status: 500 });
    }
  }

  // ?probe=<model> — isolate ONE model (one call, no fallback) and report Google's
  // raw verdict. Defaults to the free native model. Costs at most one image.
  const probe = url.searchParams.get("probe");
  if (probe !== null) {
    const model = probe || "gemini-2.5-flash-image";
    const r = await probeModel(model);
    return NextResponse.json(r);
  }

  // ?importBackgrounds=1&dir=<abs path> — import local image files (Canva exports) into the
  // SYSTEM library under /System/Backgrounds/... (admin-secret gated, like the rest). No spend.
  if (url.searchParams.get("importBackgrounds") === "1") {
    const dir = url.searchParams.get("dir") || "C:/Users/User/OneDrive/AIBizConnect/Backgrounds";
    const { importLocalBackgrounds } = await import("@/lib/media/importLocal");
    const r = await importLocalBackgrounds(dir);
    return NextResponse.json(r);
  }

  // ?categorizeTest=1&dir=<abs path>&n=3 — run the AI vision categorizer on a few local
  // images and return its suggestions (NO upload). Tests auto-categorization cheaply.
  if (url.searchParams.get("categorizeTest") === "1") {
    const dir = url.searchParams.get("dir") || "C:/Users/User/OneDrive/AIBizConnect/Backgrounds";
    const n = Math.max(1, Math.min(8, parseInt(url.searchParams.get("n") || "3", 10) || 3));
    const { promises: fs } = await import("fs");
    const pathmod = await import("path");
    const { aiCategorizeImage } = await import("@/lib/ai/generateAiImages");
    const files = (await fs.readdir(dir)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).slice(0, n);
    const out = [];
    for (const f of files) {
      const buf = await fs.readFile(pathmod.join(dir, f));
      const ext = (f.split(".").pop() || "jpg").toLowerCase();
      const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
      const suggestion = await aiCategorizeImage(buf, mime);
      out.push({ file: f.slice(0, 60), suggestion });
    }
    return NextResponse.json({ tested: out.length, results: out });
  }

  // ?wireFolders=1 — ensure the System folder tree exists and file already-generated
  // SYSTEM media into their preset folders (one-time backfill). No spend.
  if (url.searchParams.get("wireFolders") === "1") {
    const { wireSystemFolders } = await import("@/lib/media/systemFolders");
    const r = await wireSystemFolders();
    return NextResponse.json(r);
  }

  // ?recent=N — list the most recent SYSTEM-tenant media (filename + public URL) so
  // generated assets can be eyeballed quickly. Read-only, no spend.
  const recentRaw = url.searchParams.get("recent");
  if (recentRaw !== null) {
    const n = Math.max(1, Math.min(300, parseInt(recentRaw, 10) || 50));
    const { createSupabaseServiceClient } = await import("@/lib/supabase/service");
    const { SYSTEM_TENANT_ID } = await import("@/lib/media/system");
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("website_media")
      .select("id, filename, url, created_at")
      .eq("tenant_id", SYSTEM_TENANT_ID)
      .order("created_at", { ascending: false })
      .limit(n);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ count: data?.length ?? 0, items: data ?? [] });
  }

  // ?check=1 — safe load-check: reports the gate status only. NO generation, NO spend,
  // never returns the key value.
  if (url.searchParams.get("check") === "1") {
    return NextResponse.json({
      hasKey: hasKey("ai-image"),
      imageGenEnabled: imageGenEnabled(),
      resolvedModel: process.env.AI_IMAGE_MODEL || "imagen-4.0-generate-001 (code default)",
      note: imageGenEnabled()
        ? "Ready — key loaded and AI_IMAGE_GEN_ENABLED=true. Generation WILL spend."
        : hasKey("ai-image")
          ? "Key loaded, but AI_IMAGE_GEN_ENABLED is not 'true' — generation is held off."
          : "No AI image key visible to the Next.js process.",
    });
  }

  try {
    // ?presetId=… — generate just ONE preset (cheap first test) instead of the full pass.
    const presetId = url.searchParams.get("presetId");
    if (presetId) {
      // ?count=N — cap how many images this run generates (cheapest test = 1).
      const countRaw = url.searchParams.get("count");
      const batchSizeOverride = countRaw ? Math.max(1, Math.min(50, parseInt(countRaw, 10) || 1)) : undefined;
      const aspectOverride = url.searchParams.get("aspect") || undefined; // e.g. 9:16 (vertical)
      const r = await generateAiImages({ presetId, batchSizeOverride, aspectOverride });
      return NextResponse.json({ singlePreset: presetId, ...r });
    }
    const result = await runMediaStewardNightly();
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Job failed." }, { status: 500 });
  }
}

export async function GET(req: Request) { return run(req); }
export async function POST(req: Request) { return run(req); }
