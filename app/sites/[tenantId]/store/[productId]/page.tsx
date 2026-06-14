import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStoreConfig, getStoreProduct } from "@/lib/server/store";
import { getBlogBrand } from "@/lib/server/blog";
import BuyButton from "@/components/store/BuyButton";

const price = (n: number, ccy: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: ccy || "USD" }).format(n);

export async function generateMetadata({ params }: { params: Promise<{ tenantId: string; productId: string }> }): Promise<Metadata> {
  const { tenantId, productId } = await params;
  const p = await getStoreProduct(tenantId, productId).catch(() => null);
  return p ? { title: p.name, description: p.description || undefined, openGraph: { title: p.name, images: p.imageUrl ? [p.imageUrl] : undefined } } : { title: "Product" };
}

/** Public product detail + buy (D-350). */
export default async function ProductPage({ params }: { params: Promise<{ tenantId: string; productId: string }> }) {
  const { tenantId, productId } = await params;
  const [cfg, product, brand] = await Promise.all([
    getStoreConfig(tenantId).catch(() => ({ enabled: false, title: "Shop" })),
    getStoreProduct(tenantId, productId).catch(() => null),
    getBlogBrand(tenantId).catch(() => ({ businessName: "Shop", accent: "#1e3a8a" })),
  ]);
  if (!cfg.enabled || !product || !product.isActive) notFound();

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <Link href={`/sites/${tenantId}/store`} className="text-sm font-medium" style={{ color: brand.accent }}>← {cfg.title}</Link>
        <div className="mt-6 grid gap-8 sm:grid-cols-2">
          <div>
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.imageUrl} alt={product.name} className="aspect-square w-full rounded-2xl object-cover" />
            ) : <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-slate-100 text-6xl text-slate-300">🛍️</div>}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{product.name}</h1>
            <div className="mt-2 text-2xl font-semibold" style={{ color: brand.accent }}>{price(product.price, product.currency)}</div>
            {product.description && <p className="mt-4 whitespace-pre-wrap text-slate-600">{product.description}</p>}
            <div className="mt-6">
              <BuyButton tenantId={tenantId} productId={product.id} label={`Buy — ${price(product.price, product.currency)}`} accent={brand.accent} />
            </div>
            <p className="mt-3 text-xs text-slate-400">Secure checkout by Stripe. You&apos;ll get a receipt by email.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
