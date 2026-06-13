import Link from "next/link";

/** Shared shell for the public legal pages (privacy / terms / data-deletion). Clean, readable,
 *  self-contained — these are the URLs Meta App Review + other integrations require. */
export default function LegalShell({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight text-[#1e3a8a]">AIBizConnect</Link>
          <nav className="flex gap-4 text-sm text-slate-500">
            <Link href="/privacy" className="hover:text-slate-800">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-800">Terms</Link>
            <Link href="/data-deletion" className="hover:text-slate-800">Data deletion</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-400">Last updated: {updated}</p>
        <div className="legal mt-8 space-y-6 text-[15px] leading-relaxed text-slate-700">{children}</div>
        <p className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-400">
          Questions? Email <a className="text-[#1e3a8a] hover:underline" href="mailto:admin@aibizconnect.app">admin@aibizconnect.app</a>.
        </p>
      </main>
    </div>
  );
}

/** Small heading used inside legal pages. */
export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="pt-4 text-lg font-semibold text-slate-900">{children}</h2>;
}
