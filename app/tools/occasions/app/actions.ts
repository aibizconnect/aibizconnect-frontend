"use server";

import {
  verifyLocationToken, listSitesForLocation, createSiteForLocation, removeSiteForLocation,
  setSiteActiveForLocation, setSiteBadgeForLocation, saveOccasionsForLocation,
} from "@/lib/server/occasion-widget-accounts";
import type { OccasionsConfig } from "@/lib/occasions";

/**
 * Server actions for the GHL Occasions dashboard. Every call carries the signed session token
 * minted by the page (HMAC over the GHL location id) — so the location can ONLY touch its own
 * sites. No tenant cookie needed (the dashboard runs embedded in GHL).
 */
async function loc(token: string): Promise<string> {
  const v = verifyLocationToken(token);
  if (!v) throw new Error("Your session expired — reopen Occasions from your menu.");
  return v.locationId;
}

export async function listSitesAction(token: string) { return listSitesForLocation(await loc(token)); }
export async function addSiteAction(token: string, domain: string) { return createSiteForLocation({ locationId: await loc(token), domain }); }
export async function removeSiteAction(token: string, key: string) { return removeSiteForLocation(await loc(token), key); }
export async function setActiveAction(token: string, key: string, active: boolean) { return setSiteActiveForLocation(await loc(token), key, active); }
export async function setBadgeAction(token: string, key: string, badge: boolean) { return setSiteBadgeForLocation(await loc(token), key, badge); }
export async function saveOccasionsAction(token: string, key: string, occasions: OccasionsConfig) { return saveOccasionsForLocation(await loc(token), key, occasions); }
