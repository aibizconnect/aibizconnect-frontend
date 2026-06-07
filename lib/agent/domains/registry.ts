import type { Domain } from "../v1-format";
import type { DomainSpec } from "./types";
import { websiteDomain } from "./website";
import { emailDomain } from "./email";
import { socialDomain } from "./social";
import { adsDomain } from "./ads";
import { voiceDomain } from "./voice";

/**
 * Domain registry (E-2). Single source of truth mapping a Domain -> its DomainSpec.
 * The router and execute route consult this instead of a hard-coded LIVE_DOMAINS list.
 *
 * - website: live (proven, runs through the core engine).
 * - email:   registered, dry-run PROVEN, live SENDING blocked until key + G-approval.
 * - social:  registered, dry-run capable, live PUBLISHING blocked until proven + gated.
 * - ads:     registered STUB, dry-run capable, live SPEND blocked (stub + financial
 *            boundary + G-gated). Not liveEnabled until proven AND Ali wires billing.
 * - voice:   registered STUB, dry-run capable, live CALL/SMS blocked (stub + financial
 *            boundary + G-gated). Not liveEnabled until proven AND Ali wires billing.
 * - chatbot: not yet registered here -> treated as not-implemented
 *   (Execution BLOCKED / F) until it ships a DomainSpec.
 */

const SPECS: Partial<Record<Domain, DomainSpec>> = {
  website: websiteDomain,
  email: emailDomain,
  social: socialDomain,
  ads: adsDomain,
  voice: voiceDomain,
};

export function getDomainSpec(domain: Domain): DomainSpec | null {
  return SPECS[domain] ?? null;
}

/** A domain is "implemented" if it has a spec (can at minimum validate + dry-run). */
export function isImplemented(domain: Domain): boolean {
  return !!SPECS[domain];
}

/** A domain may run LIVE only if its spec says so AND a dry-run has been proven. */
export function isLiveEnabled(domain: Domain): boolean {
  const s = SPECS[domain];
  return !!s && s.liveEnabled && s.dryRunProven;
}

export function listDomainSpecs() {
  return Object.values(SPECS).map((s) => s!.describe());
}
