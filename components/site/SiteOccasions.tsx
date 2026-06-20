"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  resolveActive, ANIM_BY_KEY, DEFAULT_EFFECT_SETTINGS,
  type OccasionsConfig, type ActiveState, type EffectSettings, type EffectLocation, type ActiveBanner,
} from "@/lib/occasions";

/**
 * 🔒 LOCKED (Ali, 2026-06-05) — do NOT change behavior without Ali's explicit say-so.
 * Plane transform `rotate(45deg) scaleY(-1)` is approved (Ali re-approved 2026-06-20: +90° CW
 * from the prior 315deg so the nose points the way it flies). Do not touch. See
 * src/docs/occasions-LOCKED.md.
 *
 * Occasions renderer (public site + editor preview). Runs ONE ambient animation using Ali's
 * scripts as the engines (emoji particle = snow script, SVG sprite = Santa script, glow =
 * sun rays) driven by ONE global settings panel, PLUS any active holiday/custom banners.
 * Pointer-events:none. Pass `preview` to force a specific animation/banner (Settings preview).
 */
const Z = 9998;

// Flying-banner plane as an SVG (NOT the 🛩️ emoji) — emoji glyphs differ per OS (Windows vs iOS vs
// Android draw a different picture at a different base angle), so no single rotation points "forward"
// everywhere. This vector is drawn nose-RIGHT (the direction of travel) consistently on every device.
// Ali-approved 2026-06-20 (replaces the emoji). The inner rotate(90) turns Bootstrap's nose-up
// airplane to nose-right. See docs/occasions-LOCKED.md.
const PLANE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 16 16" fill="#1e3a8a"><g transform="rotate(90 8 8)"><path d="M6.428 1.151C6.708.591 7.213 0 8 0s1.292.592 1.572 1.151C9.861 1.73 10 2.431 10 3v3.691l5.17 2.585a1.5 1.5 0 0 1 .83 1.342V12a.5.5 0 0 1-.582.493l-5.507-.918-.375 2.253 1.318 1.318A.5.5 0 0 1 10.5 16h-5a.5.5 0 0 1-.354-.854l1.318-1.318-.375-2.253-5.507.918A.5.5 0 0 1 0 12v-1.382a1.5 1.5 0 0 1 .83-1.342L6 6.691V3c0-.568.14-1.271.428-1.849Z"/></g></svg>`;

const SANTA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 350 150" style="width:100%;height:auto;filter:drop-shadow(0 4px 4px rgba(0,0,0,0.3));"><g><g transform="translate(220,60)"><path fill="#8B4513" d="M0,20 Q10,0 30,10 L50,30 L30,40 L10,30 Z"/><circle cx="50" cy="15" r="8" fill="#8B4513"/><path stroke="#5C3317" stroke-width="3" d="M50,15 L55,-5 M48,10 L40,0"/><circle cx="58" cy="15" r="3" fill="red"/><path fill="#8B4513" d="M-60,20 Q-50,0 -30,10 L-10,30 L-30,40 L-50,30 Z"/><circle cx="-10" cy="15" r="8" fill="#8B4513"/><path stroke="#5C3317" stroke-width="3" d="M-10,15 L-5,-5 M-12,10 L-20,0"/></g><path stroke="#FFD700" stroke-width="1" fill="none" d="M110,60 L240,70"/><g transform="translate(10,50)"><path fill="#C21807" d="M20,60 C20,60 100,60 110,40 L100,20 L30,20 C10,20 20,60 20,60 Z"/><path stroke="#A9A9A9" stroke-width="3" fill="none" d="M10,65 C10,65 50,75 120,65"/><circle cx="70" cy="20" r="15" fill="#C21807"/><circle cx="70" cy="10" r="10" fill="#FFCCBC"/><path fill="#FFF" d="M60,10 Q70,25 80,10"/><path fill="#C21807" d="M60,5 Q70,-15 80,5 Z"/><circle cx="80" cy="5" r="3" fill="#FFF"/><rect x="30" y="20" width="20" height="20" fill="#228B22"/></g></g></svg>`;

const KEYFRAMES = `
@keyframes abc-occ-fall { 0%{top:-8vh} 100%{top:108vh} }
@keyframes abc-occ-rise { 0%{top:108vh} 100%{top:-12vh} }
@keyframes abc-occ-sway { 0%{margin-left:0} 50%{margin-left:var(--sway,12px)} 100%{margin-left:0} }
@keyframes abc-occ-pulse { 0%,100%{opacity:1} 50%{opacity:.55} }
@keyframes abc-occ-glowb { 0%,100%{box-shadow:0 0 6px rgba(255,255,255,.3)} 50%{box-shadow:0 0 22px rgba(255,255,255,.85)} }
@keyframes abc-occ-sun { 0%,100%{opacity:.55;transform:translateX(-50%) scale(1)} 50%{opacity:.85;transform:translateX(-50%) scale(1.06)} }
@keyframes abc-occ-fly { from{transform:translateX(-118%)} to{transform:translateX(100vw)} }
@keyframes abc-occ-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
@keyframes abc-occ-wave { 0%,100%{transform:skewY(-1.5deg)} 50%{transform:skewY(1.5deg)} }
`;

function resolveSettings(s?: EffectSettings) {
  return {
    size: s?.size ?? DEFAULT_EFFECT_SETTINGS.size, speed: s?.speed ?? DEFAULT_EFFECT_SETTINGS.speed,
    randomness: s?.randomness ?? DEFAULT_EFFECT_SETTINGS.randomness, density: s?.density ?? DEFAULT_EFFECT_SETTINGS.density,
    location: (s?.location ?? DEFAULT_EFFECT_SETTINGS.location) as EffectLocation,
  };
}
function band(loc: EffectLocation): [number, number] {
  if (loc === "left") return [0, 35];
  if (loc === "right") return [65, 100];
  if (loc === "center" || loc === "middle") return [33, 67];
  return [0, 100];
}

/** EMOJI PARTICLE ENGINE — Ali's snow script generalized. */
function runEmojiEngine(container: HTMLElement, glyphs: string[], rise: boolean, set: ReturnType<typeof resolveSettings>): () => void {
  const [bMin, bMax] = band(set.location);
  const fallDur = 16 - set.speed;
  const interval = Math.min(2000, Math.max(50, Math.round(8000 / set.density)));
  const sway = Math.round((set.randomness / 100) * 28);
  const spawn = () => {
    const el = document.createElement("div");
    el.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
    const jitter = 1 + Math.random() * (set.randomness / 220);
    el.style.cssText = `position:fixed;${rise ? "top:108vh" : "top:-8vh"};left:${(bMin + Math.random() * (bMax - bMin)).toFixed(2)}vw;` +
      `font-size:${(set.size * jitter).toFixed(0)}px;line-height:1;pointer-events:none;user-select:none;z-index:${Z};` +
      `opacity:${(0.5 + Math.random() * 0.5).toFixed(2)};will-change:top,margin-left;` +
      `animation:${rise ? "abc-occ-rise" : "abc-occ-fall"} ${fallDur}s linear forwards, abc-occ-sway ${(fallDur / 2).toFixed(1)}s ease-in-out infinite;`;
    el.style.setProperty("--sway", (rise ? -sway : sway) + "px");
    container.appendChild(el);
    setTimeout(() => el.remove(), fallDur * 1000);
  };
  const timer = setInterval(spawn, interval);
  return () => { clearInterval(timer); container.innerHTML = ""; };
}

/** SPRITE ENGINE — Ali's Santa script generalized. */
function runSpriteEngine(container: HTMLElement, svg: string, set: ReturnType<typeof resolveSettings>): () => void {
  const sprite = document.createElement("div");
  const width = Math.round(set.size * 7);
  sprite.style.cssText = `position:fixed;top:0;left:0;width:${width}px;z-index:2147483646;pointer-events:none;display:none;`;
  sprite.innerHTML = svg;
  container.appendChild(sprite);
  const speedMs = (16 - set.speed) * 800;
  const waitMin = 1500 + (1 - set.randomness / 100) * 2000;
  const waitMax = 4000 + (set.randomness / 100) * 9000;
  const yBand = (): number => {
    const h = window.innerHeight, r = Math.random(), loc = set.location;
    if (loc === "top") return r * h * 0.3;
    if (loc === "middle" || loc === "center") return h * 0.3 + r * h * 0.3;
    if (loc === "bottom") return h * 0.6 + r * h * 0.3;
    return r * h * 0.7;
  };
  let stopped = false, anim: Animation | null = null, to: ReturnType<typeof setTimeout> | null = null;
  const fly = () => {
    if (stopped) return;
    const w = window.innerWidth, fromLeft = Math.random() > 0.5;
    const startX = fromLeft ? -width : w, endX = fromLeft ? w : -width, flip = fromLeft ? "scaleX(1)" : "scaleX(-1)";
    sprite.style.display = "block";
    anim = sprite.animate(
      [{ transform: `translate(${startX}px, ${yBand()}px) ${flip}` }, { transform: `translate(${endX}px, ${yBand()}px) ${flip}` }],
      { duration: speedMs, easing: "linear", fill: "forwards" });
    anim.onfinish = () => { sprite.style.display = "none"; if (!stopped) to = setTimeout(fly, Math.random() * (waitMax - waitMin) + waitMin); };
  };
  to = setTimeout(fly, 600);
  return () => { stopped = true; if (to) clearTimeout(to); try { anim?.cancel(); } catch { } container.innerHTML = ""; };
}

/** FIREWORKS ENGINE — Ali's FireworkSystem, canvas particle bursts (size/speed/density/randomness). */
function runFireworksEngine(container: HTMLElement, set: ReturnType<typeof resolveSettings>): () => void {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = `position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:${Z};`;
  container.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  resize();
  window.addEventListener("resize", resize);

  const radius = Math.max(1, Math.round(set.size / 12)); // size → particle radius
  const count = set.density;                              // density → particles per burst
  const speed = set.speed, randomness = set.randomness;
  const [bMin, bMax] = band(set.location);
  let particles: { x: number; y: number; vx: number; vy: number; alpha: number; color: string }[] = [];
  let raf = 0, running = true;

  const createFirework = (x: number, y: number) => {
    const hue = Math.random() * 360;                     // one burst = mostly one color family
    for (let i = 0; i < count; i++) {
      // Radial spray (goes up AND out to the sides), with an upward bias so it lifts first.
      const angle = Math.random() * Math.PI * 2;
      const power = (0.4 + Math.random()) * speed * (0.6 + randomness / 80);
      particles.push({
        x, y,
        vx: Math.cos(angle) * power,
        vy: Math.sin(angle) * power - speed * 0.9,        // lift up before gravity pulls down
        alpha: 1,
        color: `hsl(${(hue + Math.random() * 40) % 360}, 100%, 58%)`,
      });
    }
  };
  const update = () => {
    if (!running) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (Math.random() < 0.045) {
      const x = (bMin / 100 + Math.random() * ((bMax - bMin) / 100)) * canvas.width;
      createFirework(x, canvas.height * (0.35 + Math.random() * 0.4));
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.02 * speed;    // slight gravity → arcs (realistic)
      p.alpha -= 0.01;
      ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fill();
      if (p.alpha <= 0) particles.splice(i, 1);
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(update);
  };
  raf = requestAnimationFrame(update);
  return () => { running = false; cancelAnimationFrame(raf); window.removeEventListener("resize", resize); canvas.remove(); };
}

export default function SiteOccasions({ config, preview }: { config?: OccasionsConfig | null; preview?: ActiveState | null }) {
  const engineRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  useEffect(() => { setMounted(true); }, []);

  const active = useMemo<ActiveState>(() => {
    if (preview) return preview;
    return mounted ? resolveActive(config ?? {}, new Date()) : { banners: [] };
  }, [preview, mounted, config]);

  const anim = active.animation ? ANIM_BY_KEY[active.animation] : undefined;
  const settingsKey = JSON.stringify(active.settings ?? {});

  useEffect(() => {
    const host = engineRef.current;
    if (!host || !anim || anim.engine === "glow") return;
    const set = resolveSettings(active.settings);
    let stop: (() => void) | undefined;
    if (anim.engine === "emoji" && (anim.glyphs || anim.glyph)) stop = runEmojiEngine(host, anim.glyphs ?? [anim.glyph!], !!anim.rise, set);
    else if (anim.engine === "sprite") stop = runSpriteEngine(host, SANTA_SVG, set);
    else if (anim.engine === "fireworks") stop = runFireworksEngine(host, set);
    return () => stop?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.animation, settingsKey]);

  if (!mounted && !preview) return null;
  if (!anim && active.banners.length === 0) return null;
  const set = resolveSettings(active.settings);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      <div ref={engineRef} aria-hidden style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: Z, overflow: "hidden" }} />
      {anim?.engine === "glow" && (
        <div aria-hidden style={{ position: "fixed", top: "-22vh", left: "50%", width: "120vw", height: `${50 + set.size}vh`, zIndex: Z - 1, pointerEvents: "none",
          background: "radial-gradient(ellipse at center, rgba(253,224,71,.4), rgba(253,224,71,0) 62%)", animation: "abc-occ-sun 5s ease-in-out infinite" }} />
      )}
      {active.banners.filter((b) => !closed[b.id]).map((b) => (
        <BannerLayer key={b.id} b={b} settings={active.settings} onClose={() => setClosed((c) => ({ ...c, [b.id]: true }))} />
      ))}
    </>
  );
}

/** Airplane towing a banner — SAME pattern as Ali's Santa script: one smooth fly-across
 *  (Web Animations API), then hide, wait a random gap, fly again at a new random height.
 *  Enters left, exits right. Speed + wait come from the shared controls. */
function FlyingBanner({ text, bg, color, set }: { text: string; bg?: string; color?: string; set: ReturnType<typeof resolveSettings> }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let stopped = false, anim: Animation | null = null, to: ReturnType<typeof setTimeout> | null = null;
    const speedMs = (16 - set.speed) * 900;                              // higher speed → faster crossing
    const waitMin = 700 + (1 - set.randomness / 100) * 3200;             // randomness widens the gap range
    const waitMax = 2600 + (set.randomness / 100) * 11000;
    const fly = () => {
      if (stopped) return;
      const w = window.innerWidth, ew = el.offsetWidth || 320;
      el.style.top = `${(2 + Math.random() * 42).toFixed(1)}%`;          // random height each pass
      el.style.display = "block";
      anim = el.animate(
        [{ transform: `translateX(${-ew - 60}px)` }, { transform: `translateX(${w + 60}px)` }],
        { duration: speedMs, easing: "linear", fill: "forwards" });
      anim.onfinish = () => { el.style.display = "none"; if (!stopped) to = setTimeout(fly, Math.random() * (waitMax - waitMin) + waitMin); };
    };
    to = setTimeout(fly, 300);
    return () => { stopped = true; if (to) clearTimeout(to); try { anim?.cancel(); } catch { } };
  }, [set.speed, set.randomness]);
  return (
    <div ref={ref} aria-hidden style={{ position: "fixed", top: "10%", left: 0, zIndex: Z + 2, pointerEvents: "none", display: "none" }}>
      <div style={{ display: "flex", alignItems: "center", animation: "abc-occ-bob 3s ease-in-out infinite" }}>
        {/* trailing cloth banner (to the LEFT of the plane) */}
        <div style={{ display: "flex", alignItems: "center", padding: "8px 18px", color: color || "#fff", fontWeight: 700, fontSize: 15, whiteSpace: "nowrap",
          background: bg ?? "linear-gradient(90deg,#1e3a8a,#3b5fc0)", borderRadius: 4, boxShadow: "0 4px 14px rgba(0,0,0,.2)", animation: "abc-occ-wave 2.4s ease-in-out infinite" }}>
          {text}
        </div>
        {/* tow rope */}
        <div style={{ width: 26, height: 2, background: "rgba(100,116,139,.7)" }} />
        {/* airplane — SVG (not emoji) so the nose points forward (right) identically on every device. */}
        <span aria-hidden style={{ display: "inline-flex", filter: "drop-shadow(0 3px 3px rgba(0,0,0,.25))" }} dangerouslySetInnerHTML={{ __html: PLANE_SVG }} />
      </div>
    </div>
  );
}

/** Place the banner using a 3×3 grid position. Returns the wrapper's fixed-position styles. */
function placeBanner(pos: string): React.CSSProperties {
  const [v, h] = pos === "center" ? ["middle", "center"] : pos.split("-");
  const M = 16; // margin from the edge
  const st: React.CSSProperties = {};
  const tx: string[] = [];
  if (v === "top") st.top = M; else if (v === "bottom") st.bottom = M; else { st.top = "50%"; tx.push("translateY(-50%)"); }
  if (h === "left") st.left = M; else if (h === "right") st.right = M; else { st.left = "50%"; tx.push("translateX(-50%)"); }
  if (tx.length) st.transform = tx.join(" ");
  return st;
}

function BannerLayer({ b, settings, onClose }: { b: ActiveBanner; settings?: EffectSettings; onClose: () => void }) {
  const s = b.banner;
  const text = s.message || `🎉 ${b.name}`;
  if (b.fly) return <FlyingBanner text={text} bg={s.bg} color={s.textColor} set={resolveSettings(settings)} />;
  const bg = s.bg || undefined;
  const pos = s.position ?? "top-center";
  const vertical = pos === "middle-left" || pos === "middle-right"; // run the text vertically
  const placed = placeBanner(pos);
  // Vertical reading: right side reads top→bottom; left side reads bottom→top (rotate 180
  // so the glyphs aren't upside-down/reversed). Append to whatever placeBanner set.
  if (pos === "middle-left") placed.transform = `${placed.transform ?? ""} rotate(180deg)`.trim();
  const box: React.CSSProperties = {
    position: "fixed", zIndex: Z + 2, color: s.textColor || "#fff", fontSize: 15, fontWeight: 600,
    background: bg ?? "linear-gradient(90deg,#1e3a8a,#3b5fc0)", boxShadow: "0 2px 12px rgba(0,0,0,.18)", textAlign: "center",
    borderRadius: 10, padding: vertical ? "20px 12px" : "12px 20px", whiteSpace: s.widthPx ? "normal" : "nowrap",
    ...(vertical ? { writingMode: "vertical-rl" as any } : {}),
    ...(s.widthPx ? (vertical ? { height: s.widthPx } : { width: s.widthPx }) : {}),
    ...placed,
  };
  const pat: React.CSSProperties =
    s.pattern === "pulse" ? { animation: "abc-occ-pulse 1.6s ease-in-out infinite" } :
    s.pattern === "glow" ? { animation: "abc-occ-glowb 1.8s ease-in-out infinite" } :
    s.pattern === "dashed" ? { outline: "2px dashed rgba(255,255,255,.8)", outlineOffset: -4 } :
    s.pattern === "neon" ? { boxShadow: "0 0 12px #3b82f6, 0 0 24px #8b5cf6", border: "1px solid #93c5fd" } : {};
  return (
    <div style={{ ...box, ...pat }}>
      {text}
      {s.dismissible !== false && (
        // X sits OUTSIDE the box, at the top-right corner.
        <button onClick={onClose} aria-label="Dismiss" style={{ position: "absolute", top: -10, right: -10, display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: "#0f172a", border: "2px solid #fff", color: "#fff", cursor: "pointer", fontSize: 12, lineHeight: 1, boxShadow: "0 1px 4px rgba(0,0,0,.3)" }}>✕</button>
      )}
    </div>
  );
}
