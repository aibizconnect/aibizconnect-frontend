import crypto from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { SYSTEM_TENANT_ID } from "@/lib/media/system";
import { getIntegrationSecret } from "./integrations";

/**
 * Server-only KYC / identity-verification module (NOT "use server"). Provider: Stripe Identity
 * (primary), behind a thin abstraction so Persona can be added later. HARD RULE — we NEVER store
 * government IDs, SSNs, passports, DOB, addresses, or document images. All PII lives in the provider
 * hosted flow; we keep only a status, the provider session reference, and a NON-PII decision summary.
 *
 * Platform creds: env first (STRIPE_IDENTITY_SECRET_KEY / STRIPE_SECRET_KEY +
 * STRIPE_IDENTITY_WEBHOOK_SECRET), else the encrypted platform secret under SYSTEM_TENANT_ID,
 * provider 'stripe_identity_platform_app' { secret_key, webhook_secret }. Graceful when unconfigured.
 */

export const KYC_PROVIDER = "stripe_identity";

export type KycStatus =
  | "pending_start"
  | "provider_initiated"
  | "provider_in_progress"
  | "provider_verified"
  | "provider_rejected"
  | "provider_failed"
  | "platform_approved"
  | "platform_rejected"
  | "platform_overridden";

/** Terminal "good" state — the ONLY status that satisfies ensureKycApproved(). */
export const APPROVED_STATUS: KycStatus = "platform_approved";

export interface KycRecord {
  id: string;
  tenant_id: string;
  provider: string;
  status: KycStatus;
  provider_session_id: string | null;
  provider_decision: Record<string, unknown>;
  provider_risk_level: string | null;
  provider_reason: string | null;
  platform_decision: string | null;
  platform_reason: string | null;
  platform_reviewer_id: string | null;
  platform_reviewed_at: string | null;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

function appBase(): string {
  return (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.aibizconnect.app").replace(/\/+$/, "");
}

async function stripeIdentityCreds(): Promise<{ secret: string; webhookSecret?: string } | null> {
  const secret = process.env.STRIPE_IDENTITY_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_IDENTITY_WEBHOOK_SECRET;
  if (secret) return { secret, webhookSecret };
  try {
    const s = await getIntegrationSecret(SYSTEM_TENANT_ID, "stripe_identity_platform_app");
    if (s?.secret_key) return { secret: String(s.secret_key), webhookSecret: s.webhook_secret ? String(s.webhook_secret) : undefined };
  } catch { /* not configured */ }
  return null;
}

/** True when the platform KYC provider is configured (lets the UI degrade gracefully). */
export async function kycProviderReady(): Promise<boolean> {
  return !!(await stripeIdentityCreds());
}

// ─────────────────────────────────────────────────────────────────────────────
// Read + gating
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch the tenant's KYC record (or null). Returns the raw row including only non-PII fields. */
export async function getKycRecord(tenantId: string): Promise<KycRecord | null> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("tenant_kyc")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("provider", KYC_PROVIDER)
    .maybeSingle();
  return (data as KycRecord | null) ?? null;
}

export interface KycStatusView {
  status: KycStatus | "none";
  approved: boolean;
  inReview: boolean;
  riskLevel: string | null;
  reason: string | null;
  updatedAt: string | null;
}

/** Non-PII status view for tenant + platform UIs. Never exposes a secret or any PII. */
export async function getKycStatus(tenantId: string): Promise<KycStatusView> {
  const rec = await getKycRecord(tenantId);
  if (!rec) return { status: "none", approved: false, inReview: false, riskLevel: null, reason: null, updatedAt: null };
  return {
    status: rec.status,
    approved: rec.status === APPROVED_STATUS,
    inReview: rec.status === "provider_verified" || rec.status === "provider_rejected" || rec.status === "provider_in_progress",
    riskLevel: rec.provider_risk_level,
    reason: rec.provider_reason,
    updatedAt: rec.updated_at,
  };
}

/**
 * Policy: is KYC required for this tenant before high-trust actions (e.g. future Stripe Connect
 * payouts)? Defaults to false in this phase (verification is available but not enforced) and can be
 * switched on globally via KYC_REQUIRED=true. Centralised so the policy lives in exactly one place.
 */
export async function kycRequired(_tenantId: string): Promise<boolean> {
  return String(process.env.KYC_REQUIRED || "").toLowerCase() === "true";
}

/**
 * Gate for high-trust actions. Throws unless the tenant is platform_approved. This is wired now and
 * ready to guard the (deferred) Stripe Connect payout path — it never performs a destructive action.
 */
export async function ensureKycApproved(tenantId: string): Promise<void> {
  const { approved } = await getKycStatus(tenantId);
  if (!approved) throw new Error("KYC verification is required and not yet approved for this account.");
}

// ─────────────────────────────────────────────────────────────────────────────
// Start a hosted verification session (gate-free core; callers gate access)
// ─────────────────────────────────────────────────────────────────────────────

function stripeForm(obj: Record<string, string>): string {
  return new URLSearchParams(obj).toString();
}

/**
 * SERVER-ONLY gate-free core: create a Stripe Identity verification session for the tenant and store
 * a 'provider_initiated' record. Returns the hosted URL the tenant completes on Stripe's pages.
 * No PII passes through us — Stripe collects everything on its hosted flow.
 */
export async function startKycCore(tenantId: string, createdBy: string): Promise<{ ok: boolean; url?: string; message?: string }> {
  const creds = await stripeIdentityCreds();
  if (!creds) return { ok: false, message: "Identity verification is not configured yet (missing platform credentials)." };
  try {
    const res = await fetch("https://api.stripe.com/v1/identity/verification_sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${creds.secret}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: stripeForm({
        type: "document",
        "metadata[tenant_id]": tenantId,
        "metadata[app]": "aibizconnect",
        return_url: `${appBase()}/tenants/${tenantId}/settings?tab=verification&kyc=returned`,
      }),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json?.id) return { ok: false, message: json?.error?.message || `Could not start verification (${res.status}).` };

    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from("tenant_kyc").upsert(
      {
        tenant_id: tenantId,
        provider: KYC_PROVIDER,
        status: "provider_initiated",
        provider_session_id: json.id,
        provider_decision: {},
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,provider" }
    );
    if (error) return { ok: false, message: error.message };

    try {
      const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
      await logPlatformEvent({ action: "kyc.session_started", actorEmail: createdBy, meta: { tenantId, sessionId: json.id } });
    } catch { /* best effort */ }

    // Stripe returns a hosted `url` for redirect flows.
    return { ok: true, url: json.url };
  } catch (e: any) {
    return { ok: false, message: e?.message ?? "Could not start verification." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook signature + idempotent status update (gate-free core)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify a Stripe webhook signature (Stripe-Signature: t=...,v1=...). HMAC-SHA256 over
 * `${t}.${rawBody}` with the webhook signing secret, timing-safe compared, with a 5-min tolerance.
 * Returns false on any gap — forged/late events are rejected before any DB write.
 */
export async function verifyStripeSignature(rawBody: string, sigHeader: string | null): Promise<boolean> {
  const creds = await stripeIdentityCreds();
  if (!creds?.webhookSecret || !sigHeader) return false;
  const parts = Object.fromEntries(sigHeader.split(",").map((kv) => kv.split("=").map((s) => s.trim())));
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;
  const tsNum = Number(t);
  if (!Number.isFinite(tsNum)) return false;
  // 5-minute replay tolerance (uses a numeric epoch; no wall-clock branching beyond this).
  if (Math.abs(Math.floor(Date.now() / 1000) - tsNum) > 300) return false;
  const expected = crypto.createHmac("sha256", creds.webhookSecret).update(`${t}.${rawBody}`).digest("hex");
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(v1, "utf8");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch { return false; }
}

/** Map a Stripe Identity verification-session status → our lifecycle status. */
function mapSessionStatus(stripeStatus: string): KycStatus | null {
  switch (stripeStatus) {
    case "verified": return "provider_verified";
    case "requires_input": return "provider_rejected";
    case "processing": return "provider_in_progress";
    case "canceled": return "provider_failed";
    default: return null;
  }
}

/**
 * Extract a STRICTLY NON-PII summary from a Stripe Identity session object. We never read or persist
 * verified_outputs (name/dob/address/id number). Only coarse, non-identifying signals.
 */
function nonPiiSummary(session: any): { decision: Record<string, unknown>; risk: string | null; reason: string | null } {
  const report = session?.last_verification_report;
  const docType = typeof report === "object" ? report?.document?.type : undefined; // e.g. "passport" | "driving_license" (a category, not an ID)
  const lastErrorCode = session?.last_error?.code ?? null;                          // e.g. "consent_declined", "under_supported_age"
  const decision: Record<string, unknown> = {
    provider: KYC_PROVIDER,
    session_status: session?.status ?? null,
    doc_type: docType ?? null,
    report_id: typeof report === "string" ? report : report?.id ?? null,
    error_code: lastErrorCode,
  };
  // Stripe Identity does not return a risk band or PEP/sanctions; left null and deferred per spec.
  return { decision, risk: null, reason: lastErrorCode };
}

/**
 * SERVER-ONLY gate-free idempotent core: apply a provider webhook to the tenant_kyc row. Caller MUST
 * have verified the signature already. Idempotent: re-delivering the same event is a no-op once the
 * row already reflects that outcome, and platform_* terminal states are never silently overwritten.
 */
export async function updateKycStatusCore(event: any): Promise<{ ok: boolean; message?: string; tenantId?: string }> {
  const session = event?.data?.object;
  const type: string = event?.type ?? "";
  if (!session || !type.startsWith("identity.verification_session")) return { ok: false, message: "Unhandled event type." };

  const sessionId: string | undefined = session.id;
  const tenantId: string | undefined = session?.metadata?.tenant_id;
  if (!sessionId) return { ok: false, message: "Missing session id." };

  const next = mapSessionStatus(String(session.status || ""));
  if (!next) return { ok: true, message: "No status change." };

  const supabase = createSupabaseServiceClient();
  // Locate the row by tenant metadata when present, else by the session id we stored at start.
  const query = supabase.from("tenant_kyc").select("*").eq("provider", KYC_PROVIDER);
  const { data: row } = tenantId
    ? await query.eq("tenant_id", tenantId).maybeSingle()
    : await query.eq("provider_session_id", sessionId).maybeSingle();
  const rec = row as KycRecord | null;
  if (!rec) return { ok: false, message: "No KYC record for this session." };

  // Idempotency / safety: never roll a platform_* terminal decision back to a provider_* state.
  if (rec.status.startsWith("platform_")) {
    await supabase.from("tenant_kyc").update({ last_sync_at: new Date().toISOString() }).eq("id", rec.id);
    return { ok: true, message: "Platform decision is terminal — provider event recorded only.", tenantId: rec.tenant_id };
  }
  if (rec.status === next) {
    await supabase.from("tenant_kyc").update({ last_sync_at: new Date().toISOString() }).eq("id", rec.id);
    return { ok: true, message: "No-op (already current).", tenantId: rec.tenant_id };
  }

  const { decision, risk, reason } = nonPiiSummary(session);
  const { error } = await supabase.from("tenant_kyc").update({
    status: next,
    provider_session_id: sessionId,
    provider_decision: decision,
    provider_risk_level: risk,
    provider_reason: reason,
    last_sync_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", rec.id);
  if (error) return { ok: false, message: error.message };

  try {
    const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
    await logPlatformEvent({ action: "kyc.provider_update", actorEmail: "kyc_webhook", meta: { tenantId: rec.tenant_id, sessionId, status: next } });
  } catch { /* best effort */ }

  return { ok: true, tenantId: rec.tenant_id };
}

/**
 * SERVER-ONLY gate-free core: record a platform reviewer's decision. Caller MUST have checked
 * superadmin/admin authorization. decision ∈ approved | rejected | overridden.
 */
export async function applyPlatformDecisionCore(
  tenantId: string,
  decision: "approved" | "rejected" | "overridden",
  reviewerEmail: string,
  reason: string,
): Promise<{ ok: boolean; message?: string }> {
  const map: Record<string, KycStatus> = {
    approved: "platform_approved",
    rejected: "platform_rejected",
    overridden: "platform_overridden",
  };
  const status = map[decision];
  if (!status) return { ok: false, message: "Invalid decision." };
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("tenant_kyc").update({
    status,
    platform_decision: decision,
    platform_reason: reason || null,
    platform_reviewer_id: reviewerEmail,
    platform_reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("tenant_id", tenantId).eq("provider", KYC_PROVIDER);
  if (error) return { ok: false, message: error.message };
  try {
    const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
    await logPlatformEvent({ action: "kyc.platform_decision", actorEmail: reviewerEmail, meta: { tenantId, decision } });
  } catch { /* best effort */ }
  return { ok: true };
}
