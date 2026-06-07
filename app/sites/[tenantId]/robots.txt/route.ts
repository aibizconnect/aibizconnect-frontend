// Step 33: per-tenant robots.txt, pointing at the tenant's sitemap.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const origin = new URL(req.url).origin;
  const body = [
    "User-agent: *",
    "Allow: /",
    `Sitemap: ${origin}/sites/${tenantId}/sitemap.xml`,
    "",
  ].join("\n");
  return new Response(body, {
    headers: { "Content-Type": "text/plain" },
  });
}
