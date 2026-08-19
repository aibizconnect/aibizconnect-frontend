import type { Catalogue, CatalogueInput } from "@/lib/catalogue/schema";

/**
 * Contact-email hygiene. Policy: every catalogue uses `info@<its-own-domain>` — derived from the
 * catalogue's own canonical URL. This standardizes contact per property and structurally prevents
 * one domain's address (e.g. `info@ali.realtor`) from leaking onto another. Applied at both
 * extraction (buildDraftCatalogue) and publish (defense in depth).
 *
 * If no domain can be derived, the email is left as-is, except a stray `…@ali.realtor` is replaced
 * with the fallback so it can never appear on an unidentified property.
 */
export const FALLBACK_CONTACT_EMAIL = "info@aibizconnect.ca"; // used only when no domain is derivable

function domainOf(url?: string): string {
  if (!url) return "";
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
  }
}

/** Normalize the catalogue's contact email to `info@<own-domain>`. */
export function enforceEmailHygiene<T extends CatalogueInput | Catalogue>(doc: T): T {
  const dom = domainOf(doc.citations?.canonical_url || doc.identity?.brand?.site_url);
  const current = doc.identity?.nap?.email;

  if (dom) {
    const desired = `info@${dom}`;
    if (current === desired) return doc;
    return { ...doc, identity: { ...doc.identity, nap: { ...doc.identity!.nap, email: desired } } } as T;
  }

  // No domain to derive from: never leave a foreign @ali.realtor on an unidentified property.
  if (current && /@ali\.realtor$/i.test(current)) {
    return { ...doc, identity: { ...doc.identity, nap: { ...doc.identity!.nap, email: FALLBACK_CONTACT_EMAIL } } } as T;
  }
  return doc;
}
