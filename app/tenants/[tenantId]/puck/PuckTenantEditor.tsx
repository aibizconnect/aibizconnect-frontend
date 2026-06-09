"use client";

import { useEffect, useState } from "react";
import { Puck, type Data } from "@measured/puck";
import "@measured/puck/puck.css";
import { config, initialData } from "@/app/puck-demo/puck.config";
import { MediaContext } from "@/app/puck-demo/media-context";
import { loadPuckPage, savePuckPage } from "./actions";
import { listMedia } from "../website/actions";

/**
 * Tenant-scoped Puck editor — the real thing: loads/saves the page JSON to the backend
 * (website_puck_pages) and feeds the image picker the tenant's actual Media Library.
 */
export default function PuckTenantEditor({ tenantId, slug = "home" }: { tenantId: string; slug?: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [media, setMedia] = useState<string[]>([]);
  const [status, setStatus] = useState<"" | "saving" | "saved" | "error">("");

  useEffect(() => {
    const id = "puck-fonts";
    if (!document.getElementById(id)) {
      const l = document.createElement("link"); l.id = id; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Inter:wght@300;400;500;600;700&family=Montserrat:wght@500;600;700;800&family=Poppins:wght@300;400;500;600&family=Manrope:wght@400;500;600;700&display=swap";
      document.head.appendChild(l);
    }
    (async () => {
      try { const d = await loadPuckPage(tenantId, slug); setData((d ?? initialData) as unknown as Data); }
      catch { setData(initialData as unknown as Data); }
      try {
        const items = await listMedia(tenantId);
        const urls = (items || []).filter((m: any) => /^image\//.test(m.mime_type || "")).map((m: any) => m.url).filter(Boolean).slice(0, 80);
        setMedia(urls);
      } catch { /* picker falls back to presets */ }
    })();
  }, [tenantId, slug]);

  if (!data) return <div style={{ padding: 40, fontFamily: "Inter, sans-serif" }}>Loading editor…</div>;

  return (
    <MediaContext.Provider value={media}>
      <Puck
        config={config}
        data={data}
        onChange={(d) => setData(d)}
        onPublish={async (d) => {
          setStatus("saving");
          const r = await savePuckPage(tenantId, slug, d);
          setStatus(r.ok ? "saved" : "error");
          setData(d);
          if (!r.ok) console.error("Puck save failed:", r.error);
        }}
        headerTitle={`Website builder${status ? ` — ${status}` : ""}`}
      />
    </MediaContext.Provider>
  );
}
