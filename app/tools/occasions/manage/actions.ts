"use server";

import { getWidgetByKey, saveWidgetOccasions } from "@/lib/server/occasion-widget";
import type { OccasionsConfig } from "@/lib/occasions";

/**
 * Public, key-authenticated actions for the Occasions Widget configurator (the embed key is the
 * capability — whoever holds it manages that registration's occasions). No tenant scoping here.
 */
export async function loadWidgetAction(key: string): Promise<{ ok: boolean; domain?: string; occasions?: OccasionsConfig }> {
  const w = await getWidgetByKey(key);
  if (!w) return { ok: false };
  return { ok: true, domain: w.domain, occasions: w.occasions };
}

export async function saveWidgetAction(key: string, occasions: OccasionsConfig): Promise<{ ok: boolean; error?: string }> {
  if (!key) return { ok: false, error: "Missing key." };
  return saveWidgetOccasions(key, occasions);
}
