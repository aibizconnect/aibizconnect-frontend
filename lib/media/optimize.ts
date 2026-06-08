import sharp from "sharp";

/**
 * Server-only image optimizer for uploads: downscale oversized images and re-encode to WebP so
 * stored files (and thus egress + load time) are much smaller. Vector (SVG) and animated (GIF)
 * images and non-images pass through untouched. Best-effort — any failure returns the original.
 */

const MAX_DIM = 1920;
const SKIP = /(svg|gif)/i;

export async function optimizeImage(input: Buffer, mime: string, filename: string): Promise<{ buf: Buffer; mime: string; ext: string }> {
  const ext0 = (filename.split(".").pop() || "bin").toLowerCase();
  const passthrough = { buf: input, mime, ext: ext0 };
  if (!mime.startsWith("image/") || SKIP.test(mime) || SKIP.test(ext0)) return passthrough;
  try {
    const img = sharp(input, { failOn: "none" }).rotate(); // honour EXIF orientation
    const meta = await img.metadata();
    let pipeline = img;
    if ((meta.width || 0) > MAX_DIM || (meta.height || 0) > MAX_DIM) {
      pipeline = pipeline.resize({ width: MAX_DIM, height: MAX_DIM, fit: "inside", withoutEnlargement: true });
    }
    const out = await pipeline.webp({ quality: 82 }).toBuffer();
    // Only adopt WebP if it actually saved bytes (tiny/already-optimized images may not).
    if (out.length < input.length) return { buf: out, mime: "image/webp", ext: "webp" };
    return passthrough;
  } catch { return passthrough; }
}
