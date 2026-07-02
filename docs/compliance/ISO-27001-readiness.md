# AIBizConnect — ISO/IEC 27001:2022 readiness & security-audit gap analysis

**Date:** 2026-07-02 · **Status:** draft for internal review / to share with an ISO consultant or
auditor · **Owner:** Alireza Bolourchi (al@aibizconnect.app) · **Prepared with:** Gemini architect
peer review (rulings 403/404); Copilot review pending.

> **Read this first.** ISO 27001 certification is achieved by building an **ISMS** (Information
> Security Management System) — mostly *documentation, risk management and process* — and passing a
> **two-stage audit by an accredited certification body**. It is ~80% organizational and ~20%
> technical. No product feature makes you "compliant"; an accredited auditor certifies you. This
> document tells you what to build to become **audit-ready** and roughly in what order.

---

## 1. Scope (proposed)

The ISMS covers the **AIBizConnect multi-tenant SaaS platform** (aibizconnect.app / .ca) — the
Next.js application, its Supabase database, the tenant/lead data it processes, and the cloud
sub-processors below. Corporate entity: AI Biz Connect (incorporating in Ontario).

**Data processed:** customer (tenant) PII and their end-customers' PII — names, emails, phones,
domains, CRM/lead records; marketing consent (CASL); message content; encrypted third-party API
credentials. Jurisdictions: Canada (**PIPEDA / CASL**) + US customers.

**Sub-processors (need supplier-security review + DPAs):** Vercel (hosting), Supabase (database),
Cloudflare (DNS/CDN/R2 storage), Resend (email), GoHighLevel (CRM/funnels), Stripe/GHL (payments),
OpenAI + Google Gemini (AI generation). Most hold SOC 2 / ISO 27001 themselves — collect their
certificates for the supplier file.

---

## 2. What's already in place (strengths to credit)

- **Authentication enforced in prod** — `AUTH_ENFORCE=true`: unauthenticated requests redirect to
  login; per-tenant authorization (`requireTenantAccess`) **fails closed**.
- **Role model** — superadmin > admin > staff (env allowlists + `app_metadata.platform_role`);
  superadmin impersonation is gated and non-escalating.
- **Audit trail** — `platform_audit_log` table records sensitive platform events.
- **Encryption at rest for secrets** — third-party credentials stored **AES-256-GCM** encrypted
  (`SETTINGS_ENCRYPTION_KEY`); TLS in transit everywhere (Vercel/Cloudflare).
- **Database RLS enabled on all public tables** (the Supabase `rls_disabled_in_public` critical
  finding was remediated 2026-07-01).
- **Consent capture** — CASL consent checkbox on lead-gen forms; per-recipient unsubscribe on email.
- **Reputable, certified infrastructure** — Vercel/Supabase/Cloudflare (physical + platform controls
  inherited).

---

## 3. ISMS clause gap analysis (ISO 27001:2022, clauses 4–10)

| Clause | State | To do (organizational) |
|---|---|---|
| 4 · Context of the organization | Partial | Document ISMS **scope**, interested parties, internal/external issues. |
| 5 · Leadership | Partial | Top-management commitment; assign an **ISMS owner / CISO role**; InfoSec policy sign-off. |
| 6 · Planning | **Missing** | **Formal risk assessment + risk treatment plan**; **Statement of Applicability (SoA)**; security objectives. |
| 7 · Support | Partial | Competence, **security-awareness training**, communication plan, documented-information control. |
| 8 · Operation | Partial | Operational planning; **change management**; risk assessments at defined intervals. |
| 9 · Performance evaluation | **Missing** | Monitoring/measurement, **internal audit**, **management review**. |
| 10 · Improvement | **Missing** | Nonconformity handling + **corrective action** process. |

---

## 4. Annex A control gap analysis (2022, 93 controls in 4 themes)

**A.5 Organizational (37)** — biggest gap area:
- **Information Security Policy** (top-level + topic-specific policies). *Missing.*
- **Supplier / cloud-service security** — supplier register, security reviews, DPAs for all
  sub-processors. *Missing.*
- **Incident management** — Incident Response Plan, reporting channel, evidence handling. *Missing.*
- **Access control policy**, periodic **user-access reviews**, segregation of duties. *Partial.*
- **Threat intelligence, data classification, acceptable use, records/retention.** *Missing/partial.*

**A.6 People (8):** HR security policy, confidentiality/NDAs, security-awareness training,
onboarding/offboarding access. *Significant gap for a growing team.*

**A.7 Physical (14):** **N/A / inherited** from Vercel/Supabase/Cloudflare — document reliance on
their certifications (home-office policy if staff work remotely).

**A.8 Technological (34):** see §5. Notable: secure development lifecycle, logging & monitoring,
cryptography & **key management**, backup, vulnerability management, network security.

---

## 5. Technical security gaps & remediation (Annex A.8 + audit hygiene)

Priority: **P0** = fix now / material exposure · **P1** = before audit · **P2** = maturity.

| # | Pri | Gap | Action |
|---|---|---|---|
| T1 | **P0** | `website_*` tables still on permissive **interim-open RLS** (`using(true)`) → the public anon key can read/write published-site data. | Replace with real tenant-scoped RLS and/or move user-facing data access off the **service-role key** onto a request-scoped JWT client (SECURITY-PLAN.md Step 2–3). Roll out behind a flag, table by table. |
| T2 | **P0** | Auth JWT stored in a **non-httpOnly `token` cookie** → stealable by any XSS. | Set `httpOnly` + `Secure` + `SameSite=Lax/Strict`; keep only what the server needs client-side. |
| T3 | **P0** | **No MFA** for platform admins (superadmin/admin). | Enforce MFA (Supabase Auth MFA / TOTP) for all platform-team accounts. |
| T4 | P1 | **Key management** for `SETTINGS_ENCRYPTION_KEY` undocumented (no rotation/escrow policy). | Cryptography policy: key custody, rotation procedure, re-encryption runbook, break-glass. |
| T5 | P1 | **Backup & restore** not documented or restore-tested. | Confirm Supabase PITR; document backup scope/retention; **perform + log a test restore**. |
| T6 | P1 | **No SCA/SAST in CI**; dependency & supply-chain risk unmanaged. | Add Dependabot/`npm audit` gate + a SAST step (e.g. CodeQL) to CI; triage cadence. |
| T7 | P1 | **No rate-limiting / WAF** on public + auth + webhook endpoints. | Cloudflare WAF + rate limits on `/login`, `/api/*`, register/webhook routes; bot mitigation. |
| T8 | P1 | **Logging & monitoring** coverage partial (auth events, admin actions, anomalies). | Extend `platform_audit_log` coverage; centralize logs + alerting; define retention. |
| T9 | P2 | Vulnerability management, pen-test, secure-SDLC not formalized. | Annual pen-test; documented SDLC with security review gate (already: drafts-only, no auto-publish/charge). |
| T10 | P2 | Data classification, retention & deletion (PIPEDA data-subject requests). | Classify data; retention schedule; documented deletion path (data-deletion page already exists). |

---

## 6. Recommended path to certification (indicative)

1. **Engage an ISO 27001 consultant / advisory tool** (Vanta, Drata, Secureframe, or a local
   consultant). This is the fastest route for a small company — they provide the policy templates,
   risk-register tooling, and evidence collection.
2. **Define scope + risk assessment + SoA** (clause 6) — the backbone of the ISMS.
3. **Adopt the policy pack** (§4 A.5/A.6) and **close P0/P1 technical gaps** (§5).
4. **Run the ISMS for a period** (evidence: access reviews, one internal audit, one management
   review, incident drills) — auditors want to see it *operating*, typically ~3 months.
5. **Stage 1 audit** (documentation review) → remediate → **Stage 2 audit** (implementation) →
   certificate. Budget ~6–12 months end-to-end for a first-timer.

**Note:** if the near-term need is to *answer customers' security questionnaires* rather than a
framed plaque, prioritizing **§5 technical P0/P1 + a short security policy + the sub-processor list**
gets you most of the practical value quickly; full certification can follow.

---

## 7. Division of labour

- **Claude (Builder) can implement:** all §5 technical items (T1–T10), extend audit logging, wire
  MFA, add CI security gates, and **draft** every policy in §4 as starting templates.
- **Company / Ali (with a consultant) owns:** ISMS scope, risk assessment + SoA, policy adoption &
  sign-off, supplier reviews/DPAs, awareness training, internal audit + management review, and the
  external certification audit.

*Peer review: Gemini (architect) complete — rulings 403/404 folded in above. Copilot review staged
in `.copilot/inbox.md`, pending the Chrome debug channel.*
