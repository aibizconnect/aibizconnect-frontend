# Community + Education — Spec (Copilot authoritative, ratified)

Date: 2026-06-01. Copilot split the GHL "Memberships" concept into TWO clean subsystems
(positioning AIBizConnect as "AI-native Circle.so + Kajabi + GHL in one").

## 1. AIBizConnect COMMUNITY — *platform-level* corporate support ecosystem
NOT the tenant's membership area. This is OUR support + documentation + corporate
community, replacing GHL's noisy community with something clean, structured, professional.

Purpose: help users learn the platform; manuals/how-tos/troubleshooting; a forum for Q&A;
corporate chatrooms for announcements/updates; a searchable knowledge base; AI-assisted
help inside every article.

Modules:
1. **Support Center** — categories, articles, manuals, how-tos, troubleshooting guides,
   search, and an **AI assistant inside each article** ("Explain this", "Show me how",
   "Give me an example").
2. **Forum** — categories (Websites, Funnels, CRM, Automation, Calendars, Reputation,
   Reporting), threads, replies, moderation tools, tags. Clean minimal UI (no social feed).
3. **Corporate Chatrooms** — announcements, release notes, roadmap, "Ask the Team",
   read-only official channels, optional discussion channels.
4. **User Manuals** — structured docs, step-by-step guides, screenshots + diagrams,
   AI-generated summaries.

Design principles: clean, quiet, structured, professional (anti-noise).

## 2. AIBizConnect EDUCATION MODULE — *tenant-level* LMS (Circle.so-style course hub)
This IS the tenant's membership/education product. A clean, structured, AI-powered LMS —
NOT a forum/chatroom/social feed.

Capabilities:
- **AI course builder** (one-click outline + lessons) — BUILT.
- **Lessons** (rich content, ordered) — BUILT.
- **Member hub** (public course/lesson viewer) — BUILT.
- **Progress tracking** (per-member lesson completion) — TODO.
- **Drip scheduling** (release lessons over time) — TODO.
- **AI study assistant** (per-course Q&A / explain / quiz) — TODO.
- Members sourced from Contacts (no separate forum).

## Build status & plan
- Education Module v1 (courses + lessons + AI generate + public viewer) = BUILT this
  session; pending: run QUEUED_memberships.sql + wire sidebar "Memberships" → route.
- Next on Education: progress tracking, drip, AI study assistant.
- Community = a NEW platform-level subsystem (Support Center + Forum + Chatrooms +
  Manuals + AI-in-article). Separate DDL; lives at the platform/app level (not per-tenant
  workspace). To be built after Education is finished.
