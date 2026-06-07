"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import DesignSystemPanel from "./DesignSystemPanel";
import { mergeBrandRows } from "@/lib/sections/theme";
import { updateBrandColumns } from "../actions";

interface BrandPanelProps {
  tenantId: string;
  websiteId?: string;
  reloadKey?: number;
}

export default function BrandPanel({ tenantId, websiteId, reloadKey }: BrandPanelProps) {
  const supabase = createClient();

  const [brand, setBrand] = useState({
    primaryColor: "#1e40af",
    secondaryColor: "#64748b",
    accentColor: "#f59e0b",
    fontHeading: "Inter",
    fontBody: "Inter",
    tone: "professional",
  });

  useEffect(() => {
    async function loadBrand() {
      // Multiple brand rows possible (0019 per-website); .single() throws on >1 row. Fetch
      // all + merge so colours/fonts load instead of falling back to defaults.
      // Option A: this website's exact row when scoped; else merge tenant rows.
      let data: any;
      if (websiteId) {
        const { data: row } = await supabase
          .from("website_brand_settings").select("*")
          .eq("tenant_id", tenantId).eq("website_id", websiteId).maybeSingle();
        data = row ?? {};
      } else {
        const { data: rows } = await supabase
          .from("website_brand_settings").select("*").eq("tenant_id", tenantId);
        data = mergeBrandRows(Array.isArray(rows) ? rows : []);
      }
      if (data && Object.keys(data).length)
        setBrand({
          primaryColor: data.primary_color,
          secondaryColor: data.secondary_color,
          accentColor: data.accent_color,
          fontHeading: data.font_heading,
          fontBody: data.font_body,
          tone: data.tone,
        });
    }
    loadBrand();
  }, [tenantId, websiteId, reloadKey]);

  async function saveBrand(updated: typeof brand) {
    // Server action (service client) — browser writes are RLS-blocked here.
    try {
      await updateBrandColumns(tenantId, {
        primary_color: updated.primaryColor,
        secondary_color: updated.secondaryColor,
        accent_color: updated.accentColor,
        font_heading: updated.fontHeading,
        font_body: updated.fontBody,
        tone: updated.tone,
      }, websiteId);
    } catch (e: any) {
      alert(e?.message ?? "Failed to save brand settings.");
    }
  }

  function updateField(field: string, value: string) {
    const updated = { ...brand, [field]: value };
    setBrand(updated);
    saveBrand(updated); // fire-and-forget
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Brand Settings</h2>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Primary Color</label>
        <input
          type="color"
          value={brand.primaryColor}
          onChange={(e) => updateField("primaryColor", e.target.value)}
          className="h-10 w-full border rounded"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Secondary Color</label>
        <input
          type="color"
          value={brand.secondaryColor}
          onChange={(e) => updateField("secondaryColor", e.target.value)}
          className="h-10 w-full border rounded"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Accent Color</label>
        <input
          type="color"
          value={brand.accentColor}
          onChange={(e) => updateField("accentColor", e.target.value)}
          className="h-10 w-full border rounded"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Heading Font</label>
        <input
          type="text"
          value={brand.fontHeading}
          onChange={(e) => updateField("fontHeading", e.target.value)}
          className="border rounded px-2 py-1"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Body Font</label>
        <input
          type="text"
          value={brand.fontBody}
          onChange={(e) => updateField("fontBody", e.target.value)}
          className="border rounded px-2 py-1"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Tone</label>
        <select
          value={brand.tone}
          onChange={(e) => updateField("tone", e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="professional">Professional</option>
          <option value="friendly">Friendly</option>
          <option value="luxury">Luxury</option>
          <option value="bold">Bold</option>
        </select>
      </div>

      <div className="text-xs text-gray-500">
        (Changes are saved automatically)
      </div>

      <DesignSystemPanel tenantId={tenantId} />
    </div>
  );
}
