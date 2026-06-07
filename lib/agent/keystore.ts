/**
 * KeyStore abstraction (E-3, ratified). The single seam through which any domain
 * resolves a third-party / LLM credential. v1 resolves from platform-level env vars
 * (one shared sender per service). The interface is deliberately BYOK-shaped (K-1/K-2):
 * when per-tenant encrypted keys ship, only this module changes — callers stay put.
 *
 * Security posture: NEVER returns a key to the client, NEVER logs the value, and
 * exposes `has()` so callers can gate on presence without touching the secret.
 */

export type ServiceKey =
  | "openai"     // LLM (platform key today)
  | "resend"     // email (DL-1)
  | "social"     // social publishing (DL — next reference domain)
  | "meta_ads"   // ads (future)
  | "google_ads" // ads (future)
  | "twilio";    // voice (future)

const ENV_MAP: Record<ServiceKey, string> = {
  openai: "OPENAI_API_KEY",
  resend: "RESEND_API_KEY",
  social: "SOCIAL_API_TOKEN",
  meta_ads: "META_ADS_TOKEN",
  google_ads: "GOOGLE_ADS_TOKEN",
  twilio: "TWILIO_AUTH_TOKEN",
};

export interface KeyResolution {
  present: boolean;
  source: "platform-env" | "tenant-byok" | "none";
}

export interface KeyStore {
  /** Resolve a usable credential for a service, optionally tenant-scoped (BYOK later). */
  resolve(service: ServiceKey, tenantId?: string): Promise<string | null>;
  /** Presence check WITHOUT exposing the value — for safe gating in routes/logs. */
  has(service: ServiceKey, tenantId?: string): Promise<KeyResolution>;
}

/**
 * v1 implementation: platform env only. tenantId is accepted (so call sites are
 * already BYOK-ready) but ignored until the encrypted tenant_llm_keys path ships.
 */
class PlatformEnvKeyStore implements KeyStore {
  async resolve(service: ServiceKey): Promise<string | null> {
    const v = process.env[ENV_MAP[service]];
    return v && v.trim() ? v : null;
  }
  async has(service: ServiceKey): Promise<KeyResolution> {
    const v = process.env[ENV_MAP[service]];
    return v && v.trim() ? { present: true, source: "platform-env" } : { present: false, source: "none" };
  }
}

export const keyStore: KeyStore = new PlatformEnvKeyStore();
