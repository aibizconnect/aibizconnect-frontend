Ali — Claude — logged, ratified, and filed.  
This is the canonical architectural record for the Public‑Site Rebuild milestone and Gemini’s rulings.
Everything below is structured, durable, and ready to merge into the decision log and design‑integration docs.

G1 Summary — Public‑Site Rebuild Milestone (Filed)

You’ve now crossed the threshold from “Claude Design as UX reference” to a fully autonomous design→build pipeline that can rebuild the entire public site page‑by‑page with no manual pasting, no screenshots, and no human bottlenecks.

This is a major architectural milestone.

1. Autonomous Claude‑Design Pipeline (Shipped)
Pipeline Architecture

BRIEF.md = page spec + send order

DESIGN.md = system + Claude‑Design GitHub integration

design-build.mjs <Slug>

Commands Claude Design via debug‑Chrome (CDP 9222)

Waits for the served doc to settle

Switches editor to the doc

Saves the SOURCE locally

claude-design-capture.mjs <Slug>

Captures the RENDERED DOM (expanded, not templated)

Attaches to the OOPIF preview target via raw CDP

Playwright cannot see OOPIF; CDP can

Loop:  
BRIEF → command → pull source+render → native build

This is now the official ingestion loop for all public‑site pages.

2. Home Page — High‑Fidelity Rebuild

Rebuilt from the Claude Design Home page

Includes the bespoke navy AI‑concierge chat card, dashboard mock, and “Inside the platform” band

All 9 bands reproduced faithfully

Replaces the earlier generic translation

Script: build-abc-home.mjs

3. Pricing Page — Fully Built

Designed in Claude Design → pulled → rebuilt natively

4 tiers

Billing toggle

Full compare table

Power‑ups

Trust strip

FAQ accordion

CTA

All built on the shared ABC shell

4. Shared Chrome (Marketing Shell)

components/marketing/abc/Shell.tsx

AbcNav

AbcFooter

AbcPage

CtaBand

SectionHead

Primitives

Retires the old dark‑navy MarketingShell

Tokens come from .abc-ds (Claude Design system)

This ensures every page is cohesive and design‑system‑aligned.

2. Gemini Rulings — Canonical Decision Record
D‑396 — Default Tenant Custom‑Domain Flow

Ratified.

Rules:

Default = Registrar CNAME/A + Vercel TXT verify

NS‑delegation = advanced/managed option

This aligns with the domain‑switch capability built earlier

Applies to all tenants, including the platform tenant

Filed under: Domain Management Protocol.

D‑397 — Page‑by‑Page Rebuild Loop (Claude Design → Native)

Ratified.

Rules:

Ali designs each page in Claude Design

Claude pulls via relay

Claude builds the native version

Replace only after:

Visual diff vs Claude Design output

Manual confirmation by Ali

Inspector QA (layout, tokens, responsiveness)

This is the governing loop for the ~20‑page rebuild.

D‑398 — Open Items Acknowledged & Queued

Ratified.

Items:

D‑391 deeper wiring

Wizard goals → tenant_modules

Wizard style → applyBrandPreset

Genesis must recompute sitemap/sections using active BrandTokens

H‑4 monotonic + idempotent Genesis

No step regression

No double‑provision

No theme/sitemap divergence

These remain active and required.

3. Next Steps (Send Order)

Ali’s send order is now the official build sequence:

Platform → Solutions Hub

Real Estate vertical

Feature pages:

CRM

AI Builder

Websites & Funnels

Automations

Consumer Portal

Marketplace

Templates

About / Contact

Resources:

Blog

Guides

Webinars

Flip the apex switch

Capability already built

Waiting on full site parity + token alignment

Each page goes through the Claude Design → relay → capture → native build loop with visual diff + Ali confirmation.

4. Guardrail (Reaffirmed)

Ali cannot see screenshots — so the guardrail stands:

Per‑page visual diff

Ali views each page in his debug Chrome

Inspector QA

Only then does the page replace the old one

This is now part of the Design Integration Protocol.

Everything is now logged, ratified, and filed.

If you want, I can generate:

The Public‑Site Rebuild Playbook

The Claude‑Design ingestion contract

The native section mapping guide

The visual diff QA checklist

Just say the word.

Edit in a page