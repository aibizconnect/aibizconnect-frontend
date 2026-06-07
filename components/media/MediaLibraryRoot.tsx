"use client";

import { useEffect, useRef, useState } from "react";
import {
  listMedia, uploadMedia, deleteMedia, importStockMedia, importAiMedia, importCanvaMedia,
  getSystemAssets, getMediaUsage, getTenantQuota,
  listFolders, createFolder, renameFolder, deleteFolder, moveMediaToFolder, moveFolder, getFolderImageCount, ensureDefaultMediaFolders,
  searchProvider, generateAiImages, importSystemAssetToTenant, amIPlatformAdmin, amISystemManager, amISuperAdmin, whoAmI, getPlatformAudit, declutterSystemMedia, deleteSystemMedia, bulkUploadSystemMedia, backfillSystemTagsFromFilenames, addSystemMediaTags, promoteMediaToSystem, getAiUsage, getAllAiUsage,
  type MediaItem, type MediaSource, type SystemAsset, type MediaFolder, type StockProvider, type ProviderResult, type AiUsage, type TenantAiUsage,
} from "@/app/tenants/[tenantId]/website/actions";
import { AI_STARTER_PACKS, type AiPreset } from "@/lib/media/ai-presets";
import { listWebsites, type Website } from "@/app/tenants/[tenantId]/website/website-actions";

const isImage = (m: { mime_type?: string | null; filename?: string | null }) =>
  (m.mime_type ?? "").startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(m.filename ?? "");
const fileExt = (name?: string | null) => (name ?? "").split(".").pop()?.toUpperCase().slice(0, 4) || "FILE";
const fmtBytes = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : b < 1073741824 ? `${(b / 1048576).toFixed(1)} MB` : `${(b / 1073741824).toFixed(2)} GB`;

type Tab = "all" | "upload" | "stock" | "ai" | "canva" | "drive" | "url" | "system";
const SOURCE_FOR: Partial<Record<Tab, MediaSource>> = { upload: "upload", stock: "stock", ai: "ai", canva: "canva" };

// polished source picker entries (dropdown). Each has a unique id; provider entries
// share tab "stock" but pre-select a provider. Icons are simple emoji marks.
interface SourceOpt { id: string; label: string; icon: string; tab: Tab; provider?: StockProvider; sub?: string; children?: SourceOpt[]; }
// Top level: All · My Media · Unsplash · Pixabay. Everything the tenant brings in (uploads,
// AI, Canva, Drive, By-URL) and the System packs live NESTED under "My Media" — because
// whatever they bring in from any source is theirs.
const SOURCES: SourceOpt[] = [
  // "All" = the shared System stock library, browsable by business category (read-only;
  // copy a photo's URL or copy it into your own folders). NOT personal AI images.
  { id: "all", label: "All", icon: "✶", tab: "system" },
  { id: "mine", label: "My Media", icon: "🖼️", tab: "upload" },
  { id: "unsplash", label: "Unsplash", icon: "📷", tab: "stock", provider: "unsplash" },
  { id: "pixabay", label: "Pixabay", icon: "🟩", tab: "stock", provider: "pixabay" },
];
const SOURCE_OPTS: SourceOpt[] = SOURCES.flatMap((s) => [s, ...(s.children ?? [])]);

// Broad rail categories. Many fine keywords (tags/filenames) roll up into a handful of
// groups for the left rail; the exact keywords still drive SEARCH. An image can be in
// several groups. Only groups that actually have images are shown (top ~10).
const CATEGORY_GROUPS: { label: string; match: string[] }[] = [
  { label: "People", match: ["people", "person", "man", "men", "woman", "women", "child", "children", "kid", "team", "colleague", "employee", "businessman", "businesswoman", "portrait", "professional", "manager", "coworker"] },
  { label: "Office", match: ["office", "workspace", "desk", "meeting", "boardroom", "conference", "coworking", "co-working", "reception", "cubicle", "workstation", "open-plan"] },
  { label: "Cities", match: ["city", "cityscape", "skyline", "urban", "downtown", "metropolis", "skyscraper"] },
  { label: "Landscapes", match: ["landscape", "beach", "coast", "mountain", "forest", "nature", "valley", "desert", "river", "lake", "dune", "hill", "aerial", "sunset", "sunrise", "scenery"] },
  { label: "Buildings", match: ["building", "office", "house", "home", "condo", "tower", "architecture", "interior", "room", "workspace", "reception", "boardroom", "kitchen", "exterior", "apartment"] },
  { label: "Backgrounds", match: ["background", "gradient", "abstract", "pattern", "patterned", "texture", "mesh", "bokeh", "geometric", "wave", "marble", "seamless", "glassmorphism"] },
  { label: "Finance", match: ["finance", "financial", "money", "coin", "chart", "graph", "bank", "vault", "wallet", "accounting", "invest", "stock", "growth", "budget", "payment"] },
  { label: "Technology", match: ["tech", "security", "server", "data", "datacenter", "cloud", "lock", "shield", "circuit", "padlock", "fingerprint", "cyber", "network", "digital", "ai"] },
  { label: "Real Estate", match: ["real", "estate", "property", "mortgage", "keys", "sold", "listing", "blueprint", "realtor", "agent"] },
  { label: "Law", match: ["law", "legal", "gavel", "justice", "court", "lawyer", "contract", "scale", "courthouse"] },
  { label: "Food", match: ["food", "restaurant", "dish", "meal", "chef", "pizza", "coffee", "latte", "burger", "salad", "cafe", "dining", "ingredients", "kitchen"] },
  { label: "Graphics", match: ["graphic", "illustration", "render", "concept", "3d"] },
  { label: "Icons", match: ["icon", "symbol"] },
  { label: "Emojis", match: ["emoji"] },
  { label: "Colors", match: ["green", "blue", "pink", "red", "purple", "orange", "teal", "navy", "pastel", "violet", "magenta", "cyan", "charcoal"] },
];
function groupsForKeywords(hay: string): string[] {
  const h = hay.toLowerCase();
  return CATEGORY_GROUPS.filter((g) => g.match.some((m) => new RegExp(`\\b${m}`).test(h))).map((g) => g.label);
}

// Derive tags from a filename (client mirror of the server's keyword extractor) so the upload
// dialog can PRE-FILL tags — if the name already describes the image, no need to add them.
const TAG_STOP = new Set(["a", "an", "the", "of", "with", "and", "or", "on", "in", "at", "to", "for", "by", "from", "into", "your", "our", "this", "that", "is", "are", "be", "as", "it", "its", "png", "jpg", "jpeg", "webp", "svg", "gif", "avif"]);
function tagsFromFilename(name: string): string[] {
  const out: string[] = [];
  for (const t of name.replace(/\.[^.]+$/, "").toLowerCase().split(/[^a-z0-9]+/)) {
    if (t.length < 3 || /^\d+$/.test(t) || TAG_STOP.has(t) || out.includes(t)) continue;
    out.push(t); if (out.length >= 6) break;
  }
  return out;
}
function tagsFromFiles(files: File[]): string[] {
  const s = new Set<string>();
  for (const f of files) for (const t of tagsFromFilename(f.name)) s.add(t);
  return Array.from(s).slice(0, 8);
}

/**
 * Single source of truth for the Media Library (Copilot Q4). Both the dashboard
 * "Media Storage" page (mode="manage") and the in-editor picker (mode="insert")
 * render this — identical tabs, search, sort, grid/list, upload, delete, usage meter.
 * In insert mode, clicking an asset calls onSelect(url).
 */
export default function MediaLibraryRoot({
  tenantId, mode = "manage", onSelect,
}: { tenantId: string; mode?: "manage" | "insert"; onSelect?: (url: string) => void }) {
  const insert = mode === "insert";
  const [items, setItems] = useState<MediaItem[]>([]);
  const [systemMedia, setSystemMedia] = useState<MediaItem[]>([]); // AI-generated System assets (read-only)
  const [isAdmin, setIsAdmin] = useState(false); // platform admin → can manage System
  const [isSuperAdmin, setIsSuperAdmin] = useState(false); // owner → can declutter/delete System
  const [isSysManager, setIsSysManager] = useState(false); // admin OR staff → can bulk upload
  const [declutterBusy, setDeclutterBusy] = useState(false);
  // Our own popups (never the browser's alert/confirm): a toast, a confirm dialog, and an
  // upload-progress modal.
  const [toast, setToast] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = (text: string, kind: "ok" | "err" | "info" = "info") => {
    setToast({ kind, text });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  };
  const [confirmState, setConfirmState] = useState<{ text: string; resolve: (v: boolean) => void } | null>(null);
  const ask = (text: string) => new Promise<boolean>((resolve) => setConfirmState({ text, resolve }));
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [tagBusy, setTagBusy] = useState(false);
  async function tagFromNames() {
    setTagBusy(true);
    try {
      const r = await backfillSystemTagsFromFilenames();
      notify(`Tagged ${r.updated} of ${r.scanned} System images from their filenames.`);
      reloadMedia();
    } catch (e: any) { notify(e?.message ?? "Tagging failed."); } finally { setTagBusy(false); }
  }
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkFolder, setBulkFolder] = useState("auto"); // "auto" = let AI categorize
  const sysBulkRef = useRef<HTMLInputElement>(null);
  // When an admin/staff member uploads, we ask: System library or your own media?
  // Holds the files awaiting that yes/no choice (null = no pending upload).
  const [pendingUpload, setPendingUpload] = useState<File[] | null>(null);
  const [whoami, setWhoami] = useState<{ email: string | null; role: "superadmin" | "admin" | "staff" | null; isAdmin: boolean; isManager: boolean } | null>(null);
  const [system, setSystem] = useState<SystemAsset[]>([]);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("upload");
  const [sourceId, setSourceId] = useState("mine");
  const [stockProvider, setStockProvider] = useState<StockProvider>("unsplash");
  const [sourceOpen, setSourceOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"new" | "old" | "name">("new");
  const [urlInput, setUrlInput] = useState("");
  const [drag, setDrag] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [usage, setUsage] = useState<{ bytes: number; count: number }>({ bytes: 0, count: 0 });
  const [quota, setQuota] = useState(1_000_000_000);
  const [folders, setFolders] = useState<MediaFolder[]>([]);          // tenant's own (manageable)
  const [systemFolders, setSystemFolders] = useState<MediaFolder[]>([]); // read-only, for System-tab grouping
  const [folderId, setFolderId] = useState<string | null>(null); // null = root / all
  const [systemCat, setSystemCat] = useState<string | null>(null); // selected System category in "All" (null = every category, flat)
  // Bulk-tagging in the All (System) view: which System images are selected + the tag input.
  const [sysSelected, setSysSelected] = useState<Set<string>>(new Set());
  const [sysTagInput, setSysTagInput] = useState("");
  const [sysTagBusy, setSysTagBusy] = useState(false);
  const toggleSysSel = (id: string) => setSysSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  async function applySysTags() {
    const ids = Array.from(sysSelected);
    const tags = sysTagInput.split(",").map((t) => t.trim()).filter(Boolean);
    if (!ids.length || !tags.length) return;
    setSysTagBusy(true);
    try {
      const r = await addSystemMediaTags(ids, tags);
      notify(`Added tags to ${r.updated} image${r.updated === 1 ? "" : "s"}.`, "ok");
      setSysTagInput(""); setSysSelected(new Set()); reloadMedia();
    } catch (e: any) { notify(e?.message ?? "Could not add tags.", "err"); } finally { setSysTagBusy(false); }
  }
  const [uploadTags, setUploadTags] = useState<string[]>([]); // multi-tag picks in the System upload dialog ([] = Auto/AI)
  const [tagInput, setTagInput] = useState(""); // current typeahead text in the upload dialog
  const [websites, setWebsites] = useState<Website[]>([]);
  const [siteFilter, setSiteFilter] = useState<string | null>(null); // null = all websites
  const fileRef = useRef<HTMLInputElement>(null);
  // Marquee (drag-to-cover) multi-select over the grid.
  // gridRef stays pointed at the CURRENT grid node even though the inline Grid component
  // remounts on each render — so the drag handler never reads a detached (zero-size) node.
  const gridRef = useRef<HTMLDivElement | null>(null);
  const marqueeStart = useRef<{ x: number; y: number; base: Set<string> } | null>(null);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const reloadUsage = () => getMediaUsage(tenantId).then(setUsage).catch(() => {});
  // Tenant folders (manageable rail) are kept SEPARATE from read-only System folders.
  // System folders are only used to group System images in the System tab — never shown
  // in the editable rail, so the tenant can't rename/move/delete them.
  const reloadFolders = () => listFolders(tenantId, true).then((all) => {
    setFolders(all.filter((f) => !f.is_system));
    setSystemFolders(all.filter((f) => f.is_system));
  }).catch(() => { setFolders([]); setSystemFolders([]); });
  // Fetch tenant media + global System media in one call, then SPLIT them: System assets
  // stay OUT of "my images" (Ali's rule) and surface only under the System category tab.
  const reloadMedia = () => listMedia(tenantId, { includeSystem: true }).then((all) => {
    setItems(all.filter((m) => !m.is_system));
    setSystemMedia(all.filter((m) => m.is_system));
  }).catch(() => {});
  useEffect(() => {
    reloadMedia(); getSystemAssets().then(setSystem); reloadUsage();
    // Seed the default starter folders (Logos, Photos, …) once, then show the rail.
    if (!insert) ensureDefaultMediaFolders(tenantId).then(reloadFolders).catch(reloadFolders);
    else reloadFolders();
    getTenantQuota(tenantId).then((q) => setQuota(q.maxBytes)).catch(() => {});
    listWebsites(tenantId).then(setWebsites).catch(() => setWebsites([]));
    amIPlatformAdmin().then(setIsAdmin).catch(() => setIsAdmin(false));
    amISystemManager().then(setIsSysManager).catch(() => setIsSysManager(false));
    amISuperAdmin().then(setIsSuperAdmin).catch(() => setIsSuperAdmin(false));
    whoAmI().then(setWhoami).catch(() => setWhoami(null));
    /* eslint-disable-next-line */
  }, [tenantId]);

  async function newFolder() {
    const name = window.prompt("Folder name");
    if (!name) return;
    try { await createFolder(tenantId, name, folderId); reloadFolders(); }
    catch (e: any) { notify(e?.message ?? "Could not create folder."); }
  }
  async function renameF(f: MediaFolder) {
    const name = window.prompt("Rename folder", f.name);
    if (!name || name === f.name) return;
    try { await renameFolder(f.id, tenantId, name); reloadFolders(); } catch (e: any) { notify(e?.message); }
  }
  async function deleteF(f: MediaFolder) {
    // Empty → delete directly. Has images → require explicit consent to delete the
    // folder AND all images inside (Ali's rule).
    let count = 0;
    try { count = await getFolderImageCount(f.id, tenantId); } catch { /* treat as unknown */ }
    if (count === 0) {
      if (!(await ask(`Delete the empty folder "${f.name}"?`))) return;
    } else {
      const ok = await ask(`"${f.name}" contains ${count} image${count === 1 ? "" : "s"}.\n\nDelete the folder AND all ${count} image${count === 1 ? "" : "s"} inside? This permanently removes them and can't be undone.`);
      if (!ok) return;
    }
    try {
      await deleteFolder(f.id, tenantId, count > 0); // consent passed when images exist
      if (folderId === f.id) setFolderId(null);
      reloadFolders(); reloadMedia(); reloadUsage();
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.startsWith("FOLDER_NOT_EMPTY")) notify("This folder still has images. Confirm again to delete them with the folder.");
      else notify(msg || "Could not delete folder.");
    }
  }
  // Move a folder under another folder (or root) — used by folder drag-and-drop.
  async function moveFolderTo(folderIdToMove: string, targetParentId: string | null) {
    if (folderIdToMove === targetParentId) return;
    try { await moveFolder(folderIdToMove, tenantId, targetParentId); reloadFolders(); }
    catch (e: any) { notify(e?.message ?? "Could not move folder."); }
  }
  // Drag a file onto a folder (or "All files" = root). Optimistic local update.
  const [dragOverFolder, setDragOverFolder] = useState<string | null | undefined>(undefined); // undefined = none
  async function dropToFolder(targetFolderId: string | null, e: React.DragEvent) {
    e.preventDefault(); setDragOverFolder(undefined);
    const id = e.dataTransfer.getData("text/abc-media");
    if (!id) return;
    setItems((prev) => prev.map((m) => (m.id === id ? { ...m, folder_id: targetFolderId } : m)));
    try { await moveMediaToFolder(id, tenantId, targetFolderId); } catch (err: any) { notify(err?.message ?? "Move failed."); reloadMedia(); }
  }

  const pick = (url: string) => { if (insert) onSelect?.(url); };
  // Platform-admin only: declutter the global SYSTEM library (removes old grid/set images,
  // keeps single-subject ones). Dry-run first to report the count, then confirm to delete.
  async function declutter() {
    setDeclutterBusy(true);
    try {
      const preview = await declutterSystemMedia({ dryRun: true });
      if (preview.matched === 0) { notify("Nothing to declutter — no old grid/set images found."); return; }
      const sample = preview.sampleNames.slice(0, 6).join("\n• ");
      const ok = await ask(
        `Declutter SYSTEM library?\n\nThis permanently deletes ${preview.matched} old grid/set image${preview.matched === 1 ? "" : "s"} ` +
        `(of ${preview.scanned} total) and KEEPS the single-subject assets.\n\nExamples to be removed:\n• ${sample}\n\nThis cannot be undone.`
      );
      if (!ok) return;
      const res = await declutterSystemMedia({ dryRun: false });
      notify(`Removed ${res.removed} old image${res.removed === 1 ? "" : "s"}. Library is tidier now.`);
      reloadMedia(); reloadFolders();
    } catch (e: any) {
      notify(e?.message ?? "Declutter failed.");
    } finally { setDeclutterBusy(false); }
  }

  // Platform-admin only: bulk upload files into the SYSTEM library (all tenants get them).
  // folder "auto" → AI categorizes each; otherwise everything goes into the typed folder.
  async function onSystemBulkFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setBulkBusy(true);
    try {
      const fd = new FormData();
      fd.append("folderPath", bulkFolder.trim() || "auto");
      Array.from(files).forEach((f) => fd.append("files", f));
      const res = await bulkUploadSystemMedia(fd);
      const ai = res.items.filter((x) => x.aiCategorized).length;
      const need = res.items.filter((x) => x.needsDescription).length;
      let msg = `Uploaded ${res.uploaded} to the System library.`;
      if (bulkFolder.trim().toLowerCase() === "auto") msg += `\nAI categorized ${ai}; ${need} couldn't be auto-sorted (left in /System/Uncategorized — you can describe them anytime, optional).`;
      if (res.errors.length) msg += `\n${res.errors.length} failed.`;
      notify(msg);
      reloadMedia(); reloadFolders();
    } catch (e: any) {
      notify(e?.message ?? "Bulk upload failed.");
    } finally { setBulkBusy(false); if (sysBulkRef.current) sysBulkRef.current.value = ""; }
  }

  // Platform-admin only: delete one SYSTEM asset (cherry-remove a miss / text image).
  async function adminDeleteSystem(id: string, name?: string | null) {
    if (!(await ask(`Delete this System asset permanently?\n\n${name ?? ""}`))) return;
    try {
      await deleteSystemMedia(id);
      setSystemMedia((p) => p.filter((m) => m.id !== id));
    } catch (e: any) { notify(e?.message ?? "Delete failed."); }
  }

  // Copy-on-use: explicitly copy a read-only System asset into the tenant's own media.
  async function importToMine(systemMediaId: string) {
    try { const item = await importSystemAssetToTenant(tenantId, systemMediaId); setItems((p) => [item, ...p]); reloadUsage(); notify("Imported to My Media.", "ok"); }
    catch (e: any) { notify(e?.message ?? "Could not import to My Media.", "err"); }
  }
  // Fix a mis-filed upload: copy a System photo into My Media AND remove it from the public
  // library (superadmin). For images that are actually private, not shared stock.
  async function moveSystemToMine(systemMediaId: string) {
    if (!(await ask("Move this to your My Media and remove it from the public System library?"))) return;
    try {
      await importSystemAssetToTenant(tenantId, systemMediaId);
      await deleteSystemMedia(systemMediaId);
      setSystemMedia((p) => p.filter((m) => m.id !== systemMediaId));
      reloadMedia(); reloadUsage();
      notify("Moved to My Media and removed from the public library.", "ok");
    } catch (e: any) { notify(e?.message ?? "Could not move.", "err"); }
  }
  const toggleSel = (id: string) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  async function copyLink(url: string, id: string) {
    try { await navigator.clipboard.writeText(url); setCopied(id); setTimeout(() => setCopied(null), 1200); } catch { /* blocked */ }
  }
  async function remove(id: string) {
    if (!(await ask("Delete this asset?"))) return;
    try { await deleteMedia(id, tenantId); setItems((p) => p.filter((m) => m.id !== id)); reloadUsage(); }
    catch (e: any) { notify(e?.message ?? "Delete failed."); }
  }
  async function bulkDelete() {
    if (!selected.size || !(await ask(`Delete ${selected.size} selected asset(s)?`))) return;
    for (const id of Array.from(selected)) { try { await deleteMedia(id, tenantId); } catch { /* keep going */ } }
    setItems((p) => p.filter((m) => !selected.has(m.id))); setSelected(new Set()); reloadUsage();
  }
  // Admin/staff: promote selected tenant photos into the shared SYSTEM library.
  async function moveToSystem() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (!(await ask(`Add ${ids.length} photo(s) to the System library (available to all tenants)? Your originals stay in your media.`))) return;
    try {
      const r = await promoteMediaToSystem(tenantId, ids);
      setSelected(new Set()); reloadMedia();
      notify(`Added ${r.promoted} to System${r.skipped ? `, skipped ${r.skipped} (duplicates/errors)` : ""}.`);
    } catch (e: any) { notify(e?.message ?? "Could not move to System."); }
  }

  // Admin/staff: remove a promoted/uploaded SYSTEM photo (not the bundled SVG packs).
  async function removeSystem(id: string) {
    if (!(await ask("Remove this photo from the System library for all tenants? This can't be undone."))) return;
    try { await deleteSystemMedia(id); setSystemMedia((p) => p.filter((m) => m.id !== id)); }
    catch (e: any) { notify(e?.message ?? "Could not remove from System."); }
  }
  // A SYSTEM photo is admin-deletable when it's a real DB asset (not a bundled SVG pack).
  const canDeleteSystem = (m: MediaItem) => !insert && m.is_system && m.source !== "system" && isSuperAdmin;

  // Marquee drag-select: cover cards with the mouse to select many at once.
  const onGridMouseDown = (e: React.MouseEvent) => {
    if (insert || e.button !== 0) return;
    const t = e.target as HTMLElement;
    // Block only real controls (checkbox/links/action buttons) and draggable cards —
    // the photo thumbnail is a plain div, so a marquee CAN start on a photo.
    if (t.closest('button, input, a, [draggable="true"]')) return;
    const rect = (gridRef.current ?? (e.currentTarget as HTMLElement)).getBoundingClientRect();
    e.preventDefault(); // suppress native image-drag / text selection
    marqueeStart.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, base: e.shiftKey ? new Set(selected) : new Set() };
    setMarquee({ x: marqueeStart.current.x, y: marqueeStart.current.y, w: 0, h: 0 });
  };
  useEffect(() => {
    if (!marquee) return;
    const move = (e: MouseEvent) => {
      const st = marqueeStart.current; const grid = gridRef.current; if (!st || !grid) return;
      const rect = grid.getBoundingClientRect();
      const cx = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const cy = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      const x = Math.min(st.x, cx), y = Math.min(st.y, cy), w = Math.abs(cx - st.x), h = Math.abs(cy - st.y);
      setMarquee({ x, y, w, h });
      if (w < 4 && h < 4) return; // a click (no real drag) shouldn't change selection
      const box = { left: rect.left + x, top: rect.top + y, right: rect.left + x + w, bottom: rect.top + y + h };
      const next = new Set(st.base);
      grid.querySelectorAll<HTMLElement>("[data-media-id]").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.left < box.right && r.right > box.left && r.top < box.bottom && r.bottom > box.top) next.add(el.dataset.mediaId!);
      });
      setSelected(next);
    };
    const up = () => { setMarquee(null); marqueeStart.current = null; };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    return () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marquee !== null]);
  // Upload into the tenant's OWN media (private copy). This is the default for everyone.
  async function doTenantUpload(files: File[], asSource: MediaSource) {
    const list = asSource === "upload" ? files : files.filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    setBusy(true);
    setUploadProgress({ done: 0, total: list.length });
    let done = 0, ok = 0;
    try {
      for (const f of list) {
        if (f.size > 10_485_760) { notify(`"${f.name}" is too large (max 10 MB).`, "err"); done++; setUploadProgress({ done, total: list.length }); continue; }
        const item = asSource === "ai" ? await importAiMedia(tenantId, f)
          : asSource === "canva" ? await importCanvaMedia(tenantId, f)
          : await uploadMedia(tenantId, f, "upload", folderId, siteFilter);
        setItems((prev) => [item, ...prev]);
        done++; ok++; setUploadProgress({ done, total: list.length });
      }
      reloadUsage();
      notify(`Uploaded ${ok} file${ok === 1 ? "" : "s"} to My Media.`, "ok");
    } catch (e: any) { notify(e?.message ?? "Upload failed.", "err"); } finally { setBusy(false); setUploadProgress(null); }
  }
  // Admin/staff: upload straight into the shared SYSTEM library — a SEPARATE copy from any
  // tenant media. AI auto-categorizes & tags each, and they're read-only for all tenants.
  // Deleting a System asset never touches a tenant's own copy (and vice-versa).
  async function doSystemUpload(files: File[]) {
    const list = files.filter((f) => f.type.startsWith("image/"));
    if (!list.length) { notify("Only image files can go into the System library.", "err"); return; }
    // Send in size-bounded CHUNKS so no single server-action request exceeds the body limit
    // (a too-big request truncates → "Unexpected end of form"). Each chunk stays well under 12 MB.
    const MAX_CHUNK = 8_500_000;
    const chunks: File[][] = [];
    let cur: File[] = [], curSize = 0;
    for (const f of list) {
      if (f.size > 10_485_760) { notify(`"${f.name}" is too large (max 10 MB).`, "err"); continue; }
      if (cur.length && curSize + f.size > MAX_CHUNK) { chunks.push(cur); cur = []; curSize = 0; }
      cur.push(f); curSize += f.size;
    }
    if (cur.length) chunks.push(cur);
    if (!chunks.length) return;
    setBusy(true);
    setUploadProgress({ done: 0, total: list.length });
    let uploaded = 0, failed = 0, aiTagged = 0, done = 0;
    try {
      for (const chunk of chunks) {
        const fd = new FormData();
        // No tags picked → "auto" (AI categorizes). Tags picked → store ALL of them.
        fd.append("folderPath", uploadTags.length ? uploadTags[0] : "auto");
        fd.append("tags", JSON.stringify(uploadTags));
        chunk.forEach((f) => fd.append("files", f));
        try {
          const res = await bulkUploadSystemMedia(fd);
          uploaded += res.uploaded; failed += res.errors.length;
          aiTagged += res.items.filter((x) => x.aiCategorized).length;
        } catch { failed += chunk.length; }
        done += chunk.length; setUploadProgress({ done, total: list.length });
      }
      notify(`Uploaded ${uploaded} to the System library${aiTagged ? ` · AI-tagged ${aiTagged}` : ""}${failed ? ` · ${failed} failed` : ""}.`, failed ? "err" : "ok");
      reloadMedia(); reloadFolders();
    } finally { setBusy(false); setUploadProgress(null); }
  }
  async function handleFiles(files: FileList | File[], asSource: MediaSource) {
    const all = Array.from(files);
    if (!all.length) return;
    // Dropzone uploads always go to the user's OWN media (My Media), with progress. Putting
    // things into the shared System library is a separate, deliberate action — the
    // "Upload to System" button in the All view (which opens the tag dialog).
    await doTenantUpload(all, asSource);
  }
  async function saveUrl(asInsert: boolean) {
    if (!/^https?:\/\//.test(urlInput)) return;
    if (asInsert) { pick(urlInput); return; }
    setBusy(true);
    try { const item = await importStockMedia(tenantId, urlInput); setItems((p) => [item, ...p]); setUrlInput(""); setTab("stock"); }
    catch (e: any) { notify(e?.message ?? "Could not import URL."); } finally { setBusy(false); }
  }

  const src = SOURCE_FOR[tab];
  const selectSource = (o: SourceOpt) => { setSourceId(o.id); setTab(o.tab); if (o.provider) setStockProvider(o.provider); setQ(""); setSourceOpen(false); };
  // Folder filter applies to the "My Uploads" pool (stored files live in folders).
  const inFolder = (m: MediaItem) => folderId == null || (m.folder_id ?? null) === folderId;
  const inSite = (m: MediaItem) => siteFilter == null || (m.website_id ?? null) === siteFilter;
  // "all" shows every stored asset INCLUDING global System images, flat (no folders) and
  // searchable by their descriptive filename (e.g. "happy people in the office", "smiley
  // face"). "My Media" and other source tabs stay tenant-only. System images have no
  // `source`, so they never leak into the source-filtered tabs.
  // Bundled System starter packs (icons / emojis / graphics — inline SVGs) surfaced as
  // MediaItem cards so they also appear in "All", not only the Backgrounds & Icons tab.
  const filtered = (
    // "All files" = ONLY the tenant's own media (every source, across folders). System assets
    // are NEVER merged in here — they live in their own area — so a tenant's items can never
    // look like they're "in System", and deleting one only ever removes the tenant's own row.
    tab === "all" ? items.filter((m) => inSite(m))
    // My Media = the tenant's own media in the selected folder (uploads + AI + Canva + stock).
    : tab === "upload" ? items.filter((m) => inSite(m) && inFolder(m))
    : src ? items.filter((m) => m.source === src && inSite(m))
    : [])
    .filter((m) => !q || (m.filename ?? "").toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) =>
      sort === "name" ? (a.filename ?? "").localeCompare(b.filename ?? "")
      : sort === "old" ? (a.created_at ?? "").localeCompare(b.created_at ?? "")
      : (b.created_at ?? "").localeCompare(a.created_at ?? ""));

  const Grid = ({ children }: any) =>
    view === "list"
      ? <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">{children}</div>
      : (
        <div ref={gridRef} onMouseDown={onGridMouseDown} className="relative select-none">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{children}</div>
          {marquee && marquee.w > 2 && marquee.h > 2 && (
            <div className="pointer-events-none absolute z-20 rounded-sm border border-[#1e3a8a] bg-[#1e3a8a]/10"
              style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }} />
          )}
        </div>
      );

  const Thumb = ({ m, className }: { m: MediaItem; className: string }) =>
    isImage(m)
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={m.url} alt={m.filename ?? "media"} draggable={false} className={className} />
      : <div className={`flex items-center justify-center bg-slate-100 ${className}`}><span className="rounded bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500">{fileExt(m.filename)}</span></div>;

  function Card({ m }: { m: MediaItem }) {
    const isSel = selected.has(m.id);
    const draggable = tab === "upload"; // only stored files live in folders
    // Folder drag-and-drop lives on a dedicated grip handle (grid view) / whole row (list
    // view). Keeping the grid CARD body non-draggable lets the marquee drag-select start on
    // a photo — otherwise the browser's native image-drag swallows the marquee gesture.
    const dragProps = draggable ? {
      draggable: true,
      onDragStart: (e: React.DragEvent) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/abc-media", m.id); },
    } : {};
    if (view === "list") {
      return (
        <div {...dragProps} className={`flex items-center gap-3 px-3 py-2 ${draggable ? "cursor-grab" : ""} ${isSel ? "bg-[#1e3a8a]/5" : "hover:bg-slate-50"}`}>
          {!insert && !m.is_system && <input type="checkbox" checked={isSel} onChange={() => toggleSel(m.id)} className="h-4 w-4 shrink-0" />}
          <button type="button" onClick={() => insert ? pick(m.url) : (!m.is_system && toggleSel(m.id))} className="flex min-w-0 flex-1 items-center gap-3 text-left" title={insert ? "Insert" : m.is_system ? (m.filename ?? "") : "Click to select"}>
            <Thumb m={m} className="h-9 w-9 shrink-0 rounded object-cover" />
            <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{m.filename ?? "untitled"}</span>
          </button>
          <span className="shrink-0 text-xs text-slate-400">{m.size_bytes ? fmtBytes(m.size_bytes) : ""}</span>
          <button onClick={() => copyLink(m.url, m.id)} className="shrink-0 text-xs text-slate-500 hover:text-[#1e3a8a]" title="Copy link">{copied === m.id ? "✓" : "🔗"}</button>
          {!insert && !m.is_system && <button onClick={() => remove(m.id)} className="shrink-0 text-xs text-red-600" title="Delete">🗑</button>}
          {canDeleteSystem(m) && <button onClick={() => removeSystem(m.id)} className="shrink-0 text-xs text-red-600" title="Remove from System (admin/staff)">🗑</button>}
        </div>
      );
    }
    return (
      <div data-media-id={!insert && !m.is_system ? m.id : undefined}
        className={`group relative aspect-square overflow-hidden rounded-xl border bg-slate-50 shadow-sm transition hover:shadow-md ${isSel ? "border-[#1e3a8a] ring-2 ring-[#1e3a8a]/40" : "border-slate-200"}`}>
        {draggable && !insert && !m.is_system && (
          <span {...dragProps} title="Drag to a folder"
            className="absolute bottom-2 right-2 z-10 hidden cursor-grab rounded bg-white/90 px-1.5 py-0.5 text-sm leading-none text-slate-500 shadow group-hover:block">⠿</span>
        )}
        <div onClick={() => insert ? pick(m.url) : (!m.is_system && toggleSel(m.id))}
          className={`block h-full w-full ${insert || !m.is_system ? "cursor-pointer" : ""}`}
          title={insert ? "Insert" : m.is_system ? (m.filename ?? "") : "Click to select"}>
          <Thumb m={m} className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
        </div>
        {!insert && !m.is_system && <input type="checkbox" checked={isSel} onChange={() => toggleSel(m.id)} title="Select"
          className={`absolute left-2 top-2 h-4 w-4 ${isSel ? "" : "opacity-0 group-hover:opacity-100"}`} />}
        {m.is_system && <span className="absolute left-2 top-2 rounded bg-white/85 px-1 py-0.5 text-[9px] font-medium text-slate-500 shadow-sm">🔒 System</span>}
        <div className="absolute right-1.5 top-1.5 hidden gap-1 group-hover:flex">
          <button onClick={() => copyLink(m.url, m.id)} className="rounded-md bg-white/90 px-1.5 py-0.5 text-xs text-slate-600 shadow" title="Copy link">{copied === m.id ? "✓" : "🔗"}</button>
          {!insert && !m.is_system && <button onClick={() => remove(m.id)} className="rounded-md bg-white/90 px-1.5 py-0.5 text-xs text-red-600 shadow" title="Delete">🗑</button>}
          {canDeleteSystem(m) && <button onClick={() => removeSystem(m.id)} className="rounded-md bg-white/90 px-1.5 py-0.5 text-xs text-red-600 shadow" title="Remove from System (admin/staff)">🗑</button>}
        </div>
        {/* Caption only on hover (polished clean grid). */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/55 to-transparent px-2 pb-1.5 pt-5 text-[11px] text-white opacity-0 transition group-hover:opacity-100">{m.filename ?? "untitled"}</div>
      </div>
    );
  }
  // Search + sort now live in the top controls row; this stays empty to avoid duplicates.
  const Toolbar = null;
  const BulkBar = !insert && selected.size > 0 && (
    <div className="mb-2 flex items-center justify-between rounded-md bg-slate-100 px-3 py-1.5 text-sm">
      <span>{selected.size} selected <span className="text-slate-400">· tip: drag over photos to select many</span></span>
      <div className="flex gap-3">
        <button onClick={() => setSelected(new Set())} className="text-slate-500 hover:underline">Clear</button>
        {(isSysManager || isAdmin) && <button onClick={moveToSystem} className="font-medium text-sky-700 hover:underline" title="Add the selected photos to the shared System library">↑ Move to System</button>}
        <button onClick={bulkDelete} className="text-red-600 hover:underline">Delete selected</button>
      </div>
    </div>
  );
  // Admin/staff: upload to the shared SYSTEM library (auto AI-categorized + tagged). Shown in
  // the All view too so it's reachable without switching to the Backgrounds & Icons tab.
  const SystemUploadBar = !insert && (isSysManager || isAdmin) ? (
    <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-md border border-sky-100 bg-sky-50/60 px-3 py-2">
      <span className="text-xs font-medium text-sky-700">🔒 System library (admin/staff) — available to all tenants</span>
      {isSysManager && (
        <div className="ml-auto flex items-center gap-1.5">
          <input value={bulkFolder} onChange={(e) => setBulkFolder(e.target.value)}
            title="Target folder under /System (e.g. 'Backgrounds/Real Estate'), or 'auto' to let AI categorize & tag"
            placeholder="auto" className="w-40 rounded-md border border-slate-300 px-2 py-1 text-xs" />
          <input ref={sysBulkRef} type="file" multiple accept="image/*" className="hidden"
            onChange={(e) => onSystemBulkFiles(e.target.files)} />
          <button onClick={() => sysBulkRef.current?.click()} disabled={bulkBusy}
            title="Bulk upload to the System library (AI auto-categorizes & tags each image)"
            className="rounded-md border border-sky-300 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-50">
            {bulkBusy ? "Uploading…" : "⬆ Bulk upload to System"}
          </button>
        </div>
      )}
      {isSuperAdmin && (
        <button onClick={declutter} disabled={declutterBusy}
          title="Superadmin: remove old grid/set images, keep single-subject assets"
          className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50">
          {declutterBusy ? "Working…" : "🧹 Declutter"}
        </button>
      )}
    </div>
  ) : null;
  const Dropzone = ({ asSource, hint }: { asSource: MediaSource; hint: string }) => (
    <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files, asSource); }}
      className={`mb-3 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition ${drag ? "border-[#1e3a8a] bg-[#1e3a8a]/5" : "border-slate-300"}`}>
      <p className="text-sm text-slate-600">{busy ? "Uploading…" : hint}</p>
      <p className="mt-1 text-xs text-slate-400">Any file type (incl. GIF) · up to 10 MB each · select multiple at once</p>
      <button onClick={() => fileRef.current?.click()} disabled={busy} className="mt-2 rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm text-white disabled:opacity-50">Choose files</button>
      <input ref={fileRef} type="file" accept={asSource === "upload" ? undefined : "image/*"} multiple className="hidden" disabled={busy}
        onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files, asSource); e.target.value = ""; }} />
    </div>
  );

  // System categories (for the upload dialog + the All rail): System folder names + pack groups.
  const sysCatName = (fid: string | null | undefined): string => {
    const nameById = new Map(systemFolders.map((f) => [f.id, f.name] as const));
    const parentById = new Map(systemFolders.map((f) => [f.id, f.parent_id] as const));
    let cur = fid ?? null, last = "", guard = 0;
    while (cur && guard++ < 12) { const nm = nameById.get(cur); if (!nm) break; last = nm; cur = parentById.get(cur) ?? null; }
    return last || "Uncategorized";
  };
  const systemCategories = Array.from(new Set([
    ...system.map((s) => s.group || "Icons"),
    ...systemMedia.flatMap((m) => (m.tags && m.tags.length) ? m.tags : [sysCatName(m.folder_id)]),
  ])).filter(Boolean).sort();

  // Typeahead for the upload dialog: while typing, suggest up to 4 matching existing tags.
  const tagSuggest = tagInput.trim()
    ? systemCategories.filter((c) => c.toLowerCase().includes(tagInput.trim().toLowerCase()) && !uploadTags.includes(c)).slice(0, 4)
    : [];
  const addUploadTag = (t: string) => { const v = t.trim().toLowerCase(); if (v && !uploadTags.includes(v)) setUploadTags((x) => [...x, v]); setTagInput(""); };

  const activeSource = SOURCE_OPTS.find((s) => s.id === sourceId) ?? SOURCES[1];
  const pct = Math.min(100, (usage.bytes / quota) * 100);

  return (
    <div className={insert ? "" : "mx-auto max-w-6xl"}>
      {/* Our own toast (never the browser alert). */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[70] max-w-sm">
          <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm shadow-2xl ${toast.kind === "ok" ? "bg-emerald-600 text-white" : toast.kind === "err" ? "bg-rose-600 text-white" : "bg-slate-900 text-white"}`}>
            <span className="shrink-0">{toast.kind === "ok" ? "✓" : toast.kind === "err" ? "⚠" : "ℹ"}</span>
            <span className="whitespace-pre-wrap">{toast.text}</span>
            <button onClick={() => setToast(null)} className="ml-2 shrink-0 opacity-70 hover:opacity-100">✕</button>
          </div>
        </div>
      )}
      {/* Our own confirm dialog (never window.confirm). */}
      {confirmState && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4" onClick={() => { confirmState.resolve(false); setConfirmState(null); }}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{confirmState.text}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => { confirmState.resolve(false); setConfirmState(null); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { confirmState.resolve(true); setConfirmState(null); }} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e40af]">Confirm</button>
            </div>
          </div>
        </div>
      )}
      {/* Upload progress popup. */}
      {uploadProgress && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-2xl">
            <p className="text-sm font-medium text-slate-800">
              {uploadProgress.done >= uploadProgress.total ? "Finishing up…" : uploadProgress.done === 0 ? `Uploading ${uploadProgress.total} file${uploadProgress.total === 1 ? "" : "s"}…` : `Uploading ${uploadProgress.done} of ${uploadProgress.total}…`}
            </p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-[#1e3a8a] transition-all duration-300" style={{ width: `${uploadProgress.total ? Math.max(8, Math.round((uploadProgress.done / uploadProgress.total) * 100)) : 8}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-400">Please keep this tab open.</p>
          </div>
        </div>
      )}
      {/* Upload destination chooser (admin/staff only). Simple yes/no: System or My media. */}
      {pendingUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setPendingUpload(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900">Where should these go?</h3>
            <p className="mt-1 text-sm text-slate-500">
              You&apos;re adding <b>{pendingUpload.length}</b> file{pendingUpload.length === 1 ? "" : "s"}. Choose a destination.
            </p>
            <div className="mt-5 grid gap-3">
              {/* System library — choose a category (existing / new / Auto), then upload. */}
              <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">🔒</span>
                  <span>
                    <span className="block font-medium text-slate-900">System library</span>
                    <span className="block text-xs text-slate-500">Shared with all tenants · read-only. A separate copy — deleting it never affects anyone&apos;s own media. Pick a category:</span>
                  </span>
                </div>
                {uploadTags.length > 0 && (
                  <p className="mt-2 text-[11px] text-emerald-600">✨ Auto-tagged from the file name{pendingUpload.length === 1 ? "" : "s"} — adjust below.</p>
                )}
                {/* Chosen tags */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <button onClick={() => setUploadTags([])}
                    className={`rounded-full px-2 py-0.5 text-[11px] ${uploadTags.length === 0 ? "bg-[#1e3a8a] text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                    title="No tags — let AI categorize each image">✨ Auto</button>
                  {uploadTags.map((t) => (
                    <button key={t} onClick={() => setUploadTags((x) => x.filter((y) => y !== t))}
                      className="rounded-full bg-[#1e3a8a] px-2 py-0.5 text-[11px] text-white" title="Remove tag">{t} ✕</button>
                  ))}
                </div>
                {/* Type-to-search tag input with live suggestions (no big chip wall). */}
                <div className="relative mt-2">
                  <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUploadTag(tagInput); } }}
                    placeholder="Type a tag, then pick or press ↵"
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs" />
                  {tagInput.trim() && (
                    <div className="absolute left-0 right-0 z-10 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                      {tagSuggest.map((s) => (
                        <button key={s} onClick={() => addUploadTag(s)} className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50">{s}</button>
                      ))}
                      {!tagSuggest.includes(tagInput.trim().toLowerCase()) && (
                        <button onClick={() => addUploadTag(tagInput)} className="block w-full border-t border-slate-100 px-3 py-1.5 text-left text-xs font-medium text-[#1e3a8a] hover:bg-slate-50">+ Add &quot;{tagInput.trim().toLowerCase()}&quot;</button>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => { const f = pendingUpload; setPendingUpload(null); doSystemUpload(f); }}
                  className="mt-3 w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-700">
                  Upload to System · {uploadTags.length ? uploadTags.join(", ") : "Auto-tag"}
                </button>
              </div>
              <button
                onClick={() => { const f = pendingUpload; setPendingUpload(null); doTenantUpload(f, "upload"); }}
                className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-[#1e3a8a]/40 hover:bg-slate-50">
                <span className="text-xl">🙋</span>
                <span>
                  <span className="block font-medium text-slate-900">My media only</span>
                  <span className="block text-xs text-slate-500">Private to this account. No one else can see or use them.</span>
                </span>
              </button>
            </div>
            <button onClick={() => setPendingUpload(null)} className="mt-4 w-full text-center text-sm text-slate-400 hover:text-slate-600">Cancel</button>
          </div>
        </div>
      )}

      {/* Top bar (polished): title · storage pill · AI · view toggle. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {!insert
          ? <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Media Storage</h1>
              {whoami && (
                <span
                  title={whoami.email ? `Server sees you as ${whoami.email}${whoami.role ? ` (${whoami.role})` : ""}` : "No signed-in session detected (no token cookie)"}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${whoami.isManager ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {whoami.role === "superadmin" ? `◆ Superadmin · ${whoami.email}`
                    : whoami.role === "admin" ? `★ Admin · ${whoami.email}`
                    : whoami.role === "staff" ? `● Staff · ${whoami.email}`
                    : whoami.email ? `Not platform team · ${whoami.email}` : "Not signed in"}
                </span>
              )}
            </div>
          : <div className="text-sm text-slate-400">Click an asset to insert it.</div>}
        <div className="flex items-center gap-2">
          {/* Storage usage pill */}
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm" title={`${fmtBytes(usage.bytes)} of ${fmtBytes(quota)} used`}>
            <span className="grid h-4 w-4 place-items-center rounded bg-[#1e3a8a]/10 text-[9px] text-[#1e3a8a]">☁</span>
            <span className="font-medium">{fmtBytes(usage.bytes)}</span>
            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200"><span className="block h-full bg-[#1e3a8a]" style={{ width: `${pct}%` }} /></span>
          </div>
          <button onClick={() => selectSource(SOURCES.find((s) => s.id === "ai")!)} title="AI images"
            className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-[#7c3aed] shadow-sm hover:bg-slate-50">✨</button>
          <div className="flex overflow-hidden rounded-lg border border-slate-200">
            <button onClick={() => setView("grid")} className={`px-2.5 py-1.5 text-sm ${view === "grid" ? "bg-[#1e3a8a] text-white" : "bg-white text-slate-500"}`} title="Grid">▦</button>
            <button onClick={() => setView("list")} className={`px-2.5 py-1.5 text-sm ${view === "list" ? "bg-[#1e3a8a] text-white" : "bg-white text-slate-500"}`} title="List">≣</button>
          </div>
        </div>
      </div>

      {/* Controls row: source dropdown · search · sort · website filter. */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* Source picker (the leading builder dropdown) */}
        <div className="relative">
          <button onClick={() => setSourceOpen((o) => !o)}
            className="flex w-56 items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:border-slate-400">
            <span className="flex items-center gap-2"><span>{activeSource.icon}</span>{activeSource.label}</span>
            <span className="text-slate-400">▾</span>
          </button>
          {sourceOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSourceOpen(false)} />
              <div className="absolute left-0 z-20 mt-1 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                {SOURCES.map((o) => (
                  <div key={o.id}>
                    <button onClick={() => selectSource(o)}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 ${sourceId === o.id ? "bg-[#1e3a8a]/5 text-[#1e3a8a]" : "text-slate-700"}`}>
                      <span className="flex items-center gap-2"><span className="w-5 text-center">{o.icon}</span><span>{o.label}{o.sub && <span className="block text-[10px] text-slate-400">{o.sub}</span>}</span></span>
                      {sourceId === o.id && <span className="text-[#1e3a8a]">✓</span>}
                    </button>
                    {o.children?.map((c) => (
                      <button key={c.id} onClick={() => selectSource(c)}
                        className={`flex w-full items-center justify-between gap-2 py-1.5 pl-9 pr-3 text-left text-sm hover:bg-slate-50 ${sourceId === c.id ? "bg-[#1e3a8a]/5 text-[#1e3a8a]" : "text-slate-600"}`}>
                        <span className="flex items-center gap-2"><span className="w-5 text-center text-xs">{c.icon}</span><span>{c.label}</span></span>
                        {sourceId === c.id && <span className="text-[#1e3a8a]">✓</span>}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        {/* Centered search */}
        <div className="relative min-w-[200px] flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search media or explore stock images…"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm" />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-600">
          <option value="new">Modified: Newest First</option><option value="old">Oldest First</option><option value="name">Name: A–Z</option>
        </select>
        {websites.length > 1 && (
          <select value={siteFilter ?? ""} onChange={(e) => setSiteFilter(e.target.value || null)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-600" title="Filter by website">
            <option value="">All websites</option>
            {websites.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        )}
      </div>

      {/* (legacy tab row removed — replaced by the source dropdown above) */}

      <div className="flex gap-5">
      {/* Folder rail (polished). Applies to My Uploads; "All files" = root view. */}
      {tab === "upload" && (
        <FolderTreeRail
          folders={folders} current={folderId} onSelect={setFolderId}
          onNew={newFolder} onRename={renameF} onDelete={deleteF} onMoveFolder={moveFolderTo}
          dragOver={dragOverFolder} setDragOver={setDragOverFolder} onDropFile={dropToFolder}
        />
      )}
      <div className="min-w-0 flex-1">

      {tab === "all" && (<>{BulkBar}
        {filtered.length === 0 ? <p className="py-10 text-center text-sm text-slate-400">No media yet. Upload, import, or generate to get started.</p> : <Grid>{filtered.map((m) => <Card key={m.id} m={m} />)}</Grid>}</>)}

      {tab === "upload" && (<><Dropzone asSource="upload" hint="Drag & drop files here to upload" />{Toolbar}{BulkBar}
        {filtered.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">No uploads yet.</p> : <Grid>{filtered.map((m) => <Card key={m.id} m={m} />)}</Grid>}</>)}

      {tab === "drive" && (<>
        <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-center"><p className="text-sm font-medium text-slate-700">Google Drive import</p><p className="mx-auto mt-1 max-w-md text-xs text-slate-500">Google Drive connects via OAuth in <b>Settings → Integrations</b> (coming soon) and never auto-connects. For now, download from Drive and drop the file here.</p></div>
        <Dropzone asSource="upload" hint="Upload a file from Google Drive" />{Toolbar}{BulkBar}</>)}

      {tab === "stock" && (<>
        <ProviderSearch provider={stockProvider} setProvider={setStockProvider} onPick={(url) => insert ? pick(url) : copyLink(url, url)} />
        <div className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Saved free images</div>
        {Toolbar}{BulkBar}{filtered.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">No saved images yet — search above, or add one in <b>By URL</b>.</p> : <Grid>{filtered.map((m) => <Card key={m.id} m={m} />)}</Grid>}</>)}

      {tab === "ai" && (<>
        <AiGenerate tenantId={tenantId} onGenerated={() => { reloadMedia(); reloadUsage(); }} />
        {(isSysManager || isAdmin) && <div className="mt-3"><AdminAiUsage /></div>}
        {isSuperAdmin && <div className="mt-3"><AuditLog /></div>}
        <div className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Or upload AI-made images</div>
        <Dropzone asSource="ai" hint="Upload an AI-generated image" />{Toolbar}{BulkBar}
        {filtered.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">No AI images yet.</p> : <Grid>{filtered.map((m) => <Card key={m.id} m={m} />)}</Grid>}</>)}

      {tab === "canva" && (<>
        <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-center"><p className="text-sm font-medium text-slate-700">Canva import</p><p className="mx-auto mt-1 max-w-md text-xs text-slate-500">Canva connects via OAuth (coming soon) and never auto-connects. Export from Canva and drop the file here — it’s tagged as a Canva import.</p></div>
        <Dropzone asSource="canva" hint="Upload a Canva export" />{Toolbar}{BulkBar}
        {filtered.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">No Canva imports yet.</p> : <Grid>{filtered.map((m) => <Card key={m.id} m={m} />)}</Grid>}</>)}

      {tab === "url" && (
        <div className="flex max-w-xl flex-col gap-3">
          <label className="text-sm font-medium text-slate-700">Image URL</label>
          <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://…" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          {urlInput && /^https?:\/\//.test(urlInput) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={urlInput} alt="preview" className="max-h-56 w-auto rounded border border-slate-200" />
          )}
          <div className="flex gap-2">
            {insert && <button onClick={() => saveUrl(true)} disabled={!/^https?:\/\//.test(urlInput)} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm text-white disabled:opacity-50">Use this image</button>}
            <button onClick={() => saveUrl(false)} disabled={busy || !/^https?:\/\//.test(urlInput)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:opacity-50">Save to Free Images</button>
          </div>
        </div>
      )}

      {tab === "system" && (() => {
        // "All" = the shared System library. A category RAIL filters a FLAT grid (scales to
        // thousands of images): click a category to filter; "All files" shows everything,
        // ungrouped. Unifies the inline starter packs (category = group) and the AI/uploaded
        // System photos (category = their top-level /System folder).
        const nameById = new Map(systemFolders.map((f) => [f.id, f.name] as const));
        const parentById = new Map(systemFolders.map((f) => [f.id, f.parent_id] as const));
        const topCat = (fid: string | null | undefined): string => {
          let cur = fid ?? null; let last = ""; let guard = 0;
          while (cur && guard++ < 12) { const nm = nameById.get(cur); if (!nm) break; last = nm; cur = parentById.get(cur) ?? null; }
          return last || "Uncategorized";
        };
        type SItem = { id: string; url: string; filename: string; keywords: string; groups: string[]; isMedia: boolean; createdAt: string };
        const sysItems: SItem[] = [
          ...system.map((s) => {
            const kw = `${s.group || "Icons"} ${s.filename}`;
            return { id: s.id, url: s.url, filename: s.filename, keywords: kw, groups: groupsForKeywords(kw), isMedia: false, createdAt: "" };
          }),
          ...systemMedia.map((m) => {
            const tags = (m.tags && m.tags.length) ? m.tags : [topCat(m.folder_id)];
            const kw = `${tags.join(" ")} ${m.filename ?? ""}`;
            return { id: m.id, url: m.url, filename: m.filename ?? "", keywords: kw, groups: groupsForKeywords(kw), isMedia: true, createdAt: m.created_at ?? "" };
          }),
        ];
        // Rail = a few PINNED categories always shown, then the most-populated others, capped 10.
        const groupCounts = new Map<string, number>();
        for (const it of sysItems) for (const g of it.groups) groupCounts.set(g, (groupCounts.get(g) ?? 0) + 1);
        const PINNED_CATS = ["People", "Office", "Cities"];
        const rest = Array.from(groupCounts.entries()).filter(([g]) => !PINNED_CATS.includes(g)).sort((a, b) => b[1] - a[1]).map(([g]) => g);
        const cats = [...PINNED_CATS, ...rest].slice(0, 10);
        const countFor = (c: string) => groupCounts.get(c) ?? 0;
        const ql = q.toLowerCase();
        // Filter by the selected broad group; SEARCH still matches the exact keywords/filename.
        // Then apply the top-bar sort (Newest / Oldest / Name) — same control as elsewhere.
        const shown = sysItems
          .filter((i) => (!systemCat || i.groups.includes(systemCat)) && (!q || i.keywords.toLowerCase().includes(ql)))
          .sort((a, b) =>
            sort === "name" ? a.filename.localeCompare(b.filename)
            : sort === "old" ? a.createdAt.localeCompare(b.createdAt)
            : b.createdAt.localeCompare(a.createdAt));
        return (
          <div className="flex gap-5">
            {/* Category rail (read-only). Click to filter; "All files" = everything, flat. */}
            <aside className="w-48 shrink-0">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Categories</div>
              <button onClick={() => setSystemCat(null)}
                className={`mb-0.5 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${systemCat === null ? "bg-[#1e3a8a]/10 font-medium text-[#1e3a8a]" : "text-slate-600 hover:bg-slate-50"}`}>
                <span>All files</span><span className="text-xs text-slate-400">{sysItems.length}</span>
              </button>
              {cats.map((c) => (
                <button key={c} onClick={() => setSystemCat(c)}
                  className={`mb-0.5 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${systemCat === c ? "bg-[#1e3a8a]/10 font-medium text-[#1e3a8a]" : "text-slate-600 hover:bg-slate-50"}`}>
                  <span className="truncate">{c}</span><span className="ml-2 shrink-0 text-xs text-slate-400">{countFor(c)}</span>
                </button>
              ))}
            </aside>

            {/* Flat, filtered grid */}
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex items-center gap-2">
                <p className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-500">🔒 System</span>
                  Shared library — free to use. Copy a link, or import into your folders.
                </p>
                {(isSysManager || isAdmin) && (
                  <div className="ml-auto flex items-center gap-1.5">
                    {isSysManager && (
                      <>
                        <input ref={sysBulkRef} type="file" multiple accept="image/*" className="hidden"
                          onChange={(e) => { if (e.target.files?.length) { const arr = Array.from(e.target.files); setUploadTags(tagsFromFiles(arr)); setPendingUpload(arr); } e.target.value = ""; }} />
                        <button onClick={() => sysBulkRef.current?.click()} disabled={bulkBusy}
                          title="Upload to the System library — you'll choose tags next"
                          className="rounded-md border border-sky-300 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-50">
                          {bulkBusy ? "Uploading…" : "⬆ Upload to System"}
                        </button>
                      </>
                    )}
                    <button onClick={tagFromNames} disabled={tagBusy}
                      title="Tag all System images from their filenames — free, no AI"
                      className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
                      {tagBusy ? "Tagging…" : "🏷️ Tag from names"}
                    </button>
                    {isSuperAdmin && (
                      <button onClick={declutter} disabled={declutterBusy}
                        title="Superadmin: remove old grid/set images, keep single-subject assets"
                        className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50">
                        {declutterBusy ? "Working…" : "🧹 Declutter"}
                      </button>
                    )}
                  </div>
                )}
              </div>
              {/* Bulk-tag bar: select System images (checkbox) → add tags to all at once. */}
              {(isSysManager || isAdmin) && sysSelected.size > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-[#1e3a8a]/5 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-700">{sysSelected.size} selected</span>
                  <input value={sysTagInput} onChange={(e) => setSysTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") applySysTags(); }}
                    placeholder="tags, comma-separated…" className="min-w-[180px] flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs" />
                  <button onClick={applySysTags} disabled={sysTagBusy || !sysTagInput.trim()} className="rounded-md bg-[#1e3a8a] px-3 py-1 text-xs font-medium text-white hover:bg-[#1e40af] disabled:opacity-50">{sysTagBusy ? "Adding…" : "Add tags"}</button>
                  <button onClick={() => setSysSelected(new Set())} className="text-xs text-slate-500 hover:underline">Clear</button>
                </div>
              )}
              {shown.length === 0
                ? <p className="py-10 text-center text-sm text-slate-400">No system assets{systemCat ? ` in ${systemCat}` : ""}{q ? ` matching “${q}”` : ""}.</p>
                : <Grid>{shown.map((i) => (
                    <div key={i.id} className={`group relative overflow-hidden rounded-lg border ${sysSelected.has(i.id) ? "border-[#1e3a8a] ring-2 ring-[#1e3a8a]/40" : "border-slate-200"}`}>
                      {i.isMedia && (isSysManager || isAdmin) && (
                        <input type="checkbox" checked={sysSelected.has(i.id)} onChange={() => toggleSysSel(i.id)} title="Select for bulk tagging"
                          className={`absolute left-2 top-2 z-10 h-4 w-4 ${sysSelected.has(i.id) ? "" : "opacity-0 group-hover:opacity-100"}`} />
                      )}
                      <button type="button" onClick={() => insert ? pick(i.url) : copyLink(i.url, i.id)} className="block w-full bg-[repeating-conic-gradient(#f8fafc_0%_25%,#fff_0%_50%)] bg-[length:16px_16px]" title={insert ? "Insert" : "Copy link"}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={i.url} alt={i.filename} className="h-28 w-full object-contain p-2" />
                      </button>
                      <div className="flex items-center justify-between gap-1 bg-white px-1.5 py-0.5 text-[10px] text-slate-500">
                        <span className="truncate">{i.filename}</span>
                        <span className="flex shrink-0 items-center gap-1">
                          <button onClick={() => copyLink(i.url, i.id)} title="Copy link" className="text-slate-500 hover:text-[#1e3a8a]">{copied === i.id ? "✓" : "🔗"}</button>
                          {i.isMedia && <button onClick={() => importToMine(i.id)} title="Copy to My Media" className="text-slate-500 hover:text-[#1e3a8a]">＋</button>}
                          {i.isMedia && isSuperAdmin && <button onClick={() => moveSystemToMine(i.id)} title="Move to My Media (remove from public library — for your private images)" className="text-slate-500 hover:text-[#1e3a8a]">→</button>}
                          {i.isMedia && isSuperAdmin && <button onClick={() => adminDeleteSystem(i.id, i.filename)} title="Delete (superadmin)" className="text-slate-400 hover:text-red-600">✕</button>}
                        </span>
                      </div>
                    </div>
                  ))}</Grid>}
            </div>
          </div>
        );
      })()}

      </div>
      </div>
    </div>
  );
}

/**
 * AI image generation (Copilot Media #3). Prompt + style/aspect/count controls + the
 * one-click Starter Pack presets (Ali's batch prompts). KEYS-GATED: with no image-gen
 * key configured it shows a clear "connect a key" state and makes zero external calls
 * and zero charges. When a key exists, generateAiImages() is the single place to wire
 * the provider; results save to /uploads/ai (source=ai).
 */
/** Admin/staff: per-tenant AI usage totals (collapsible). */
function AdminAiUsage() {
  const [rows, setRows] = useState<TenantAiUsage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open && !loaded) getAllAiUsage().then((r) => { setRows(r); setLoaded(true); }).catch(() => setLoaded(true));
  }, [open, loaded]);
  return (
    <div className="rounded-lg border border-slate-200">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
        <span>📊 AI usage by tenant <span className="text-xs font-normal text-slate-400">(admin)</span></span>
        <span className="text-slate-400">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="border-t border-slate-100 p-2">
          {!loaded ? <p className="p-2 text-xs text-slate-400">Loading…</p>
            : rows.length === 0 ? <p className="p-2 text-xs text-slate-400">No AI usage recorded yet.</p>
            : (
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400"><tr><th className="py-1">Tenant</th><th className="py-1 text-right">This month</th><th className="py-1 text-right">All-time</th><th className="py-1 text-right">Month $</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.tenantId} className="border-t border-slate-50">
                      <td className="py-1 text-slate-700">{r.name}</td>
                      <td className="py-1 text-right">{r.monthUnits}</td>
                      <td className="py-1 text-right text-slate-400">{r.totalUnits}</td>
                      <td className="py-1 text-right font-medium text-slate-700">${(r.monthCostCents / 100).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      )}
    </div>
  );
}

function AuditLog() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof getPlatformAudit>>>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open && !loaded) getPlatformAudit(100).then((r) => { setRows(r); setLoaded(true); }).catch(() => setLoaded(true));
  }, [open, loaded]);
  const label = (a: string) =>
    a === "impersonation.start" ? "▶ Act as" : a === "impersonation.stop" ? "⏹ Exit act-as" : a === "system.delete" ? "🗑 System delete" : a;
  return (
    <div className="rounded-lg border border-slate-200">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
        <span>🛡️ Platform audit log <span className="text-xs font-normal text-slate-400">(superadmin)</span></span>
        <span className="text-slate-400">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="border-t border-slate-100 p-2">
          {!loaded ? <p className="p-2 text-xs text-slate-400">Loading…</p>
            : rows.length === 0 ? <p className="p-2 text-xs text-slate-400">No audit events yet.</p>
            : (
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400"><tr><th className="py-1">When</th><th className="py-1">Action</th><th className="py-1">Actor</th><th className="py-1">Target</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-slate-50">
                      <td className="py-1 text-slate-400">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="py-1 text-slate-700">{label(r.action)}</td>
                      <td className="py-1 text-slate-600">{r.actor_email ?? "—"}</td>
                      <td className="py-1 text-slate-600">{r.target_email ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      )}
    </div>
  );
}

function AiGenerate({ tenantId, onGenerated }: { tenantId: string; onGenerated?: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("auto");
  const [aspect, setAspect] = useState("1:1");
  const [count, setCount] = useState(4);
  const [busy, setBusy] = useState(false);
  const [hasKey, setHasKey] = useState<boolean>(true);
  const [message, setMessage] = useState("");
  const [results, setResults] = useState<{ url: string }[]>([]);
  const [usage, setUsage] = useState<AiUsage | null>(null);

  const loadUsage = () => getAiUsage(tenantId).then(setUsage).catch(() => {});
  useEffect(() => { loadUsage(); /* eslint-disable-next-line */ }, [tenantId]);

  async function run() {
    if (!prompt.trim()) return;
    setBusy(true); setMessage(""); setResults([]);
    try {
      const r = await generateAiImages(tenantId, prompt, { count, aspect, style });
      setHasKey(r.hasKey); setMessage(r.message ?? "");
      if (r.images.length) { setResults(r.images); onGenerated?.(); loadUsage(); }
    } catch (e: any) { setMessage(e?.message ?? "Generation failed."); }
    finally { setBusy(false); }
  }

  const groups: string[] = [];
  for (const p of AI_STARTER_PACKS) if (!groups.includes(p.group)) groups.push(p.group);

  return (
    <div className="flex flex-col gap-3">
      {usage && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-100 bg-violet-50/70 px-3 py-2 text-xs text-violet-800">
          <span>⚡ AI images this month: <b>{usage.monthUnits}</b> <span className="text-violet-400">· {usage.totalUnits} all-time</span></span>
          <span className="text-violet-500">
            {usage.priceCents > 0
              ? <>Billed at ${(usage.priceCents / 100).toFixed(2)}/image — this month: <b>${(usage.monthCostCents / 100).toFixed(2)}</b></>
              : "Usage is metered for billing (no charge configured yet)."}
          </span>
        </div>
      )}
      <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
        <label className="text-sm font-medium text-slate-700">Describe the image(s) to generate</label>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="e.g. modern office lobby, bright, photorealistic, no people, 16:9"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <select value={style} onChange={(e) => setStyle(e.target.value)} className="rounded border border-slate-300 px-2 py-1">
            <option value="auto">Auto style</option><option value="photo">Photorealistic</option><option value="flat">Flat</option><option value="gradient">Gradient</option><option value="3d">3D</option><option value="line">Line art</option>
          </select>
          <select value={aspect} onChange={(e) => setAspect(e.target.value)} className="rounded border border-slate-300 px-2 py-1">
            <option value="1:1">1:1 square</option><option value="16:9">16:9 wide</option><option value="4:3">4:3</option><option value="9:16">9:16 tall</option>
          </select>
          <label className="flex items-center gap-1">Count
            <input type="number" min={1} max={6} value={count} onChange={(e) => setCount(Math.max(1, Math.min(6, +e.target.value)))} className="w-14 rounded border border-slate-300 px-2 py-1" />
          </label>
          <button onClick={run} disabled={busy || !prompt.trim()} className="ml-auto rounded-lg bg-[#1e3a8a] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#1e40af] disabled:opacity-50">{busy ? "Generating…" : "✨ Generate"}</button>
        </div>
        {!hasKey && message && (
          <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{message}</div>
        )}
        {hasKey && message && (
          <div className="mt-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">{message}</div>
        )}
        {results.length > 0 && (
          <div className="mt-3">
            <div className="mb-1 text-xs font-medium text-emerald-700">✓ Generated {results.length} image{results.length === 1 ? "" : "s"} — saved to your media.</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {results.map((im, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={im.url} alt={`generated ${i + 1}`} className="aspect-square w-full rounded-lg border border-slate-200 object-cover" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* One-click Starter Pack presets (fill the prompt; generate when a key is connected). */}
      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Starter Pack presets</div>
        {groups.map((g) => (
          <div key={g} className="mb-2">
            <div className="mb-1 text-[11px] font-medium text-slate-500">{g}</div>
            <div className="flex flex-wrap gap-1.5">
              {AI_STARTER_PACKS.filter((p) => p.group === g).map((p: AiPreset) => (
                <button key={p.id} type="button" onClick={() => setPrompt(p.prompt)} title={p.prompt}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 hover:border-[#1e3a8a]/40 hover:text-[#1e3a8a]">
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="mt-1 text-[10px] text-slate-400">Presets fill the prompt above. Generation runs only when your image‑gen key is connected — we never auto‑connect or charge.</p>
      </div>
    </div>
  );
}

/**
 * Stock provider search SCAFFOLD (keys-gated). Search bar + provider toggle + results
 * grid + stubbed pagination, wired to searchProvider(). Until the tenant adds a key it
 * shows a clear "add your key" state and makes zero external calls.
 */
function ProviderSearch({ onPick, provider, setProvider }: { onPick: (url: string) => void; provider: StockProvider; setProvider: (p: StockProvider) => void }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ProviderResult[]>([]);
  const [hasKey, setHasKey] = useState<boolean>(true);
  const [message, setMessage] = useState<string>("");

  async function run(p = 1) {
    setBusy(true);
    try { const r = await searchProvider(provider, query, p); setResults(r.results); setHasKey(r.hasKey); setMessage(r.message ?? ""); setPage(r.page); }
    finally { setBusy(false); }
  }
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-md border border-slate-300 text-sm">
          {(["unsplash", "pixabay"] as StockProvider[]).map((p) => (
            <button key={p} onClick={() => setProvider(p)} className={`px-3 py-1.5 capitalize ${provider === p ? "bg-[#1e3a8a] text-white" : "bg-white text-slate-600"}`}>{p}</button>
          ))}
        </div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run(1)}
          placeholder="Search free stock images…" className="min-w-0 flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm" />
        <button onClick={() => run(1)} disabled={busy} className="rounded-lg bg-[#1e3a8a] px-4 py-1.5 text-sm text-white disabled:opacity-50">{busy ? "Searching…" : "Search"}</button>
      </div>

      {!hasKey && message && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{message}</div>
      )}

      {results.length > 0 && (
        <>
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {results.map((r) => (
              <button key={r.id} onClick={() => onPick(r.url)} className="overflow-hidden rounded-lg border border-slate-200 hover:border-[#1e3a8a]" title={r.alt ?? "Insert"}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.thumb} alt={r.alt ?? ""} className="h-24 w-full object-cover" />
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-center gap-3 text-sm">
            <button onClick={() => run(Math.max(1, page - 1))} disabled={busy || page <= 1} className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40">Prev</button>
            <span className="text-slate-400">Page {page}</span>
            <button onClick={() => run(page + 1)} disabled={busy} className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40">Next</button>
          </div>
        </>
      )}
    </div>
  );
}

/** Left folder rail: "All files" + nested tree (parent_id) + New Folder + rename/delete. */
function FolderTreeRail({
  folders, current, onSelect, onNew, onRename, onDelete, onMoveFolder, dragOver, setDragOver, onDropFile,
}: {
  folders: MediaFolder[]; current: string | null; onSelect: (id: string | null) => void;
  onNew: () => void; onRename: (f: MediaFolder) => void; onDelete: (f: MediaFolder) => void;
  onMoveFolder: (folderId: string, targetParentId: string | null) => void;
  dragOver: string | null | undefined; setDragOver: (v: string | null | undefined) => void;
  onDropFile: (folderId: string | null, e: React.DragEvent) => void;
}) {
  const childrenOf = (pid: string | null) => folders.filter((f) => (f.parent_id ?? null) === pid);
  // polished drop-target: highlight while a FILE or a FOLDER hovers over a folder/root.
  const dropProps = (target: string | null) => ({
    onDragOver: (e: React.DragEvent) => {
      const t = e.dataTransfer.types;
      if (t.includes("text/abc-media") || t.includes("text/abc-folder")) { e.preventDefault(); setDragOver(target); }
    },
    onDragLeave: () => setDragOver(undefined),
    onDrop: (e: React.DragEvent) => {
      setDragOver(undefined);
      const fid = e.dataTransfer.getData("text/abc-folder");
      if (fid) { e.preventDefault(); onMoveFolder(fid, target); return; }
      onDropFile(target, e);
    },
  });
  const hot = (target: string | null) => dragOver === target ? "bg-[#1e3a8a]/15 font-semibold ring-1 ring-[#1e3a8a]/40" : "";
  const Row = ({ f, depth }: { f: MediaFolder; depth: number }) => (
    <div>
      <div {...dropProps(f.id)}
        draggable
        onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/abc-folder", f.id); }}
        className={`group flex cursor-grab items-center gap-1 rounded px-2 py-1 text-sm ${hot(f.id)} ${current === f.id ? "bg-[#1e3a8a]/10 text-[#1e3a8a]" : "text-slate-600 hover:bg-slate-100"}`}
        style={{ paddingLeft: 8 + depth * 12 }}>
        <button onClick={() => onSelect(f.id)} className="flex min-w-0 flex-1 items-center gap-1 text-left">
          <span className={dragOver === f.id ? "" : "text-slate-400"}>📁</span><span className="truncate">{f.name}</span>
        </button>
        <button onClick={() => onRename(f)} className="opacity-0 group-hover:opacity-100" title="Rename">✎</button>
        <button onClick={() => onDelete(f)} className="text-red-500 opacity-0 group-hover:opacity-100" title="Delete">🗑</button>
      </div>
      {childrenOf(f.id).map((c) => <Row key={c.id} f={c} depth={depth + 1} />)}
    </div>
  );
  return (
    <div className="w-48 shrink-0">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-[11px] uppercase tracking-wide text-slate-400">Folders</span>
        <button onClick={onNew} className="rounded px-1.5 py-0.5 text-xs text-[#1e3a8a] hover:bg-[#1e3a8a]/10" title="New folder">＋</button>
      </div>
      <button {...dropProps(null)} onClick={() => onSelect(null)}
        className={`mb-1 flex w-full items-center gap-1 rounded px-2 py-1 text-sm ${hot(null)} ${current == null ? "bg-[#1e3a8a]/10 text-[#1e3a8a]" : "text-slate-600 hover:bg-slate-100"}`}>
        <span className="text-slate-400">🗂</span> All files
      </button>
      {childrenOf(null).map((f) => <Row key={f.id} f={f} depth={0} />)}
      {folders.length === 0 && <p className="px-2 py-1 text-[11px] text-slate-400">No folders yet.</p>}
    </div>
  );
}
