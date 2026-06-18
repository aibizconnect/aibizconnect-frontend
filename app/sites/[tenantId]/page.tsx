import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Bare public-site entry: /sites/{tenantId} → redirect to the tenant's home page.
 * Without this, the raw path 404s and only /sites/{tenantId}/{slug} works. Picks the
 * is_home page first, then a "home" slug, then the lowest-ordered page. Preserves
 * ?preview=1 so draft previews resolve the same way. (Tenant-host root already maps
 * to /home in middleware; this covers the direct path used as a demo fallback.)
 */
interface Props {
  params: Promise<{ tenantId: string }>;
  searchParams?: Promise<{ preview?: string }>;
}

export default async function PublicSiteRoot({ params, searchParams }: Props) {
  const { tenantId } = await params;
  const isPreview = ((await searchParams)?.preview) === "1" || ((await searchParams)?.preview) === "true";
  const sb = await createSupabaseServerClient();

  const { data: pages } = await sb
    .from("website_pages")
    .select("slug, is_home, is_public, order_index")
    .eq("tenant_id", tenantId)
    .order("order_index", { ascending: true });

  type PageRow = { slug: string | null; is_home: boolean | null; is_public: boolean | null; order_index: number | null };
  const candidates = ((pages ?? []) as PageRow[]).filter((p) => isPreview || p.is_public);
  const home =
    candidates.find((p) => p.is_home) ??
    candidates.find((p) => p.slug === "home") ??
    candidates[0];

  if (!home?.slug) notFound();
  redirect(`/sites/${tenantId}/${home.slug}${isPreview ? "?preview=1" : ""}`);
}
