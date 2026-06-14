import type { Metadata } from "next";
import Link from "next/link";
import { getStoreConfig, listStoreProducts } from "@/lib/server/store";
import { getBlogBrand } from "@/lib/server/blog";

export async function generateMetadata({ params }: { params: Promise<{ tenantId: string }> }): Promise<Metadata> {
  const { tenantId } = await params;
  const [cfg, brand] = await Promise.all([getStoreConfig(tenantId).catch(() => ({ enabled: false, title: "Shop" })), getBlogBrand(tenantId).catch(() => ({ businessName: "Shop", accent: "#1e3a8a" }))]);
  return { title: `${cfg.title} — ${brand.businessName}` };
}

const price = (n: number, ccy: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: ccy || "USD" }).format(n);

/** Public storefront (D-350). */
export default async function StorePage({ params, searchParams }: { params: Promise<{ tenantId: string }>; searchParams: Promise<{ thanks?: string }> }) {
  const { tenantId } = await params;
  const { thanks } = await searchParams;
  const [cfg, products, brand] = await Promise.all([
    getStoreConfig(tenantId).catch(() => ({ enabled: false, title: "Shop" })),
    listStoreProducts(tenantId).catch(() => []),
    getBlogBrand(tenantId).catch(() => ({ businessName: "Shop", accent: "#1e3a8a" })),
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white" style={{ borderTopColor: brand.accent, borderTopWidth: 3 }}>
        <div className="mx-auto max-w-4xl px-6 py-8">
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: brand.accent }}>{brand.businessName}</div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{cfg.title}</h1>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">
        {thanks && <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Thank you! Your order is confirmed — a receipt is on its way to your email.</div>}
        {!cfg.enabled ? (
          <p className="py-16 text-center text-slate-400">This store isn&apos;t open yet — check back soon.</p>
        ) : products.length === 0 ? (
          <p className="py-16 text-center text-slate-400">No products yet.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <Link key={p.id} href={`/sites/${tenantId}/store/${p.id}`} className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:shadow">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.name} className="aspect-square w-full object-cover" />
                ) : <div className="flex aspect-square w-full items-center justify-center bg-slate-100 text-4xl text-slate-300">🛍️</div>}
                <div className="p-4">
                  <div className="font-medium text-slate-900 group-hover:opacity-80">{p.name}</div>
                  <div className="mt-1 font-semibold" style={{ color: brand.accent }}>{price(p.price, p.currency)}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
