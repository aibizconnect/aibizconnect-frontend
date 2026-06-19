// Per-tenant robots.txt. Welcomes AI crawlers (GEO) explicitly — a blocked AI bot is a top hidden
// GEO killer — and points at the tenant's sitemap. Served on the tenant's own domain via middleware.
const AI_BOTS = [
  "GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-Web", "anthropic-ai",
  "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Amazonbot", "CCBot",
];

export async function GET(req: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  await params; // Next 15: params is async
  const origin = new URL(req.url).origin;
  const lines: string[] = ["User-agent: *", "Allow: /", ""];
  for (const bot of AI_BOTS) lines.push(`User-agent: ${bot}`, "Allow: /", "");
  lines.push(`Sitemap: ${origin}/sitemap.xml`, "");
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
