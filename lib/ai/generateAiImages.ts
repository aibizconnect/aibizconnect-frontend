/**
 * AI image generation (Copilot Media plan — Step 2). Generates a batch of images for a
 * preset using Gemini (Imagen via the Google AI image endpoint), then imports them into
 * Media Storage under /uploads/ai/<timestamp>/.
 *
 * HARD BOUNDARY (Ali's rule — no automatic spend): generation runs ONLY when BOTH
 *   (a) an AI image key is configured (GEMINI_API_KEY / GOOGLE_AI_API_KEY), AND
 *   (b) AI_IMAGE_GEN_ENABLED === "true".
 * Otherwise it no-ops and returns { mediaIds: [] } — never calling the provider, never
 * charging. The live Imagen call IS implemented below (gated); enabling the flag activates it.
 */
import { getPresetById, type AiGenPreset } from "@/config/aiPresets";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { SYSTEM_TENANT_ID } from "@/lib/media/system";
import { putObject } from "@/lib/media/storage";

/** Aspect ratio per category (Imagen supports 1:1, 3:4, 4:3, 9:16, 16:9). */
function aspectFor(category: AiGenPreset["category"]): string {
  return category === "icons" || category === "emojis" ? "1:1" : "16:9";
}

export type AiKeyKind = "ai-image";

/** True when an AI image key is configured. */
export function hasKey(kind: AiKeyKind): boolean {
  if (kind === "ai-image") return !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY);
  return false;
}

/** Live generation is allowed only with a key AND the explicit enable flag (no auto-spend). */
export function imageGenEnabled(): boolean {
  return hasKey("ai-image") && process.env.AI_IMAGE_GEN_ENABLED === "true";
}

export interface GenerateAiImagesParams {
  presetId: string;
  model?: string;          // default our standard Gemini image model
  batchSizeOverride?: number;
  aspectOverride?: string; // force an aspect ratio (e.g. "9:16" vertical) for non-icon/emoji
}
export interface GenerateAiImagesResult {
  mediaIds: string[];
  generated: number;
  skipped?: string;        // reason when nothing was generated (gated)
  usedModel?: string;      // which model actually produced the images
}

// ── Single-subject concept lists ──────────────────────────────────────────────
// CRITICAL (Ali's rule): every generated image must contain exactly ONE subject —
// one icon, one emoji, one photo — NEVER a set/grid/contact-sheet of many. Each
// concept below becomes its own standalone, individually-usable image.

const ICON_CONCEPTS = [
  "share", "thumbs up / like", "chat bubble", "camera", "video play button", "notification bell",
  "globe", "at-sign mention", "hashtag", "link / chain", "paper-plane send", "location pin",
  "heart", "star", "magnifying-glass search", "settings gear", "user profile", "bookmark",
  "download", "calendar",
];

const EMOJI_CONCEPTS = [
  "red heart", "thumbs up", "star", "green check mark", "smiling face", "winking face",
  "laughing face with tears", "astonished wow face", "fire flame", "sparkles", "round location pin",
  "bell", "party popper", "crying face", "thinking face", "clapping hands", "raised hands",
  "rocket", "light bulb", "target bullseye",
];

// Distinct single-scene subjects per photo/graphic/background preset (keyed by style).
const SCENE_CONCEPTS: Record<string, string[]> = {
  // photos
  landscapes: ["a modern city skyline at golden hour", "a coastal beach with calm water", "green rolling hills under blue sky", "a mountain range at sunrise", "a quiet forest path", "a desert dune landscape", "a river through a valley", "a city street at dusk", "an aerial view of farmland", "a lake reflecting mountains"],
  people: ["a smiling professional woman at a desk", "a diverse business team in a meeting", "two colleagues shaking hands", "a man presenting at a whiteboard", "a woman on a video call", "a small team celebrating success", "a person working on a laptop in a cafe", "a manager mentoring an employee", "a confident businessman portrait", "coworkers brainstorming with sticky notes"],
  offices: ["a bright modern open-plan office", "a minimalist desk with a laptop", "a glass-walled conference room", "a cozy startup workspace", "an empty boardroom with a long table", "a co-working lounge area", "a home office setup by a window", "a reception area with a logo wall (no text)", "rows of desks with monitors", "a standing-desk workstation"],
  restaurant: ["a beautifully plated gourmet dish on a restaurant table", "a cozy restaurant interior with warm ambient lighting", "a chef plating food in a professional kitchen", "a wood-fired pizza fresh from the oven", "a barista pouring latte art into a cup", "a fresh colorful salad bowl overhead shot", "a gourmet burger with fries on a rustic wooden board", "a cafe counter display of fresh pastries", "an elegant fine-dining table setting", "fresh vegetables and ingredients on a cutting board"],
  // graphics (abstract, single composition)
  it_security: ["a glowing blue shield with a white padlock", "a metal padlock sitting on a computer circuit board", "a glowing fingerprint scan on a dark screen", "a white cloud icon with a padlock", "a brass key lying on a microchip", "a server rack with a glowing lock icon", "a smartphone showing a lock-screen shield", "a laptop with a holographic security shield", "a steel vault door with glowing digital code", "a wifi router with a shield badge"],
  law: ["a wooden judge's gavel on a round sound block", "a golden balanced scale of justice on a desk", "the tall stone columns of a courthouse facade", "an open leather-bound law book", "a signed paper contract with a fountain pen", "a marble statue of Lady Justice", "a brown leather legal briefcase", "two business people shaking hands across a desk", "a stack of legal documents tied with a red ribbon", "a lawyer's desk with gavel and books"],
  real_estate: ["a modern two-story house exterior at dusk", "a set of house keys resting on a property contract", "a row of glass city condo towers", "a hand holding a small wooden house model", "a red SOLD sign on a green front lawn", "an architectural floor-plan blueprint on a table", "a bright modern living room interior", "a suburban street lined with houses", "a real-estate agent handing over house keys", "a clean welcome mat at a front door"],
  finance: ["a rising green bar chart with an upward arrow", "a heavy steel bank vault door", "stacks of gold coins increasing in height", "a hand dropping a coin into a piggy bank", "a credit card resting on a financial chart", "a calculator beside a printed growth graph", "a glowing digital wallet with floating coins", "an upward stock-ticker line on a screen", "an open safe full of cash", "a businessman reviewing financial charts on a tablet"],
  // backgrounds (single seamless field)
  abstract: ["a soft abstract geometric pattern", "subtle flowing waves", "a minimal mesh gradient field", "soft bokeh light blur", "low-poly abstract terrain", "gentle abstract line art", "a calm fluid marble texture", "soft layered paper shapes", "abstract dotted halftone field", "a smooth glassmorphism blur"],
  gradients: ["a smooth blue-to-purple gradient", "a warm sunset orange-pink gradient", "a teal-to-green gradient", "a deep navy-to-indigo gradient", "a soft pastel multi-stop gradient", "a vibrant magenta-to-violet gradient", "a calm sky-blue gradient", "a peach-to-coral gradient", "a cool cyan-to-blue gradient", "a dark charcoal-to-slate gradient"],
};

/**
 * Build the list of SINGLE-SUBJECT prompts for a preset — one prompt per image. The
 * caller generates each at count=1 so every file holds exactly one subject.
 */
function itemPromptsForPreset(p: AiGenPreset, count: number): { prompt: string; subject: string }[] {
  const style = p.style.replace(/_/g, " ");
  const take = <T,>(arr: T[]) => arr.slice(0, Math.max(1, count));

  // Shared hard constraints — NO text of any kind, single subject (Ali's rules).
  const noText = "Absolutely no text, no letters, no words, no numbers, no labels, no captions, no watermark, no signature, no brand logos.";
  // Icons/emojis are generated on a PLAIN SOLID WHITE background (NOT "transparent" — that
  // makes the model paint a fake checkerboard). The white is keyed out to real alpha after.
  const whiteBg = "The symbol floats DIRECTLY on a plain, solid, pure white #FFFFFF background with NOTHING else behind it — no card, no rounded rectangle, no sticker, no tile, no panel, no badge, no container shape, no frame, no border, no drop shadow, no reflection, no gradient, no vignette. Edge-to-edge flat white only.";

  if (p.category === "icons") {
    return take(ICON_CONCEPTS).map((c) => ({
      subject: c,
      prompt: `A SINGLE ${c} symbol as a ${style} app/UI icon. EXACTLY ONE icon — not a set, not a grid, not a sheet, no multiple icons. One clean centered symbol with even padding. ${whiteBg} Flat vector look, crisp edges. ${noText} Square 1:1.`,
    }));
  }
  if (p.category === "emojis") {
    return take(EMOJI_CONCEPTS).map((c) => ({
      subject: c,
      prompt: `A SINGLE ${c} emoji in a ${style} style. EXACTLY ONE emoji — not a set, not a grid, not a sheet, no multiple emojis. One expressive symbol centered with even padding. ${whiteBg} ${noText} Square 1:1.`,
    }));
  }
  // Industry business backgrounds — Canva style: clean, subtle, soft tones, lots of empty
  // space for text overlay. Generate `count` distinct subtle variations of the same theme.
  if (p.category === "biz_bg") {
    const industry = p.label;
    const n = Math.max(1, count);
    return Array.from({ length: n }, (_, i) => ({
      subject: `${industry} ${i + 1}`,
      prompt: `A professional ${industry} business website background. Clean modern corporate aesthetic, subtle thematic ${industry} elements kept faint and minimal, elegant and sophisticated, soft white with light blue and gentle pastel tones, smooth and uncluttered with LOTS of clean empty negative space for text overlay. ONE seamless full-bleed design, no collage, no grid, no people's faces, no busy scene. ${noText} Variation ${i + 1} with a distinct composition.`,
    }));
  }
  // photos / graphics / backgrounds — one scene per image.
  const scenes = SCENE_CONCEPTS[p.style] ?? [p.label];
  const list = take(scenes.length ? scenes : [p.label]);
  const base = p.category === "photos"
    ? `A single photorealistic business stock photo of {S}. ONE scene only, no collage, no split frames, no grid. Clean, bright, modern lighting, no copyrighted landmarks. ${noText}`
    : p.category === "graphics"
      ? `A single clean, professional 3D-rendered concept illustration of {S}. The named object is the clear, recognizable, centered subject — realistic studio lighting, simple solid or soft-gradient background, modern business style. ONE subject only, no collage, no grid, NOT an abstract sculpture, no random shapes. ${noText}`
      : `A single website-section background: {S}. ONE seamless full-bleed field, no collage, no grid, no objects. Smooth and tasteful, suitable behind content. ${noText}`;
  return list.map((s) => ({ subject: s, prompt: base.replace("{S}", s) }));
}

export async function generateAiImages(params: GenerateAiImagesParams): Promise<GenerateAiImagesResult> {
  const preset = getPresetById(params.presetId);
  if (!preset) return { mediaIds: [], generated: 0, skipped: `Unknown preset "${params.presetId}"` };

  const batchSize = params.batchSizeOverride ?? preset.batchSize;
  const model = params.model || process.env.AI_IMAGE_MODEL || "imagen-4.0-generate-001";

  // GATE: never call the provider / spend unless explicitly enabled with a key.
  if (!imageGenEnabled()) {
    return {
      mediaIds: [],
      generated: 0,
      skipped: hasKey("ai-image")
        ? "Image generation is held off (set AI_IMAGE_GEN_ENABLED=true to allow spend)."
        : "No AI image key configured (GEMINI_API_KEY).",
    };
  }

  // ONE image per concept: each item is a distinct, individually-usable single subject
  // (Ali's rule — never a set/grid in one image). Generate each at count=1.
  const items = itemPromptsForPreset(preset, batchSize);
  // Icons/emojis stay square (1:1); for photos/graphics/backgrounds honor an aspect
  // override (e.g. "9:16" vertical) when provided, else the category default.
  const squareCat = preset.category === "icons" || preset.category === "emojis";
  const aspectRatio = squareCat ? "1:1" : (params.aspectOverride || aspectFor(preset.category));
  const allIds: string[] = [];
  let usedModel: string | undefined;
  let lastSkip: string | undefined;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const out = await imagenGenerateAndImport(SYSTEM_TENANT_ID, item.prompt, {
      count: 1, aspectRatio, model, namePrefix: `${preset.label} — ${item.subject}`,
      transparent: squareCat, // icons/emojis → key white bg out to true alpha
    });
    usedModel = out.usedModel ?? usedModel;
    if (out.skipped) lastSkip = out.skipped;
    allIds.push(...out.images.map((im) => im.id));
    if (i < items.length - 1) await sleep(1200); // ease under per-minute rate limits
  }
  // File the generated rows into this preset's System folder (idempotent, best-effort).
  if (allIds.length) {
    try {
      const { assignPresetFolder } = await import("@/lib/media/systemFolders");
      await assignPresetFolder(preset, allIds);
    } catch { /* leave at root; backfill can re-file later */ }
  }
  return {
    mediaIds: allIds,
    generated: allIds.length,
    skipped: allIds.length ? undefined : lastSkip,
    usedModel,
  };
}

/**
 * Shared Imagen core: generate `count` images from `prompt` and import them into a
 * tenant's media (/uploads/ai/<ts>/), returning the new {id,url}s. Used by the preset
 * job (SYSTEM tenant) AND the AI Images tab free-form Generate (calling tenant).
 * KEYS-GATED via imageGenEnabled() — never spends without the key + enable flag.
 */
/** Raw decoded image (before import). */
interface RawImage { b64: string; mime: string }

/** True for Gemini *native* image models (gemini-*-image), which use :generateContent. */
function isNativeImageModel(model: string): boolean {
  return /^gemini.*image/i.test(model);
}

/** Google error texts that mean "wrong plan/permission" — safe to fall back from. */
function isBillingOrPermissionError(status: number, text: string): boolean {
  if (status === 403) return true;
  if (status === 400 && /paid plan|billing|upgrade|only available/i.test(text)) return true;
  return false;
}

/** Max images Imagen :predict accepts per single request. */
const IMAGEN_PER_CALL = 4;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** A single :predict request with 429 (rate-limit) backoff: waits and retries a few times. */
async function predictOnce(
  endpoint: string, apiKey: string, body: unknown, maxRetries = 4,
): Promise<{ res: Response; text?: string }> {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
    });
    if (res.status !== 429 || attempt >= maxRetries) return { res };
    // Back off: 2s, 4s, 8s, 16s — rate-limit windows are per-minute.
    await sleep(2000 * Math.pow(2, attempt));
    attempt++;
  }
}

/** Imagen path (:predict) — batches in chunks of IMAGEN_PER_CALL to reach `count`. */
async function callImagenPredict(
  apiKey: string, model: string, prompt: string, count: number, aspectRatio: string,
): Promise<{ images: RawImage[]; error?: { status: number; text: string } }> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict`;
  const target = Math.max(1, count);
  const images: RawImage[] = [];
  let lastError: { status: number; text: string } | undefined;
  while (images.length < target) {
    const want = Math.min(IMAGEN_PER_CALL, target - images.length);
    const body = { instances: [{ prompt }], parameters: { sampleCount: want, aspectRatio } };
    const { res } = await predictOnce(endpoint, apiKey, body);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      lastError = { status: res.status, text };
      break; // an error won't improve on retry within the same model
    }
    const json: any = await res.json();
    const preds: any[] = json?.predictions ?? [];
    const got = preds
      .filter((p) => p?.bytesBase64Encoded)
      .map((p) => ({ b64: p.bytesBase64Encoded as string, mime: (p.mimeType as string) || "image/png" }));
    if (!got.length) break; // no progress — avoid an infinite loop
    images.push(...got);
  }
  return { images, error: images.length ? undefined : lastError };
}

/** Gemini native image path (:generateContent) — one image per call, so loop `count`. */
async function callGeminiNative(
  apiKey: string, model: string, prompt: string, count: number,
): Promise<{ images: RawImage[]; error?: { status: number; text: string } }> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const images: RawImage[] = [];
  let lastError: { status: number; text: string } | undefined;
  const n = Math.max(1, count);
  for (let i = 0; i < n; i++) {
    // Vary the prompt slightly per index so a batch isn't N identical images
    // (no Math.random available in this runtime — index is deterministic).
    const variant = n > 1 ? `${prompt} (variation ${i + 1} of ${n}, distinct composition)` : prompt;
    const body = {
      contents: [{ parts: [{ text: variant }] }],
      generationConfig: { responseModalities: ["IMAGE"] },
    };
    const { res } = await predictOnce(endpoint, apiKey, body);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      lastError = { status: res.status, text };
      // Plan/permission errors won't improve on retry — stop early.
      if (isBillingOrPermissionError(res.status, text)) break;
      continue;
    }
    const json: any = await res.json();
    const parts: any[] = json?.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      const inline = part?.inlineData ?? part?.inline_data;
      if (inline?.data) images.push({ b64: inline.data, mime: inline.mimeType || inline.mime_type || "image/png" });
    }
  }
  return { images, error: images.length ? undefined : lastError };
}

/** Free native model used as the automatic fallback when Imagen is plan-blocked. */
const FREE_NATIVE_MODEL = "gemini-2.5-flash-image";

/**
 * Best-effort AI categorization of an uploaded image (vision). Returns a suggested
 * { category, name } or null if it can't tell / the call fails (quota, no key, parse).
 * NEVER throws — callers fall back to asking the user (optionally) per Ali's "don't force".
 * Uses a text+vision Gemini model via :generateContent (separate from the Imagen quota).
 */
export async function aiCategorizeImage(
  bytes: Buffer, mime: string,
): Promise<{ category: string; name: string } | null> {
  if (!hasKey("ai-image")) return null;
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY!;
  const model = process.env.AI_VISION_MODEL || "gemini-2.5-flash";
  const prompt = `You are tagging an image for a website media library. Look at the image and reply ONLY with compact JSON: {"category":"<a short folder path like 'Backgrounds/Real Estate', 'Photos', 'Icons', 'Graphics/Finance'>","name":"<a short human descriptive name, 2-6 words, no file extension>"}. If you are not confident, use {"category":"Uncategorized","name":""}. No prose, JSON only.`;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: mime || "image/jpeg", data: bytes.toString("base64") } }] }],
      }),
    });
    if (!res.ok) return null;
    const json: any = await res.json();
    const text: string = (json?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p?.text ?? "").join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]) as { category?: string; name?: string };
    const category = (parsed.category || "").trim();
    if (!category || /^uncategori[sz]ed$/i.test(category)) {
      return parsed.name ? { category: "Uncategorized", name: parsed.name.trim() } : null;
    }
    return { category: category.replace(/^\/+|\/+$/g, ""), name: (parsed.name || "").trim() };
  } catch {
    return null;
  }
}

/**
 * Diagnostic: try ONE model once (no fallback, no import) and report exactly what
 * Google returned. Used by the admin route's ?probe=<model> to isolate which model
 * works with the current key/billing. Never exposes the key.
 */
export async function probeModel(model: string): Promise<{ model: string; ok: boolean; status?: number; error?: string; gotImage?: boolean }> {
  if (!imageGenEnabled()) return { model, ok: false, error: "Generation not enabled / no key." };
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY!;
  try {
    const r = isNativeImageModel(model)
      ? await callGeminiNative(apiKey, model, "a simple flat minimal line icon of a bell, transparent background", 1)
      : await callImagenPredict(apiKey, model, "a simple flat minimal line icon of a bell, transparent background", 1, "1:1");
    if (r.error) return { model, ok: false, status: r.error.status, error: r.error.text.slice(0, 240) };
    return { model, ok: r.images.length > 0, gotImage: r.images.length > 0 };
  } catch (e: any) {
    return { model, ok: false, error: `request failed: ${e?.message ?? e}` };
  }
}

export async function imagenGenerateAndImport(
  tenantId: string,
  prompt: string,
  opts?: { count?: number; aspectRatio?: string; model?: string; namePrefix?: string; transparent?: boolean; folderId?: string | null },
): Promise<{ images: { id: string; url: string }[]; skipped?: string; usedModel?: string }> {
  if (!imageGenEnabled()) {
    return { images: [], skipped: hasKey("ai-image")
      ? "Image generation is held off (set AI_IMAGE_GEN_ENABLED=true)."
      : "No AI image key configured (GEMINI_API_KEY)." };
  }
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY!;
  const count = opts?.count ?? 4;
  const aspectRatio = opts?.aspectRatio || "1:1";

  // Cost policy (Ali's rule — "use the free one as much as possible"):
  //   primary  = the free native model (gemini-2.5-flash-image)
  //   fallback = the paid Imagen model (env AI_IMAGE_MODEL or Imagen 4 Fast)
  // An explicit opts.model overrides and is tried first (caller asked for it).
  const paidModel = process.env.AI_IMAGE_MODEL || "imagen-4.0-fast-generate-001";
  const primary = opts?.model || FREE_NATIVE_MODEL;
  const fallback = opts?.model && opts.model !== paidModel ? paidModel
    : opts?.model ? undefined           // caller already asked for the paid model
    : paidModel;                        // default path: free → paid

  async function runModel(model: string) {
    return isNativeImageModel(model)
      ? callGeminiNative(apiKey, model, prompt, count)
      : callImagenPredict(apiKey, model, prompt, count, aspectRatio);
  }

  let usedModel = primary;
  let result;
  let primaryError: { status: number; text: string } | undefined;
  try {
    result = await runModel(primary);
    // Auto-fallback to the paid model only if the free one couldn't produce images
    // (quota/permission/plan). Keeps spend to a minimum — free first, pay only if needed.
    if (result.error && !result.images.length && fallback && fallback !== primary) {
      primaryError = result.error;
      usedModel = fallback;
      result = await runModel(fallback);
    }
  } catch (e: any) {
    return { images: [], skipped: `Image request failed: ${e?.message ?? e}` };
  }

  if (result.error && !result.images.length) {
    const firstMsg = primaryError ? ` | ${primary} said ${primaryError.status}: ${primaryError.text.slice(0, 160)}` : "";
    return { images: [], usedModel, skipped: `Image error ${result.error.status}: ${result.error.text.slice(0, 160)}${firstMsg}` };
  }

  const supabase = createSupabaseServiceClient();
  const ts = Date.now();
  const images: { id: string; url: string }[] = [];
  for (let i = 0; i < result.images.length; i++) {
    const { b64, mime } = result.images[i];
    let bytes: Buffer = Buffer.from(b64, "base64");
    let outMime = mime;
    // Transparency pass: key the solid white background out to real alpha (icons/emojis).
    if (opts?.transparent) {
      try {
        const { removeBackgroundToPng } = await import("@/lib/media/transparency");
        bytes = await removeBackgroundToPng(bytes);
        outMime = "image/png";
      } catch { /* keep original on failure */ }
    }
    const ext = outMime.includes("jpeg") ? "jpg" : outMime.includes("webp") ? "webp" : "png";
    const path = `${tenantId}/uploads/ai/${ts}/${i}.${ext}`;
    const up = await putObject(path, bytes, outMime);
    if (!up.ok) continue;
    const { data: row } = await supabase.from("website_media").insert({
      tenant_id: tenantId, url: up.publicUrl, storage_path: path,
      filename: `${opts?.namePrefix ?? "AI image"} ${i + 1}.${ext}`, mime_type: outMime, size_bytes: bytes.length,
      ...(opts?.folderId ? { folder_id: opts.folderId } : {}),
    }).select("id").single();
    if (row?.id) images.push({ id: row.id, url: up.publicUrl ?? "" });
  }
  return { images, usedModel };
}
