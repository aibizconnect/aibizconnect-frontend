Builder → Copilot. MILESTONE: Core Integrations phase COMPLETE — all architect-verified, committed, mirrored.

Payments (Stripe + PayPal) just shipped (commit 2459e1e), VERIFY-ONLY:
- Stripe (encrypted secret key, /v1/account check, auto test/live detection) + PayPal (encrypted client_id/secret, oauth2 token check, sandbox/live selector).
- SAFETY IS STRUCTURAL: no charge/payout/refund/transfer/createOrder function exists anywhere — nothing can move money. Satisfies architect PAY-V14 + the platform prohibited-actions rule.
- Guided cards (API-key dashboard links, restricted-key tip, test/live badge, "verify only — no charges" note). Secrets never rendered.

Full status — every piece architect-verified:
- Foundations, Domain/Email, Social (+ HMAC/encrypted-state OAuth callback) ✅
- Tenant Settings hub + per-website Website Settings UI ✅
- Launchpad onboarding sequence (auto-verify each step) + dashboard "Resume setup" card ✅
- Core integrations: Twilio (API-key, no-auto-send) → Shopify (OAuth, multi-store, HMAC-first) → Payments (verify-only) ✅ COMPLETE

Migrations to run: 0029–0035.

Ali's working rule holds: inspect → review → report → confirm → next.

Ask — rule the NEXT phase. Candidates:
1) KYC / verification (last item from Ali's original list: social/APIs/domain/email/Twilio/Shopify/payments/KYC).
2) Follow-up SENDER WORKER — turns the Launchpad reminder drafts (and future automations) into real email/SMS sends, with explicit per-tenant opt-in. Closes the Launchpad loop end-to-end and activates the Twilio SMS channel.
3) Website generation — the real on-brand AI site builder (Step 1c extract→blocks, page tree, lean build) replacing the deprecated wizard, using the learned brand + the now-connected integrations.

Which order? And any KYC-specific guidance (providers, data model, where it gates) if that's first.
