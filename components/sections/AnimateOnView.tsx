"use client";

import { useEffect } from "react";

/**
 * Animate-on-view driver (Ali 2026-06-11): entrance animations start when the element is
 * FOCUSED ON — i.e. scrolled into view — instead of all firing on page load (where anything
 * below the fold animated unseen).
 *
 * How: adds `.abc-aos` to <html> (the CSS pauses every `[class*="abc-anim-"]` at its first
 * keyframe), then an IntersectionObserver tags each element `.abc-inview` the first time
 * ~15% of it enters the viewport, releasing its animation. A MutationObserver picks up
 * elements added later (editor inserts, client-side renders). Without JS, `.abc-aos` never
 * lands and animations simply run on load — nothing can be stuck invisible.
 *
 * Mounted on the public site route, the preview document, and the editor canvas, so the
 * behavior is WYSIWYG everywhere.
 */
export default function AnimateOnView() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("abc-aos");

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add("abc-inview");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15 },
    );

    const watch = (scope: ParentNode) => {
      scope.querySelectorAll('[class*="abc-anim-"]:not(.abc-inview)').forEach((el) => io.observe(el));
    };
    watch(document);

    // Elements that appear AFTER mount (editor inserts, lazy client renders) get observed too.
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes.forEach((n) => {
          if (!(n instanceof HTMLElement)) return;
          if (/abc-anim-/.test(n.className) && !n.classList.contains("abc-inview")) io.observe(n);
          watch(n);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => { io.disconnect(); mo.disconnect(); root.classList.remove("abc-aos"); };
  }, []);
  return null;
}

/** Replay an element subtree's entrance animations (editor: when a section gets selected). */
export function replayAnimations(node: HTMLElement | null) {
  if (!node) return;
  const targets = [node, ...Array.from(node.querySelectorAll<HTMLElement>('[class*="abc-anim-"]'))]
    .filter((el) => /abc-anim-/.test(el.className));
  for (const el of targets) {
    el.classList.remove("abc-inview");
    void el.offsetWidth; // force reflow so the animation restarts
    el.classList.add("abc-inview");
  }
}
