import type { Metadata } from "next";
import { getWidgetByKey } from "@/lib/server/occasion-widget";
import WidgetOccasionsEditor from "./WidgetOccasionsEditor";

/** Public Occasions Widget configurator — the embed key (?k=) is the capability. */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Manage your Occasions — AIBizConnect", robots: { index: false } };

const APP_BASE = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.aibizconnect.app").replace(/\/+$/, "");

export default async function ManageOccasionsPage({ searchParams }: { searchParams: Promise<{ k?: string }> }) {
  const { k } = await searchParams;
  const widget = k ? await getWidgetByKey(k).catch(() => null) : null;

  if (!widget) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-6">
        <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">
          <h1 className="text-lg font-semibold">Link not found</h1>
          <p className="mt-2 text-sm">This management link is invalid or expired. Re-open it from your welcome email, or register your website first.</p>
        </div>
      </main>
    );
  }

  const snippet = `<script src="${APP_BASE}/api/occasions-widget/embed?k=${widget.key}" async></script>`;
  return <WidgetOccasionsEditor widgetKey={widget.key} domain={widget.domain} snippet={snippet} initial={widget.occasions} />;
}
