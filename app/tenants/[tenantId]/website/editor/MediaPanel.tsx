"use client";

import { useEffect, useState } from "react";
import {
  listMedia,
  uploadMedia,
  deleteMedia,
  type MediaItem,
} from "../actions";
import { notifyError, confirmDialog } from "@/lib/ui/dialogs";

export default function MediaPanel({ tenantId }: { tenantId: string }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listMedia(tenantId).then(setItems);
  }, [tenantId]);

  async function handleUpload(file: File) {
    setBusy(true);
    try {
      const item = await uploadMedia(tenantId, file);
      setItems((prev) => [item, ...prev]);
    } catch (e: any) {
      notifyError(e?.message ?? "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!(await confirmDialog("Delete this asset?", { danger: true, confirmText: "Delete" }))) return;
    try {
      await deleteMedia(id, tenantId);
      setItems((prev) => prev.filter((m) => m.id !== id));
    } catch (e: any) {
      notifyError(e?.message ?? "Delete failed.");
    }
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard may be blocked; ignore */
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Media</h2>
        <label className="cursor-pointer rounded bg-blue-600 px-3 py-1 text-sm text-white">
          {busy ? "Uploading…" : "Upload"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-gray-500">No media uploaded yet.</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((m) => (
            <div
              key={m.id}
              className="overflow-hidden rounded border border-gray-200"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.url}
                alt={m.filename ?? "media"}
                className="h-24 w-full object-cover"
              />
              <div className="flex justify-between gap-1 p-1">
                <button
                  onClick={() => copyUrl(m.url)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Copy URL
                </button>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
