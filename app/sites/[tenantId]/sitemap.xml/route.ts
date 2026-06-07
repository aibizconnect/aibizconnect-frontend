import { createSupabaseServerClient } from "@/lib/supabase/server";

// Step 33: per-tenant sitemap. Multi-tenant app -> sitemap lives under the
// tenant's public site root rather than a single global /sitemap.xml.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const origin = new URL(req.url).origin;
  const supabase = await createSupabaseServerClient();

  const { data: pages } = await supabase
    .from("website_pages")
    .select("slug, is_home, published_at, created_at")
    .eq("tenant_id", tenantId)
    .eq("is_public", true);

  const urls = (pages ?? [])
    .map((p: any) => {
      const loc = `${origin}/sites/${tenantId}/${p.slug}`;
      const lastmod = (p.published_at ?? p.created_at ?? "").slice(0, 10);
      const priority = p.is_home ? "0.8" : "0.5";
      return [
        "  <url>",
        `    <loc>${loc}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
        "    <changefreq>weekly</changefreq>",
        `    <priority>${priority}</priority>`,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls +
    "\n</urlset>\n";

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
