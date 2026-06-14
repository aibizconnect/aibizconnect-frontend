import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listMunicipalities } from "@/lib/server/idx/store";
import { getFeed } from "@/lib/server/idx/feeds";
import { getBlogBrand } from "@/lib/server/blog";

export async function generateMetadata({ params }: { params: Promise<{ tenantId: string }> }): Promise<Metadata> {
  const { tenantId } = await params;
  const brand = await getBlogBrand(tenantId).catch(() => ({ businessName: "Listings", accent: "#1e3a8a" }));
  return { title: `Homes for sale by city & community — ${brand.businessName}`, description: `Browse homes for sale across every city and community, with up-to-date MLS® listings from ${brand.businessName}.` };
}

/** Area index — municipalities (G4 community search, municipality→community). */
export default async function AreasIndex({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const feed = await getFeed(tenantId).catch(() => null);
  if (feed?.status !== "active") notFound();
  const [munis, brand] = await Promise.all([listMunicipalities(tenantId), getBlogBrand(tenantId).catch(() => ({ businessName: "Listings", accent: "#1e3a8a" }))]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white" style={{ borderTopColor: brand.accent, borderTopWidth: 3 }}>
        <div className="mx-auto max-w-5xl px-6 py-8">
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: brand.accent }}>{brand.businessName}</div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Homes for sale by city</h1>
          <p className="mt-1 text-slate-500">Pick a city, then drill into its communities.</p>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        {munis.length === 0 ? <p className="py-16 text-center text-slate-400">Listings are loading — check back shortly.</p> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {munis.map((m) => (
              <Link key={m.slug} href={`/sites/${tenantId}/areas/${m.slug}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-400 hover:shadow-sm">
                <span className="font-medium text-slate-800">{m.name}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{m.count}</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
