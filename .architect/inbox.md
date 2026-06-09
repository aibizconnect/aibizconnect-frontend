ARCHITECT — new feature, MEDIA STORAGE temporarily UNLOCKED by Ali for exactly this. Two deliverables on the website BUILD pipeline. Give the tight, build-ready ruling (numbered, exact contracts, dedup + scoping + metering). Drafts-only.

GROUND TRUTH:
- Build today (lib/sites/page-generate.ts) extracts image URLs from the live site and embeds them as EXTERNAL URLs directly in section content (hero.backgroundImageUrl = ex.images[0]; gallery items {url}). Stock images same. NOTHING is saved to the tenant's Media Library → fragile hotlinks, not reusable in the editor picker, not tenant-owned.
- website_media columns: id, tenant_id, url, storage_path, filename, mime_type, size_bytes, created_at, website_id, folder_id, tags. NO source_url column.
- Existing building blocks: putObject(path, bytes, mime) -> {ok, publicUrl}; imagenGenerateAndImport(tenantId, prompt, opts) -> {images:[{id,url}], skipped?, usedModel?} (ALREADY stores AI images to website_media under <tenantId>/uploads/ai/<ts>/, supports folderId; gated by imageGenEnabled()). There is NO generic "import external URL -> tenant media" helper yet.
- AI image gen prefers free Gemini 2.5 Flash; metering via recordAiUsage.

DELIVERABLE 1 — ingest build images into tenant Media Library:
- New helper ingestExternalImage(tenantId, srcUrl, opts?) -> {id,url}|null. Fetch bytes, guard image content-type + size cap, putObject, insert website_media, return stored url.
- DEDUP without a new column: I propose deterministic storage_path = `${tenantId}/uploads/imported/<hash(srcUrl)>.<ext>`, and skip-if-exists by querying website_media for that storage_path. Confirm or improve.
- A post-extraction pass that walks generated section content, ingests each unique external image URL, and rewrites the URL in content to the stored media url.

DELIVERABLE 2 — AI image creation during build, saved to Media:
- When should the build GENERATE an image vs reuse extracted/stock? (e.g. only when a hero/required slot has no usable extracted image?) 
- Budget/metering policy + a hard cap per build. Drafts-only. Must no-op gracefully when imageGenEnabled() is false.

RULE ON:
1. ingestExternalImage exact contract + dedup (confirm hashed storage_path, no new column) + size/type guards + which folder (e.g. an auto "Imported"/"AI" folder via folder_id? or root?).
2. The build hook: where to run the ingest pass (page-generate output? pipeline step?) and how to rewrite content URLs generically (hero bg, gallery, image blocks, _style.bgImage).
3. AI-image policy: trigger conditions, per-build cap, metering kind, drafts-only, env-gated.
4. Idempotency on re-run (don't re-import the same images / don't regenerate every save).
5. Supervisor checks (MED-V*).
Decisive, numbered, minimal. Reuse existing helpers; no new SQL column if avoidable.
