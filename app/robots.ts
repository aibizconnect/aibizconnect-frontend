import type { MetadataRoute } from "next";

/**
 * Root robots for aibizconnect.app. Explicitly WELCOMES AI crawlers (GPTBot, ClaudeBot,
 * PerplexityBot, Google-Extended, …) — the SEO+GEO report flags blocked AI bots as a top hidden
 * GEO killer. App/admin/API paths are disallowed so only the public marketing site is indexed.
 * (Tenant sites serve their own robots from app/sites/[tenantId]/robots.txt.)
 */
const APP_PATHS = ["/api/", "/tenants/", "/platform/", "/onboarding", "/auth/", "/login", "/sites/"];
const AI_BOTS = [
  "GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-Web", "anthropic-ai",
  "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Amazonbot", "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: APP_PATHS },
      { userAgent: AI_BOTS, allow: "/", disallow: APP_PATHS },
    ],
    sitemap: "https://aibizconnect.app/sitemap.xml",
    host: "https://aibizconnect.app",
  };
}
