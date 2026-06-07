import type { Layout } from "./components";

/**
 * Responsive layout primitives (DL-2 deepening). Maps a component's semantic Layout
 * intent to responsive Tailwind classes, all driven by brand tokens (--abc-* CSS vars
 * from tokensToCssVars). This is the bridge between the component registry's INTENT and
 * actual premium, responsive rendering — mobile-first, token-themed, no hard-coded colors.
 */

const PAD_Y: Record<NonNullable<Layout["paddingY"]>, string> = {
  none: "py-0",
  sm: "py-8",
  md: "py-12 sm:py-16",
  lg: "py-16 sm:py-24",
  xl: "py-24 sm:py-32",
};

const WIDTH: Record<NonNullable<Layout["width"]>, string> = {
  full: "w-full",
  contained: "mx-auto w-full max-w-[var(--abc-maxw,1200px)] px-6",
  narrow: "mx-auto w-full max-w-3xl px-6",
};

const ALIGN: Record<NonNullable<Layout["align"]>, string> = {
  start: "text-left items-start",
  center: "text-center items-center",
  end: "text-right items-end",
};

const BG: Record<NonNullable<Layout["background"]>, string> = {
  transparent: "",
  surface: "bg-[var(--abc-color-surface,#111827)] text-[var(--abc-color-surfaceContrast,#f9fafb)]",
  primary: "bg-[var(--abc-color-primary,#4f46e5)] text-[var(--abc-color-primaryContrast,#ffffff)]",
  accent: "bg-[var(--abc-color-accent,#22d3ee)] text-[var(--abc-color-background,#0b1020)]",
};

const COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

const DEFAULTS: Required<Layout> = { width: "contained", align: "center", columns: 1, paddingY: "lg", background: "transparent" };

export function resolveLayout(layout?: Partial<Layout>): Required<Layout> {
  return { ...DEFAULTS, ...(layout ?? {}) };
}

/** Outer band classes (full-bleed background + vertical rhythm). */
export function bandClasses(layout: Required<Layout>): string {
  return [BG[layout.background], PAD_Y[layout.paddingY]].filter(Boolean).join(" ");
}

/** Inner content container (max width + horizontal padding + alignment). */
export function containerClasses(layout: Required<Layout>): string {
  return [WIDTH[layout.width], "flex flex-col gap-6", ALIGN[layout.align]].filter(Boolean).join(" ");
}

/** Grid classes for multi-column components. */
export function gridClasses(columns: number): string {
  return ["grid gap-6", COLS[Math.min(4, Math.max(1, columns))]].join(" ");
}
