"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { updatePageSettings, saveDraft, type PageSettings } from "../actions";
import { notifyError } from "@/lib/ui/dialogs";

interface SettingsPanelProps {
  tenantId: string;
  selectedPageId: string | null;
  onChanged?: () => void;
}

export default function SettingsPanel({
  tenantId,
  selectedPageId,
  onChanged,
}: SettingsPanelProps) {
  const supabase = createClient();
  const [slug, setSlug] = useState("");
  const [isHidden, setIsHidden] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState("");

  useEffect(() => {
    async function load() {
      if (!selectedPageId) return;
      const { data } = await supabase
        .from("website_pages")
        .select("slug, draft_slug, is_hidden, redirect_url")
        .eq("tenant_id", tenantId)
        .eq("id", selectedPageId)
        .single();
      if (data) {
        setSlug(data.draft_slug ?? data.slug ?? "");
        setIsHidden(Boolean(data.is_hidden));
        setRedirectUrl(data.redirect_url ?? "");
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, selectedPageId]);

  if (!selectedPageId) {
    return (
      <div className="text-sm text-gray-500">
        Select a page to edit its settings.
      </div>
    );
  }

  // is_hidden / redirect_url are live page settings (immediate).
  async function save(patch: PageSettings) {
    try {
      await updatePageSettings(selectedPageId!, tenantId, patch);
      onChanged?.();
    } catch (e: any) {
      notifyError(e?.message ?? "Failed to save settings.");
    }
  }

  // Slug is a DRAFT field (Step 28) — applied to the live slug on Publish.
  async function saveSlugDraft() {
    try {
      await saveDraft(selectedPageId!, tenantId, { draft_slug: slug });
    } catch (e: any) {
      notifyError(e?.message ?? "Failed to save slug.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Settings</h2>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Slug</span>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          onBlur={saveSlugDraft}
          placeholder="about-us"
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <span className="text-xs text-gray-400">
          lowercase letters, numbers and hyphens — applied on Publish
        </span>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isHidden}
          onChange={(e) => {
            const v = e.target.checked;
            setIsHidden(v);
            save({ is_hidden: v });
          }}
        />
        Hide from navigation
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Redirect URL</span>
        <input
          type="text"
          value={redirectUrl}
          onChange={(e) => setRedirectUrl(e.target.value)}
          onBlur={() => save({ redirect_url: redirectUrl })}
          placeholder="https://… (leave empty for no redirect)"
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <span className="text-xs text-gray-400">
          If set, the public page 302-redirects here.
        </span>
      </label>
    </div>
  );
}
