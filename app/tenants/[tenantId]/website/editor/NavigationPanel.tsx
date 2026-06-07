"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  listMenus,
  getMenu,
  createNavItem,
  updateNavItemDraft,
  publishNavItem,
  reorderMenuItems,
  deleteNavItem,
  type MenuItem,
} from "../actions";

interface NavigationPanelProps {
  tenantId: string;
  reloadKey?: number;
}

export default function NavigationPanel({ tenantId }: NavigationPanelProps) {
  const supabase = createClient();
  const [menus, setMenus] = useState<string[]>(["primary", "footer"]);
  const [menuKey, setMenuKey] = useState("primary");
  const [items, setItems] = useState<MenuItem[]>([]);
  const [pages, setPages] = useState<{ id: string; title: string }[]>([]);

  async function refresh() {
    setItems(await getMenu(tenantId, menuKey, true));
  }

  useEffect(() => {
    listMenus(tenantId).then(setMenus);
    supabase
      .from("website_pages")
      .select("id, title")
      .eq("tenant_id", tenantId)
      .order("order_index")
      .then(({ data }) => data && setPages(data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, menuKey]);

  function patchLocal(id: string, patch: Partial<MenuItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  async function addItem() {
    if (pages[0]) await createNavItem(tenantId, menuKey, "internal", pages[0].id);
    else await createNavItem(tenantId, menuKey, "external", "");
    refresh();
  }

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    await reorderMenuItems(tenantId, menuKey, next.map((i) => i.id));
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Navigation</h2>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Menu</span>
        <select
          value={menuKey}
          onChange={(e) => setMenuKey(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1"
        >
          {menus.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>

      <button
        onClick={addItem}
        className="self-start rounded bg-blue-600 px-3 py-1 text-sm text-white"
      >
        + Add item
      </button>

      {items.length === 0 && (
        <div className="text-sm text-gray-500">No items in this menu.</div>
      )}

      {items.map((item, index) => {
        const mode: "internal" | "external" = item.page_id ? "internal" : "external";
        return (
          <div key={item.id} className="flex flex-col gap-2 rounded border border-gray-200 p-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-gray-500">
                Item {index + 1}
                {item.hasDraft && (
                  <span className="ml-1 text-amber-600">• draft</span>
                )}
              </span>
              <div className="flex items-center gap-2 text-xs">
                <button disabled={index === 0} onClick={() => move(index, -1)} className="disabled:opacity-30">▲</button>
                <button disabled={index === items.length - 1} onClick={() => move(index, 1)} className="disabled:opacity-30">▼</button>
                <button
                  onClick={async () => {
                    await publishNavItem(tenantId, item.id);
                    refresh();
                  }}
                  className="text-purple-700 hover:underline"
                >
                  Publish
                </button>
                <button
                  onClick={async () => {
                    await deleteNavItem(item.id, tenantId);
                    refresh();
                  }}
                  className="text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>

            <input
              type="text"
              value={item.label}
              onChange={(e) => patchLocal(item.id, { label: e.target.value })}
              onBlur={() => updateNavItemDraft(tenantId, item.id, { draft_label: item.label })}
              placeholder="Label"
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            />

            <select
              value={mode}
              onChange={(e) => {
                if (e.target.value === "internal") {
                  const pid = pages[0]?.id ?? null;
                  patchLocal(item.id, { page_id: pid, url: null });
                  updateNavItemDraft(tenantId, item.id, { draft_page_id: pid, draft_url: null });
                } else {
                  patchLocal(item.id, { page_id: null, url: "" });
                  updateNavItemDraft(tenantId, item.id, { draft_url: "", draft_page_id: null });
                }
              }}
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            >
              <option value="internal">Internal page</option>
              <option value="external">External URL</option>
            </select>

            {mode === "internal" ? (
              <select
                value={item.page_id ?? ""}
                onChange={(e) => {
                  patchLocal(item.id, { page_id: e.target.value, url: null });
                  updateNavItemDraft(tenantId, item.id, { draft_page_id: e.target.value, draft_url: null });
                }}
                className="rounded border border-gray-300 px-2 py-1 text-sm"
              >
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={item.url ?? ""}
                onChange={(e) => patchLocal(item.id, { url: e.target.value })}
                onBlur={() => updateNavItemDraft(tenantId, item.id, { draft_url: item.url })}
                placeholder="https://…"
                className="rounded border border-gray-300 px-2 py-1 text-sm"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
