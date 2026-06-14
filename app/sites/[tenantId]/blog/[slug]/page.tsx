import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug, getBlogBrand } from "@/lib/server/blog";

export async function generateMetadata({ params }: { params: Promise<{ tenantId: string; slug: string }> }): Promise<Metadata> {
  const { tenantId, slug } = await params;
  const post = await getPostBySlug(tenantId, slug, { publishedOnly: true }).catch(() => null);
  if (!post) return { title: "Not found" };
  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt || undefined;
  return {
    title, description,
    openGraph: { title, description, type: "article", images: post.coverImageUrl ? [post.coverImageUrl] : undefined, publishedTime: post.publishedAt ?? undefined },
    twitter: { card: post.coverImageUrl ? "summary_large_image" : "summary", title, description },
  };
}

/** Public blog post — brand-themed, SEO meta + Article JSON-LD (GEO). Published only. */
export default async function PublicBlogPost({ params }: { params: Promise<{ tenantId: string; slug: string }> }) {
  const { tenantId, slug } = await params;
  const [post, brand] = await Promise.all([
    getPostBySlug(tenantId, slug, { publishedOnly: true }).catch(() => null),
    getBlogBrand(tenantId).catch(() => ({ businessName: "Blog", accent: "#1e3a8a" })),
  ]);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org", "@type": "BlogPosting",
    headline: post.title,
    description: post.seoDescription || post.excerpt || undefined,
    image: post.coverImageUrl || undefined,
    datePublished: post.publishedAt || undefined,
    dateModified: post.updatedAt || undefined,
    author: post.author ? { "@type": "Person", name: post.author } : { "@type": "Organization", name: brand.businessName },
    publisher: { "@type": "Organization", name: brand.businessName },
    keywords: post.tags.join(", ") || undefined,
  };

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link href={`/sites/${tenantId}/blog`} className="text-sm font-medium" style={{ color: brand.accent }}>← {brand.businessName} Blog</Link>
        <article className="mt-6">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">{post.title}</h1>
          <div className="mt-2 text-sm text-slate-400">
            {post.author && <span>{post.author} · </span>}
            {post.publishedAt && new Date(post.publishedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          </div>
          {post.coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.coverImageUrl} alt="" className="mt-6 aspect-[16/9] w-full rounded-xl object-cover" />
          )}
          {post.excerpt && <p className="mt-6 text-lg text-slate-600">{post.excerpt}</p>}
          <div className="mt-6 space-y-4">
            {post.body.split(/\n{2,}/).map((para, i) => (
              <p key={i} className="text-[17px] leading-8 text-slate-800">{para.split("\n").map((l, j) => <span key={j}>{l}<br /></span>)}</p>
            ))}
          </div>
          {post.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2 border-t border-slate-100 pt-6">
              {post.tags.map((t) => <span key={t} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">{t}</span>)}
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
