/**
 * Platform Stripe — AIBizConnect charging its OWN tenants for marketplace add-ons.
 *
 * This is DISTINCT from:
 *   - per-tenant Stripe keys (lib/server/payments.ts) — a tenant selling to their customers
 *   - Stripe Identity (KYC) — verification only
 *
 * The platform charging credential is the env var STRIPE_SECRET_KEY (owned per the
 * inventory; wired in the deploy env, not necessarily locally). When it's absent, the
 * marketplace surfaces "checkout isn't enabled yet" rather than crashing — ship-dark safe.
 */

export function platformStripeKey(): string | null {
  const k = (process.env.STRIPE_SECRET_KEY || "").trim();
  return k || null;
}

export function platformStripeReady(): boolean {
  return !!platformStripeKey();
}

export function platformWebhookSecret(): string | null {
  const s = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  return s || null;
}

/** Absolute app base URL for Stripe success/cancel redirects (mirrors lib/server/store.ts). */
export function appBase(): string {
  return (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.aibizconnect.app").replace(/\/+$/, "");
}
