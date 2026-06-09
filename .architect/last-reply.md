Here are the decisive, build-ready rulings for image ingestion and AI image creation during the website build pipeline.

---
### 1. Ingest External Image Helper

**RULING 132: `ingestExternalImage` Contract and Dedup Strategy**

A new helper `ingestExternalImage` will be created, using a deterministic storage path for deduplication.

**`ingestExternalImage` Contract:**

```typescript
// lib/server/media-ingestion.ts (new server-only module)

import { db } from './supabase'; // Supabase client
import { putObject } from './storage'; // Existing helper
import { recordAiUsage } from './ai-metering'; // Existing helper
import { ImageGenResult } from './ai-image-generation'; // Existing type

export type IngestImageOptions = {
  websiteId: string;
  folderId?: string; // Optional: specific folder to store in
  sourceType: 'external_url' | 'ai_generated' | 'stock_image'; // For website_media.tags
  context?: Record<string, any>; // Additional context for auditing/metering
};

export type IngestedMedia = {
  id: string; // website_media.id
  url: string; // public URL of the stored image
  storagePath: string; // website_media.storage_path
  isNew: boolean; // True if the image was newly ingested, false if deduplicated
};

/**
 * Ingests an image from a source URL into the tenant's Media Library.
 * Handles deduplication, content type/size guards, and database insertion.
 *
 * @param tenantId The ID of the tenant.
 * @param srcUrl The external URL of the image to ingest.
 * @param options Ingestion options including websiteId, folderId, sourceType, context.
 * @returns An IngestedMedia object or null if ingestion fails (e.g., invalid type, too large).
 */
export async function ingestExternalImage(
  tenantId: string,
  srcUrl: string,
  options: IngestImageOptions
): Promise<IngestedMedia | null> {
  const { websiteId, folderId, sourceType, context } = options;

  // 1. Determine deterministic storage path for deduplication
  const urlHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(srcUrl))
    .then(hashBuffer => Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join(''));
  const urlExtension = srcUrl.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg'; // Basic extension guess
  const storagePath = `${tenantId}/uploads/imported/${urlHash}.${urlExtension}`;

  // 2. Deduplication check
  const { data: existingMedia, error: fetchError } = await db.from('website_media')
    .select('id, url, storage_path')
    .eq('tenant_id', tenantId)
    .eq('website_id', websiteId) // Scope by website_id for more precise deduplication
    .eq('storage_path', storagePath)
    .single();

  if (existingMedia && !fetchError) {
    return {
      id: existingMedia.id,
      url: existingMedia.url,
      storagePath: existingMedia.storage_path,
      isNew: false, // Image already exists
    };
  }

  // 3. Fetch image bytes and apply guards
  const response = await fetch(srcUrl, { signal: AbortSignal.timeout(10000) }); // 10s timeout
  if (!response.ok) {
    console.error(`Failed to fetch image from ${srcUrl}: ${response.statusText}`);
    return null;
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.startsWith('image/')) {
    console.warn(`Skipping ingestion: Invalid content type for ${srcUrl}: ${contentType}`);
    return null;
  }

  const imageBytes = await response.arrayBuffer();
  const sizeBytes = imageBytes.byteLength;
  const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB hard cap
  if (sizeBytes > MAX_IMAGE_SIZE_BYTES) {
    console.warn(`Skipping ingestion: Image from ${srcUrl} too large (${sizeBytes} bytes)`);
    return null;
  }

  // 4. Store in Supabase Storage
  const { ok, publicUrl, error: putError } = await putObject(storagePath, Buffer.from(imageBytes), contentType);
  if (!ok || putError) {
    console.error(`Failed to upload image to storage for ${srcUrl}:`, putError);
    return null;
  }

  // 5. Insert into website_media table
  const { data: newMedia, error: insertError } = await db.from('website_media')
    .insert({
      tenant_id: tenantId,
      website_id: websiteId,
      url: publicUrl,
      storage_path: storagePath,
      filename: storagePath.split('/').pop(),
      mime_type: contentType,
      size_bytes: sizeBytes,
      folder_id: folderId || null, // Use provided folderId or null
      tags: [sourceType], // Tag with source type
    })
    .select('id, url, storage_path')
    .single();

  if (insertError || !newMedia) {
    console.error(`Failed to insert website_media record for ${srcUrl}:`, insertError);
    // Attempt to delete object from storage if DB insert failed
    // await deleteObject(storagePath); // Assuming deleteObject helper
    return null;
  }

  // 6. Record AI usage if applicable (for telemetry, even if not LLM-generated)
  if (sourceType === 'ai_generated') {
    await recordAiUsage(tenantId, 'image_generation', 'wizard', { websiteId, context });
  }

  return {
    id: newMedia.id,
    url: newMedia.url,
    storagePath: newMedia.storage_path,
    isNew: true,
  };
}
```

**Folder:** Images will be stored in an auto-created "Imported" folder for external URLs, and the existing "AI" folder for AI-generated images. This requires a helper `getOrCreateMediaFolder(tenantId, websiteId, folderName)` that returns a `folder_id`.

---
### 2. Build Hook for Image Ingestion

**RULING 133: Post-Generation Image Ingestion Pass**

Image ingestion will occur as a dedicated post-generation pass, after `leanBuildStep` has produced the initial `BlockContent[]` array for a page.

**Integration Point:**
A new function `ingestPageImages(tenantId, websiteId, pageId, sections: BlockContent[]): Promise<BlockContent[]>` will be called immediately after `leanBuildStep` (Step 3) generates a page's sections, but *before* `saveDraft`.

**`ingestPageImages` Contract:**

```typescript
// lib/sites/image-ingestion-pass.ts (new server-only module)

import { BlockContent } from '../sections/normalize'; // Your normalized block type
import { IngestedMedia, ingestExternalImage } from '../server/media-ingestion';
import { getOrCreateMediaFolder } from '../server/media-folders'; // New helper

/**
 * Walks through a page's sections, ingests unique external image URLs,
 * and rewrites content URLs to use stored media URLs.
 *
 * @param tenantId The ID of the tenant.
 * @param websiteId The ID of the website.
 * @param pageId The ID of the page being processed.
 * @param sections The array of BlockContent for the page.
 * @returns The updated array of BlockContent with rewritten image URLs.
 */
export async function ingestPageImages(
  tenantId: string,
  websiteId: string,
  pageId: string,
  sections: BlockContent[]
): Promise<BlockContent[]> {
  const imageUrlsToIngest = new Set<string>();
  const urlMap = new Map<string, IngestedMedia>();
  const importedFolderId = await getOrCreateMediaFolder(tenantId, websiteId, 'Imported');

  // 1. Collect all unique external image URLs from sections
  const collectUrls = (blocks: BlockContent[]) => {
    for (const block of blocks) {
      // Example for hero background
      if (block.type === 'hero' && block.content?.hero?.background?.type === 'image' && block.content.hero.background.value) {
        if (block.content.hero.background.value.startsWith('http')) imageUrlsToIngest.add(block.content.hero.background.value);
      }
      // Example for gallery items
      if (block.type === 'gallery' && block.content?.gallery?.items) {
        for (const item of block.content.gallery.items) {
          if (item.url && item.url.startsWith('http')) imageUrlsToIngest.add(item.url);
        }
      }
      // Example for image blocks
      if (block.type === 'image' && block.content?.image?.url && block.content.image.url.startsWith('http')) {
        imageUrlsToIngest.add(block.content.image.url);
      }
      // Recursively collect from rows/columns
      if (block.type === 'row' && block.content?.row?.columns) {
        for (const col of block.content.row.columns) {
          if (col.blocks) collectUrls(col.blocks);
        }
      }
      // Check _style for background images (D-091)
      if (block.layout_style?.backgroundImage && block.layout_style.backgroundImage.startsWith('url(')) {
        const bgUrl = block.layout_style.backgroundImage.slice(5, -2); // Extract URL from url(...)
        if (bgUrl.startsWith('http')) imageUrlsToIngest.add(bgUrl);
      }
      // Builder: Extend this to cover all block types that can contain image URLs
    }
  };
  collectUrls(sections);

  // 2. Ingest unique URLs in parallel
  const ingestionPromises = Array.from(imageUrlsToIngest).map(async (srcUrl) => {
    const ingested = await ingestExternalImage(tenantId, srcUrl, {
      websiteId,
      folderId: importedFolderId.id,
      sourceType: 'external_url',
      context: { pageId, srcUrl },
    });
    if (ingested) {
      urlMap.set(srcUrl, ingested);
    }
  });
  await Promise.all(ingestionPromises);

  // 3. Rewrite URLs in section content
  const rewriteUrls = (blocks: BlockContent[]): BlockContent[] => {
    return blocks.map(block => {
      const newBlock = { ...block };
      // Example for hero background
      if (newBlock.type === 'hero' && newBlock.content?.hero?.background?.type === 'image' && newBlock.content.hero.background.value) {
        const mapped = urlMap.get(newBlock.content.hero.background.value);
        if (mapped) newBlock.content.hero.background.value = mapped.url;
      }
      // Example for gallery items
      if (newBlock.type === 'gallery' && newBlock.content?.gallery?.items) {
        newBlock.content.gallery.items = newBlock.content.gallery.items.map(item => {
          const mapped = urlMap.get(item.url);
          return mapped ? { ...item, url: mapped.url } : item;
        });
      }
      // Example for image blocks
      if (newBlock.type === 'image' && newBlock.content?.image?.url) {
        const mapped = urlMap.get(newBlock.content.image.url);
        if (mapped) newBlock.content.image.url = mapped.url;
      }
      // Recursively rewrite for rows/columns
      if (newBlock.type === 'row' && newBlock.content?.row?.columns) {
        newBlock.content.row.columns = newBlock.content.row.columns.map(col => ({
          ...col,
          blocks: col.blocks ? rewriteUrls(col.blocks) : [],
        }));
      }
      // Rewrite _style background images
      if (newBlock.layout_style?.backgroundImage && newBlock.layout_style.backgroundImage.startsWith('url(')) {
        const bgUrl = newBlock.layout_style.backgroundImage.slice(5, -2);
        const mapped = urlMap.get(bgUrl);
        if (mapped) newBlock.layout_style.backgroundImage = `url(${mapped.url})`;
      }
      // Builder: Extend this to cover all block types that can contain image URLs
      return newBlock;
    });
  };

  return rewriteUrls(sections);
}
```

---
### 3. AI Image Creation Policy

**RULING 134: AI Image Creation Policy During Build**

AI image generation will be triggered under specific conditions, with strict caps and graceful degradation.

*   **Trigger Conditions:**
    1.  **Missing Critical Image:** A required image slot (e.g., `hero.background.value`, `image.url` in a prominent `image_block`) has no usable extracted image, no suitable stock image, and no default fallback.
    2.  **Explicit Request:** The `LayoutRecipe` or `PageArchetype` explicitly requests an AI-generated image for a slot (e.g., `content_slots: [{ slot_key: "image_url", content_type: "image_url", brief: "AI generate a modern office interior", ai_generate: true }]`).
*   **Budget/Metering Policy:**
    *   **Metering Kind:** `image_generation`.
    *   **Hard Cap:** A maximum of **3 AI images per website build** (not per page). This is a strict platform-level cap to control costs and prevent abuse.
*   **Graceful No-Op:**
    *   The `imagenGenerateAndImport` helper (or its wrapper) must check `imageGenEnabled(tenantId)` (from `tenant_settings`) and `AI_IMAGE_GENERATION_ENABLED` (platform env variable).
    *   If disabled or cap reached, it must gracefully return `null` or a default fallback image URL without error.
*   **Drafts-Only:** All AI-generated images are saved to the tenant's Media Library (via `imagenGenerateAndImport`) and used in draft pages.

---
### 4. Idempotency on Re-run

**RULING 135: Idempotency for Image Ingestion and Generation**

*   **Ingestion:** `ingestExternalImage` (RULING 132) is inherently idempotent due to its deterministic `storage_path` and `Deduplication check`. Re-running the build will not re-ingest the same external images.
*   **AI Generation:**
    *   `imagenGenerateAndImport` already handles storage.
    *   To prevent re-generating every time: The `fillSlots` function (RULING 120) should check if a slot *already has a valid image URL* (either extracted or previously AI-generated) before attempting to generate a new one. This requires `fillSlots` to be aware of existing content.
    *   If an image is AI-generated, its `website_media` record should be tagged (e.g., `tags: ['ai_generated']`).

---
### 5. Supervisor Checks

**RULING 136: Supervisor Verification Schema for Media Ingestion & AI Image Creation**

```json
{
  "media_ingestion_ai_images": [
    { "id": "MED-V1", "assertion": "The `ingestExternalImage(tenantId, srcUrl, options)` function exists in `lib/server/media-ingestion.ts` and conforms to RULING 132's contract.", "severity": "block" },
    { "id": "MED-V2", "assertion": "The `ingestExternalImage` function uses a deterministic `storage_path` (`${tenantId}/uploads/imported/<hash(srcUrl)>.<ext>`) for deduplication.", "severity": "block" },
    { "id": "MED-V3", "assertion": "The `ingestExternalImage` function correctly fetches image bytes, guards against invalid content types (non-image) and excessive size (5MB cap).", "severity": "block" },
    { "id": "MED-V4", "assertion": "Ingested external images are stored in the `aibizconnect-public-media` bucket and recorded in `website_media` with `sourceType: 'external_url'` and assigned to an 'Imported' folder.", "severity": "block" },
    { "id": "MED-V5", "assertion": "The `ingestPageImages(tenantId, websiteId, pageId, sections)` function exists in `lib/sites/image-ingestion-pass.ts` and conforms to RULING 133's contract.", "severity": "block" },
    { "id": "MED-V6", "assertion": "The `ingestPageImages` function is called immediately after `leanBuildStep` generates a page's sections and before `saveDraft`.", "severity": "block" },
    { "id": "MED-V7", "assertion": "The `ingestPageImages` function correctly identifies and collects all unique external image URLs from `BlockContent` (hero backgrounds, gallery items, image blocks, `layout_style.backgroundImage`).", "severity": "block" },
    { "id": "MED-V8", "assertion": "The `ingestPageImages` function rewrites all collected external image URLs in the `BlockContent` to their newly stored `website_media.url`.", "severity": "block" },
    { "id": "MED-V9", "assertion": "AI image generation during build is triggered only when a required image slot has no usable extracted/stock image, or when explicitly requested by a `LayoutRecipe`/`PageArchetype`.", "severity": "block" },
    { "id": "MED-V10", "assertion": "A hard cap of 3 AI images per website build is enforced. Attempts beyond the cap gracefully return `null` or a fallback.", "severity": "block" },
    { "id": "MED-V11", "assertion": "AI image generation is metered via `recordAiUsage` with `usage_type='image_generation'`.", "severity": "block" },
    { "id": "MED-V12", "assertion": "AI image generation gracefully no-ops (returns null/fallback) if `imageGenEnabled(tenantId)` is false or `AI_IMAGE_GENERATION_ENABLED` env is false.", "severity": "block" },
    { "id": "MED-V13", "assertion": "The entire image ingestion and AI generation process is idempotent on re-run: external images are not re-ingested, and AI images are not re-generated if a valid image already exists for a slot.", "severity": "block" },
    { "id": "MED-V14", "assertion": "All image ingestion and AI generation actions are strictly scoped by `tenant_id` and `website_id`.", "severity": "block" },
    { "id": "MED-V15", "assertion": "All images (ingested or AI-generated) are saved to the tenant's Media Library and used in draft pages only.", "severity": "block" }
  ]
}
```

---
DECISION-LOG
[D-132] rule_ingest_external_image — Ruled `ingestExternalImage` contract, dedup strategy, and storage folder (status: ruled)
[D-133] rule_build_hook_image_ingestion — Ruled post-generation image ingestion pass and `ingestPageImages` contract (status: ruled)
[D-134] rule_ai_image_creation_policy — Ruled AI image creation policy during build (trigger, cap, metering, graceful no-op) (status: ruled)
[D-135] rule_idempotency_images — Ruled idempotency for image ingestion and generation on re-run (status: ruled)
[D-136] define_media_ingestion_ai_images_checks — Defined Supervisor verification checks for media ingestion and AI image creation (status: defined)