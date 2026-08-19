import { citeAs, type Catalogue } from "@/lib/catalogue/schema";

/**
 * Build the A2A "Agent Card" for a tenant's Knowledge Catalogue — the descriptor an
 * external agent fetches from /.well-known/agent-card.json to learn what this business
 * agent can do and how to reach it. Pure and testable.
 *
 * The ACTIVE endpoints (MCP + plain HTTP query) live on the Cloudflare Worker and are
 * advertised only when `a2aBase` is provided (set NEXT_PUBLIC_A2A_BASE once Phase 2 is
 * live). Until then the card still advertises the readable catalogue.json so we never
 * point agents at an endpoint that isn't up yet.
 */
export interface AgentCardSkill {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  /** Cost-bearing / side-effecting skills are auth-gated and only advertised once the
   *  authenticated active endpoint is live (never advertise `ask` as free-to-call). */
  requiresAuth?: boolean;
}

const SKILLS: AgentCardSkill[] = [
  { id: "get_profile", name: "Get business profile", description: "Identity, credentials, contact, and service areas.", tags: ["profile"] },
  { id: "search_services", name: "Search services", description: "Find services by keyword or area.", tags: ["services"] },
  { id: "get_pricing", name: "Get pricing", description: "Pricing model and details for a service.", tags: ["pricing"] },
  { id: "check_availability", name: "Check availability", description: "Open appointment slots for a bookable service.", tags: ["scheduling"], requiresAuth: true },
  { id: "ask", name: "Ask a question", description: "Grounded answer from this business's verified knowledge.", tags: ["qa"], requiresAuth: true },
];

export function buildAgentCard(
  doc: Catalogue,
  origin: string,
  tenantId: string,
  a2aBase?: string
): object {
  const base = a2aBase?.replace(/\/+$/, "");
  const active = !!base;
  // Honesty rule: only advertise a skill when it can actually be served securely. The read-only
  // tools are public; the cost/side-effect tools (ask, check_availability) are OAuth-gated and
  // only appear once the authenticated active endpoint is live. Enforcement happens at the
  // endpoint — the card is only a discovery document (A2A: the card alone guarantees nothing).
  const advertised = SKILLS.filter((s) => active || !s.requiresAuth);
  const card: any = {
    schemaVersion: "1.0",
    name: `${doc.identity.display_name} — Knowledge Agent`,
    description: `Verified business knowledge for ${citeAs(doc)}.`,
    provider: { organization: "AIBizConnect", url: "https://aibizconnect.app" },
    version: doc.schema_version,
    capabilities: { streaming: false, pushNotifications: false },
    defaultInputModes: ["application/json"],
    defaultOutputModes: ["application/json"],
    skills: advertised.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      tags: s.tags,
      // Read tools: no auth. Cost/side-effect tools: OAuth 2.1 bearer (enforced server-side).
      security: s.requiresAuth ? [{ oauth2: ["a2a:query"] }] : [],
    })),
    catalogue: { url: `${origin}/.well-known/catalogue.json` },
  };
  if (active) {
    card.url = `${base}/a2a/${tenantId}`;
    card.mcp = { endpoint: `${base}/mcp/${tenantId}`, transport: "streamable-http" };
    // Real auth for the gated skills: OAuth 2.1 resource server, discovered via RFC 9728
    // protected-resource metadata. No secrets in the card (credentials never live here).
    card.securitySchemes = {
      oauth2: {
        type: "oauth2",
        description: "OAuth 2.1 bearer, audience-bound to this agent's MCP resource.",
        protectedResourceMetadata: `${base}/.well-known/oauth-protected-resource/mcp/${tenantId}`,
      },
    };
  }
  return card;
}
