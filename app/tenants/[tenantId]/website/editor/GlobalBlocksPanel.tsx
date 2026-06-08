"use client";

import { useEffect, useState } from "react";
import {
  listGlobalBlocks,
  createGlobalBlock,
  updateGlobalBlock,
  publishGlobalBlock,
  attachBlockToPage,
  type GlobalBlock,
} from "../actions";
import {
  sectionTypes,
  sectionLabels,
  defaultContentFor,
  type SectionType,
} from "@/lib/sections/schemas";
import SectionEditor from "./SectionEditor";

interface GlobalBlocksPanelProps {
  tenantId: string;
  selectedPageId: string | null;
  websiteId?: string | null;
  onChanged?: () => void;
}

export default function GlobalBlocksPanel({
  tenantId,
  selectedPageId,
  websiteId,
  onChanged,
}: GlobalBlocksPanelProps) {
  const [blocks, setBlocks] = useState<GlobalBlock[]>([]);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<SectionType>("hero");
  const [editingId, setEditingId] = useState<string | null>(null);

  async function refresh() {
    setBlocks(await listGlobalBlocks(tenantId, websiteId));
  }
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, websiteId]);

  async function handleCreate() {
    if (!newName.trim()) return;
    await createGlobalBlock(
      tenantId,
      newName.trim(),
      newType,
      defaultContentFor(newType)
    );
    setNewName("");
    refresh();
  }

  async function handleAttach(blockId: string) {
    if (!selectedPageId) {
      alert("Select a page first.");
      return;
    }
    await attachBlockToPage(selectedPageId, tenantId, blockId);
    onChanged?.();
  }

  async function handlePublish(blockId: string) {
    try {
      await publishGlobalBlock(tenantId, blockId);
      await refresh();
      onChanged?.();
    } catch (e: any) {
      alert(e?.message ?? "Failed to publish block.");
    }
  }

  function blockContent(b: GlobalBlock) {
    return b.draft_content ?? b.content;
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Global Blocks</h2>

      <div className="flex flex-col gap-2 rounded border border-gray-200 p-3">
        <span className="text-xs font-semibold uppercase text-gray-500">
          Create block
        </span>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Block name (e.g. Site Footer)"
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value as SectionType)}
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        >
          {sectionTypes.map((t) => (
            <option key={t} value={t}>
              {sectionLabels[t]}
            </option>
          ))}
        </select>
        <button
          onClick={handleCreate}
          className="self-start rounded bg-blue-600 px-3 py-1 text-sm text-white"
        >
          Create Block
        </button>
      </div>

      {blocks.length === 0 && (
        <div className="text-sm text-gray-500">No global blocks yet.</div>
      )}

      {blocks.map((b) => (
        <div key={b.id} className="rounded border border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <div className="font-medium">
              {b.name}{" "}
              <span className="rounded bg-indigo-100 px-1 text-[10px] uppercase text-indigo-700">
                {b.type}
              </span>
              {b.draft_content && (
                <span className="ml-1 text-[10px] text-amber-600">• draft</span>
              )}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            <button
              onClick={() => handleAttach(b.id)}
              disabled={!selectedPageId}
              className="text-green-700 hover:underline disabled:opacity-40"
            >
              Insert into page
            </button>
            <button
              onClick={() => setEditingId(editingId === b.id ? null : b.id)}
              className="text-blue-600 hover:underline"
            >
              {editingId === b.id ? "Close" : "Edit"}
            </button>
            {b.draft_content && (
              <button
                onClick={() => handlePublish(b.id)}
                className="text-purple-700 hover:underline"
              >
                Publish Block
              </button>
            )}
          </div>

          {editingId === b.id && (
            <div className="mt-3 border-t pt-3">
              <SectionEditor
                key={b.id}
                section={blockContent(b)}
                tenantId={tenantId}
                onUpdate={(updated) => {
                  setBlocks((prev) =>
                    prev.map((x) =>
                      x.id === b.id ? { ...x, draft_content: updated } : x
                    )
                  );
                  updateGlobalBlock(tenantId, b.id, { draft_content: updated });
                }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
