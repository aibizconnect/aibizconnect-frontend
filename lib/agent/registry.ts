import type { Domain } from "./v1-format";

/**
 * Agent Mesh registry (Phase 2/3). Single source of truth for which agents exist,
 * their domain, and whether they're live. website.* are live; the rest are
 * registered as stubs (their domain executor returns Execution BLOCKED until built).
 */

export interface AgentEntry {
  role: string;
  domain: Domain;
  label: string;
  systemPromptRef: string;
  status: "live" | "stub";
  capability: "build" | "analyze";
}

export const AGENTS: AgentEntry[] = [
  // Core website (live)
  { role: "website.editor", domain: "website", label: "Website Editor", systemPromptRef: "website.editor", status: "live", capability: "build" },
  { role: "website.brand", domain: "website", label: "Brand Agent", systemPromptRef: "website.brand", status: "live", capability: "build" },
  { role: "website.content", domain: "website", label: "Content Agent", systemPromptRef: "website.content", status: "live", capability: "build" },
  { role: "website.seo", domain: "website", label: "SEO Agent", systemPromptRef: "website.seo", status: "live", capability: "build" },
  { role: "website.nav", domain: "website", label: "Navigation Agent", systemPromptRef: "website.nav", status: "live", capability: "build" },
  // Social (stub)
  { role: "social.creator", domain: "social", label: "Social Creator", systemPromptRef: "social.creator", status: "stub", capability: "build" },
  { role: "social.analysis", domain: "social", label: "Social Analysis", systemPromptRef: "social.analysis", status: "stub", capability: "analyze" },
  // Email (stub)
  { role: "email.creator", domain: "email", label: "Email Creator", systemPromptRef: "email.creator", status: "stub", capability: "build" },
  { role: "email.analysis", domain: "email", label: "Email Analysis", systemPromptRef: "email.analysis", status: "stub", capability: "analyze" },
  // Ads (stub)
  { role: "ads.meta", domain: "ads", label: "Meta Ads", systemPromptRef: "ads.meta", status: "stub", capability: "build" },
  { role: "ads.google", domain: "ads", label: "Google Ads", systemPromptRef: "ads.google", status: "stub", capability: "build" },
  { role: "ads.linkedin", domain: "ads", label: "LinkedIn Ads", systemPromptRef: "ads.linkedin", status: "stub", capability: "build" },
  { role: "ads.nextdoor", domain: "ads", label: "Nextdoor Ads", systemPromptRef: "ads.nextdoor", status: "stub", capability: "build" },
  { role: "ads.analysis", domain: "ads", label: "Ads Analysis", systemPromptRef: "ads.analysis", status: "stub", capability: "analyze" },
  // Conversational (stub)
  { role: "chatbot.web", domain: "chatbot", label: "Website Chatbot", systemPromptRef: "chatbot.web", status: "stub", capability: "build" },
  { role: "chatbot.analytics", domain: "chatbot", label: "Chatbot Analytics", systemPromptRef: "chatbot.analytics", status: "stub", capability: "analyze" },
  { role: "voice.inbound", domain: "voice", label: "Inbound Voice", systemPromptRef: "voice.inbound", status: "stub", capability: "build" },
  { role: "voice.outbound", domain: "voice", label: "Outbound Voice", systemPromptRef: "voice.outbound", status: "stub", capability: "build" },
];

export const getAgent = (role: string): AgentEntry | null => AGENTS.find((a) => a.role === role) ?? null;
export const listAgents = () => AGENTS.map(({ role, domain, label, status, capability }) => ({ role, domain, label, status, capability }));

/**
 * Per-role system prompt nuance layered on top of the base Builder prompt.
 * website.* roles all emit the v1.0 website schema but with a role lens.
 */
export const ROLE_PROMPTS: Record<string, string> = {
  "website.editor": "Focus: build/edit pages, sections, blocks, and navigation to satisfy the goal.",
  "website.brand": "Focus: brand consistency — hero/cta styling, tone, and a cohesive look. Prefer a strong hero + clear CTA.",
  "website.content": "Focus: high-quality copy — compelling headings, subheadings, and CTA labels. Concise, benefit-led.",
  "website.seo": "Focus: SEO-aware structure — clear H1 hero, descriptive headings, scannable features, a strong CTA.",
  "website.nav": "Focus: information architecture — sensible pages and a clean primary navigation.",
};
