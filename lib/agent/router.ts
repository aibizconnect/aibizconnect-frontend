import { DOMAINS, type Domain } from "./v1-format";
import { getDomainSpec, isImplemented, isLiveEnabled } from "./domains/registry";

/**
 * Domain router (Agent Mesh). The execution endpoint detects a plan's domain and
 * routes to the right DomainSpec. A domain is `implemented` if it has a registered
 * spec (can validate + dry-run); it is `liveEnabled` only if that spec is proven and
 * cleared for live writes. Unimplemented domains HALT with Execution BLOCKED (F)
 * rather than silently no-op — registered agents can exist before they can write.
 */

export function routeDomain(plan: unknown): {
  domain: Domain;
  implemented: boolean;
  liveEnabled: boolean;
  spec: ReturnType<typeof getDomainSpec>;
} {
  const raw = (plan as { domain?: string } | null)?.domain ?? "website";
  const domain = (DOMAINS as readonly string[]).includes(raw) ? (raw as Domain) : "website";
  return {
    domain,
    implemented: isImplemented(domain),
    liveEnabled: isLiveEnabled(domain),
    spec: getDomainSpec(domain),
  };
}

/** Domains currently cleared for LIVE writes (derived, not hard-coded). */
export const LIVE_DOMAINS: Domain[] = (DOMAINS as readonly Domain[]).filter(isLiveEnabled);
