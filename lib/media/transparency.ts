/**
 * Background → transparency for generated icons/emojis (Ali's rule: fully transparent PNG,
 * no baked checkerboard, no text). Imagen outputs opaque RGB and "paints" fake transparency
 * if asked, so instead we generate on a SOLID light background and key it out HERE.
 *
 * Method: flood-fill from the image border, clearing pixels whose colour is within
 * `tolerance` of the sampled corner background. Flooding from the edge (4-connced) means
 * interior same-colour detail (e.g. a white gap inside a glyph that's enclosed) is preserved
 * — we only remove the OUTER background region. A soft feather on the boundary reduces halos.
 */
import sharp from "sharp";

interface RemoveBgOpts { tolerance?: number; feather?: boolean; lumThreshold?: number }

/** Remove the connected border background of a PNG/JPEG buffer and return a transparent PNG. */
export async function removeBackgroundToPng(input: Buffer, opts?: RemoveBgOpts): Promise<Buffer> {
  const tolerance = opts?.tolerance ?? 40;
  const img = sharp(input).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels } = info; // channels === 4 after ensureAlpha
  if (channels !== 4) return await sharp(input).png().toBuffer();

  // Sample the background colour as the average of the four corners.
  const px = (x: number, y: number) => (y * w + x) * 4;
  const corners = [px(0, 0), px(w - 1, 0), px(0, h - 1), px(w - 1, h - 1)];
  let br = 0, bg = 0, bb = 0;
  for (const c of corners) { br += data[c]; bg += data[c + 1]; bb += data[c + 2]; }
  br = Math.round(br / 4); bg = Math.round(bg / 4); bb = Math.round(bb / 4);

  const lum = (i: number) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  const bgLum = 0.299 * br + 0.587 * bg + 0.114 * bb;
  // Treat as background if close to the corner colour OR simply bright (light card/shadow).
  // The centered symbol isn't edge-connected, so flood-fill connectivity protects it even
  // when it's a light colour (e.g. a yellow emoji) — only the outer light field is cleared.
  const lumThreshold = opts?.lumThreshold ?? Math.min(bgLum - 8, 205);
  const near = (i: number) => {
    const dr = data[i] - br, dg = data[i + 1] - bg, db = data[i + 2] - bb;
    if (Math.sqrt(dr * dr + dg * dg + db * db) <= tolerance) return true;
    return lum(i) >= lumThreshold;
  };

  // Iterative flood fill from all border pixels (stack-based to avoid recursion limits).
  const visited = new Uint8Array(w * h);
  const stack: number[] = [];
  const pushIf = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const idx = y * w + x;
    if (visited[idx]) return;
    if (!near(idx * 4)) return;
    visited[idx] = 1; stack.push(idx);
  };
  for (let x = 0; x < w; x++) { pushIf(x, 0); pushIf(x, h - 1); }
  for (let y = 0; y < h; y++) { pushIf(0, y); pushIf(w - 1, y); }
  while (stack.length) {
    const idx = stack.pop()!;
    const x = idx % w, y = (idx / w) | 0;
    data[idx * 4 + 3] = 0; // clear alpha
    pushIf(x + 1, y); pushIf(x - 1, y); pushIf(x, y + 1); pushIf(x, y - 1);
  }

  // Optional feather: pixels adjacent to a cleared pixel get reduced alpha to soften halos.
  if (opts?.feather !== false) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (!visited[idx] && data[idx * 4 + 3] === 255) {
          const neighbourCleared =
            (x > 0 && visited[idx - 1]) || (x < w - 1 && visited[idx + 1]) ||
            (y > 0 && visited[idx - w]) || (y < h - 1 && visited[idx + w]);
          if (neighbourCleared && near(idx * 4)) data[idx * 4 + 3] = 96;
        }
      }
    }
  }

  return await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}
