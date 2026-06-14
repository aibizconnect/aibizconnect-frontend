/**
 * Lightweight feature flags. Env-driven so a module can ship "wrapped behind a flag"
 * (Copilot's guidance) and be toggled per environment without code changes.
 *
 * Funnels is complete but new — gate it so it can be turned off instantly if needed.
 * Default ON. Set FUNNELS_ENABLED=off (or NEXT_PUBLIC_FUNNELS_ENABLED=off) to hide it:
 * the Sites-hub "Funnels" tab renders as "soon" and the /sites/funnels routes 404.
 */
function envOff(...vals: (string | undefined)[]): boolean {
  return vals.some((v) => (v ?? "").toLowerCase() === "off" || (v ?? "").toLowerCase() === "false");
}

export function funnelsEnabled(): boolean {
  return !envOff(process.env.FUNNELS_ENABLED, process.env.NEXT_PUBLIC_FUNNELS_ENABLED);
}

/**
 * IDX/VOW (real-estate listings via CREA DDF). DEFAULT OFF — flips on only when explicitly enabled
 * AND a tenant has a feed configured with DDF terms accepted. Set IDX_ENABLED=on to surface it.
 */
export function idxEnabled(): boolean {
  const v = (process.env.IDX_ENABLED ?? process.env.NEXT_PUBLIC_IDX_ENABLED ?? "").toLowerCase();
  return v === "on" || v === "true";
}
