import Link from "next/link";
import BlogManager from "@/components/blog/BlogManager";

/** Sites → Blogs admin (D-345). */
export default async function BlogAdminPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-1 flex items-center gap-2 text-sm">
        <Link href={`/tenants/${tenantId}/sites`} className="text-slate-400 hover:text-slate-700">Sites</Link>
        <span className="text-slate-300">/</span><span className="text-slate-600">Blogs</span>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Blog</h1>
      <p className="mb-5 text-sm text-slate-500">Write SEO-optimized posts your customers (and AI search) can find. Drafts stay private until you publish.</p>
      <BlogManager tenantId={tenantId} />
    </div>
  );
}
