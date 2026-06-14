import type { Metadata } from "next";
import Link from "next/link";
import { listPosts, getBlogBrand } from "@/lib/server/blog";

export async function generateMetadata({ params }: { params: Promise<{ tenantId: string }> }): Promise<Metadata> {
  const { tenantId } = await params;
  const brand = await getBlogBrand(tenantId).catch(() => ({ businessName: "Blog", accent: "#1e3a8a" }));
  return { title: `Blog — ${brand.businessName}`, description: `Latest articles from ${brand.businessName}.` };
}

/** Public blog index — brand-themed, published posts only. */
export default async function PublicBlogIndex({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const [posts, brand] = await Promise.all([
    listPosts(tenantId, { publishedOnly: true }).catch(() => []),
    getBlogBrand(tenantId).catch(() => ({ businessName: "Blog", accent: "#1e3a8a" })),
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white" style={{ borderTopColor: brand.accent, borderTopWidth: 3 }}>
        <div className="mx-auto max-w-3xl px-6 py-8">
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: brand.accent }}>{brand.businessName}</div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Blog</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        {posts.length === 0 ? (
          <p className="py-16 text-center text-slate-400">No posts yet — check back soon.</p>
        ) : (
          <div className="space-y-8">
            {posts.map((p) => (
              <article key={p.id} className="border-b border-slate-200 pb-8 last:border-0">
                <Link href={`/sites/${tenantId}/blog/${p.slug}`} className="group block">
                  {p.coverImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.coverImageUrl} alt="" className="mb-4 aspect-[16/9] w-full rounded-xl object-cover" />
                  )}
                  <h2 className="text-2xl font-semibold text-slate-900 group-hover:opacity-80">{p.title}</h2>
                  {p.publishedAt && <div className="mt-1 text-xs text-slate-400">{new Date(p.publishedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</div>}
                  {p.excerpt && <p className="mt-2 text-slate-600">{p.excerpt}</p>}
                  <span className="mt-3 inline-block text-sm font-medium" style={{ color: brand.accent }}>Read more →</span>
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
