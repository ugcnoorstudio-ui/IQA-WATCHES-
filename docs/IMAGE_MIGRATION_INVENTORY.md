# IQA WATCHES — Image Migration Inventory (Step 1 + Step 2 audit)

Audit date: 2026-11-06  
Repository: `ugcnoorstudio-ui/IQA-WATCHES-`  
Audited branch: `main`  
Baseline commit: `9028ee3bb8e2678553338075bafd1b91f50f2740`  
Cloudinary cloud: `rrmdzam7`

## Scope and method

Reviewed the storefront entry page (`index.html`), dynamic route renderer (`routes.js`), customer storefront renderer (`customer-storefront.js`), Admin Panel entry and media manager, selected CSS/JavaScript assets, repository asset tree, live `product_media` rows, and live `product-images` Storage object metadata. This is a targeted source-reference and database inventory; it does not claim a complete Cloudinary account inventory or visual inspection of every page.

## Current image inventory

| Area / page section | Asset or source | Current delivery / location | Status |
|---|---|---|---|
| Browser favicon | `iqa-watches-favicon.svg` | Cloudinary `iqa-watches/brand` | Migrated; active reference in `index.html` |
| Desktop/mobile header logo | `iqa-watches-header-logo.svg` | Cloudinary `iqa-watches/brand` | Migrated; active references in `index.html` |
| Primary/standalone brand logo | `iqa-watches-primary-logo.svg` | Cloudinary brand migration completed; local source remains in `assets/` | Migrated asset; no active reference found in audited storefront entry page; broader usage confirmation remains |
| Homepage hero / cinematic scene | `home-hero.jpg` | Cloudinary `iqa-watches/static` | Cloudinary URL referenced; responsive widths and auto format/quality used |
| Collection tile — Classic | `collection-classic.jpg` | Cloudinary `iqa-watches/static` | Cloudinary URL referenced; responsive variants used |
| Collection tile / finder — Sport | `collection-sport.jpg` | Cloudinary `iqa-watches/static` | Cloudinary URL referenced; responsive variants used |
| Collection tile / compare — Editorial | `collection-editorial.jpg` | Cloudinary `iqa-watches/static` | Cloudinary URL referenced; responsive variants used |
| Collection tile / editorial story | `collection-modern.jpg` | Cloudinary `iqa-watches/static` | Cloudinary URL referenced; responsive variants used |
| Cinematic story scene | `editorial-detail.jpg` | Cloudinary `iqa-watches/static` | Cloudinary URL referenced; responsive variants used |
| Product cards, search, category, wishlist, checkout and product detail galleries | `products` + `product_media` records | Supabase database supplies Cloudinary `image_url` values | Runtime code filters gallery media to Cloudinary URLs; four media records currently have Cloudinary URLs |
| Product image upload | Admin upload flow | Cloudinary `iqa-watches/products`; metadata registered in Supabase `product_media` | Active flow; user has confirmed two images added to one product |
| Local product image asset | `assets/products/casio-ae-1200whl-5av.jpg` | Still in Git repository | No active source-code reference found in the audited runtime paths. Casio Brown Leather product's legacy `specs.image_url` still points to this local URL, but current storefront mapping reads only Cloudinary `product_media.image_url`; keep the repository file until the broader source audit is complete |
| Other visual assets | CSS/JS assets in `assets/` | Local repository files | Reviewed as styling/behavior assets, not standalone image files |

## Supabase Storage findings (live database)

- Bucket: `product-images` (public; 5 MB configured object limit).
- 6 objects total; 2 are zero-byte folder placeholders.
- 4 non-empty objects total approximately 3.71 MB.
- Three non-empty legacy objects match existing `product_media.storage_path` values.
- One JPEG has no matching `product_media` row; it is not safe to classify as disposable.
- `product_media`: 4 rows; all 4 have Cloudinary `image_url` and `cloudinary_public_id`; 3 rows still retain legacy `storage_path`, and 1 newer row has `storage_path = null`.

## Step 2 — detailed product image reconciliation

Live database reconciliation returned three published products:

| Product | Cloudinary media records | Legacy source observation |
|---|---:|---|
| Casio AE-1200WHD-1AV Silver Stainless Steel World Time Digital Watch | 1 | Legacy product metadata points to Casio's external product image URL |
| Casio AE-1200WHL-5AV Brown Leather World Time Digital Watch | 2 | Legacy `specs.image_url` points to `assets/products/casio-ae-1200whl-5av.jpg`; storefront code does not use this field for product image rendering. Both active gallery records have Cloudinary URLs |
| Fastrack thor multifunctional analogue | 1 | One active Cloudinary gallery record; one additional unlinked legacy JPEG remains under this product's Storage folder |

The storefront catalogue query selects product metadata and `product_media`; it builds each product gallery only from `image_url` values containing `res.cloudinary.com`. Therefore the Casio Brown Leather local JPG is not the current storefront delivery source. The file is retained in Git for now; no source asset or database metadata was deleted or rewritten.

### Unlinked JPEG review-copy result

The user ran the Admin Panel's owner-only **Copy unlinked image to Cloudinary review folder** action successfully.

- Source: `product-images/7fea8610-9261-4bbe-b80a-5ba1e2745510/MP000000025248756_437Wx649H_202502030016151.jpeg`
- Size: 30,161 bytes
- Destination folder: `iqa-watches/unassigned-review`
- Cloudinary public ID: `iqa-watches/unassigned-review/legacy-MP000000025248756-437Wx649H-202502030016151`
- Cloudinary URL: `https://res.cloudinary.com/rrmdzam7/image/upload/v1793907482/iqa-watches/unassigned-review/legacy-MP000000025248756-437Wx649H-202502030016151.jpg`
- Confirmed result: `ok=true`, `status=copied_for_review`.
- The original Supabase object remains untouched and no product record was changed.

This copy is an isolated review asset; it is not attached to a product and is not treated as an approved product image.

## Supabase vs Cloudinary source classification

- Active static storefront references inspected in `index.html`: Cloudinary for brand marks and six static visual assets.
- Dynamic product imagery: Supabase is the metadata/database source; image bytes are delivered from Cloudinary URLs stored in `product_media.image_url`.
- Direct Supabase Storage URL construction or `storage.from(...).getPublicUrl(...)` was not found in the audited storefront files (`index.html`, `routes.js`, `customer-storefront.js`) or reviewed admin files (`admin/admin.js`, `admin/backend.js`, `admin/asset-intake.js`, `admin/media-manager.js`, `admin/model-viewer.js`). This is a targeted file audit, not a claim that every file in the repository has been exhaustively scanned.
- Supabase remains required for products, variants, customers, orders, authentication, admin authorization, and image metadata. Only image file storage/delivery is being moved to Cloudinary.


## Step 3 — homepage static images

The six planned homepage/static assets were already present in the Cloudinary `iqa-watches/static` folder and referenced from the live storefront entry page. They were **not uploaded again**, avoiding duplicate Cloudinary assets.

| Asset | Active Cloudinary public ID |
|---|---|
| Homepage hero | `iqa-watches/static/home-hero` |
| Classic collection tile | `iqa-watches/static/collection-classic` |
| Sport collection tile | `iqa-watches/static/collection-sport` |
| Editorial collection tile | `iqa-watches/static/collection-editorial` |
| Modern collection tile | `iqa-watches/static/collection-modern` |
| Editorial detail scene | `iqa-watches/static/editorial-detail` |

Source-reference check: `index.html` points these assets to Cloudinary and uses responsive width variants with automatic format and quality transformations. No Supabase Storage URL is used for these six homepage/static assets in the inspected entry page.

Verification boundary: repository references are confirmed. The web inspection service could not directly open Cloudinary image transformation URLs, so this audit does not claim a separate visual pixel-by-pixel confirmation of all six images in the Cloudinary Media Manager. The Step 2 desktop/mobile browser regression suite passed, and the current deployed site references these Cloudinary URLs. The owner-only Media Manager visual confirmation remains a separate check.

No duplicate copies were created, no image records were changed, and no Supabase originals were deleted.


## Step 4 — unlinked legacy image review

The planned Step 4 source object was already copied safely to Cloudinary during the Step 2 reconciliation, so it will **not** be uploaded a second time.

- Supabase source object: `product-images/7fea8610-9261-4bbe-b80a-5ba1e2745510/MP000000025248756_437Wx649H_202502030016151.jpeg`
- Current live Storage check: object still exists, size 30,161 bytes, and has no matching `product_media.storage_path` row.
- Cloudinary review copy: `iqa-watches/unassigned-review/legacy-MP000000025248756-437Wx649H-202502030016151`
- Cloudinary URL: `https://res.cloudinary.com/rrmdzam7/image/upload/v1793907482/iqa-watches/unassigned-review/legacy-MP000000025248756-437Wx649H-202502030016151.jpg`
- Prior Admin Panel result: `ok=true`, `status=copied_for_review`; original Supabase object untouched and no product record changed.

### Step 4 review status

The copy and source-preservation checks are confirmed. The image itself could not be fetched by the available inspection session for visual identification. Therefore its product identity remains **unconfirmed**; do not attach it to Fastrack Thor or any other product until it has been visually inspected in the owner-only Cloudinary Media Manager. Keep both the Cloudinary review copy and Supabase original; do not delete either.

No duplicate upload, product association update, or deletion was performed.

## Remaining verification before any cleanup

1. Refresh the owner-only Cloudinary Media Manager and confirm the complete library contains the expected six static IDs, three brand IDs, product images, and the new unassigned review-copy. The connected repository/database tools do not expose a Cloudinary account-wide inventory.
2. Visually inspect the unassigned review-copy and decide whether it belongs to Fastrack Thor. Do not attach it automatically.
3. Finish a repository-wide source reference scan for secondary pages, CSS backgrounds, and references to the local Casio JPG before deciding whether its local source file is redundant.
4. Keep all original Supabase objects, including the unlinked JPEG and zero-byte placeholders, until the user explicitly approves a separate cleanup step.

## Safety

No Supabase Storage objects, database rows, or repository source assets were deleted or changed during these audits. The unlinked JPEG was copied to Cloudinary for review only; its Supabase original remains intact. No image URL switch or product association change was performed in Step 2.


## Step 5 — complete Supabase Storage object audit (read-only)

Live read-only SQL inventory was run against **all** rows in `storage.objects`, grouped by bucket, and reconciled against `public.product_media`.

### Bucket totals

| Bucket | Objects | Total bytes |
|---|---:|---:|
| `product-images` | 6 | 3,713,565 bytes (~3.54 MiB / 3.71 MB) |

No other Storage buckets contained objects at the time of this audit.

### Object-by-object classification

| Storage object | Size | Product media link | Classification / action |
|---|---:|---|---|
| `0a8836eb-b7ad-41b6-874f-3737e8e94482/72380da5-682f-4b86-a551-03d6cf283b8a.jpg` | 30,161 B | Yes — Casio AE-1200WHL-5AV | Legacy source still exists; matching media row already has Cloudinary URL/public ID. Retain pending end-to-end live gallery verification. |
| `7fea8610-9261-4bbe-b80a-5ba1e2745510/d1875a84-aedb-4311-a6a3-02dcd0c8a745.png` | 1,528,824 B | Yes — Fastrack Thor | Legacy source still exists; matching media row already has Cloudinary URL/public ID. Retain pending end-to-end live gallery verification. |
| `7fea8610-9261-4bbe-b80a-5ba1e2745510/MP000000025248756_437Wx649H_202502030016151.jpeg` | 30,161 B | No — 0 matches | Unlinked legacy JPEG; Step 4 Cloudinary review copy exists. Identity remains visually unconfirmed. Retain original and review copy. |
| `b440d67b-7bd7-49bd-bdb3-817dc16b7ea7/ee339630-71a4-430d-bccf-fb89244de399.png` | 2,124,419 B | Yes — Casio AE-1200WHD-1AV | Legacy source still exists; matching media row already has Cloudinary URL/public ID. Retain pending end-to-end live gallery verification. |
| `Product image/.emptyFolderPlaceholder` | 0 B | No | Empty folder placeholder; no image bytes and no product_media link. Do not delete as part of this audit. |
| `Untitled folder/Untitled folder/.emptyFolderPlaceholder` | 0 B | No | Empty folder placeholder; no image bytes and no product_media link. Do not delete as part of this audit. |

### Reconciliation checks

- Exactly 6 Storage objects were returned across all buckets.
- Exactly 3 non-empty objects are linked to product_media rows by `bucket_id + storage_path`.
- Exactly 1 non-empty JPEG is unlinked and matches the Step 4 review-copy source.
- Exactly 2 zero-byte placeholder objects exist.
- The four current `product_media` rows all have Cloudinary `image_url` and `cloudinary_public_id`; three still retain a legacy `storage_path`, and one row has `storage_path = null`.
- A separate anti-join check confirmed all three non-null legacy `product_media.storage_path` values still resolve to existing Storage objects. The fourth media row has no legacy Storage path and already points to Cloudinary.

### Step 5 result and safety boundary

The audit and reconciliation are complete. **No Storage object, database row, bucket setting, or policy was modified. Nothing was deleted.** The three linked legacy files are retained until the live product galleries and admin upload/gallery paths are verified against Cloudinary. The unlinked JPEG remains under review until visual identification. The two empty placeholders are recorded as zero-byte folder artifacts, not treated as image files.

Any cleanup must be a separate, explicitly approved operation after the relevant live checks; this audit itself authorizes no deletion.


## Step 6 — image optimization and delivery caching

### Responsive delivery changes

- The six homepage/static image assets already use Cloudinary `f_auto` and `q_auto` transformations and responsive `srcset` widths.
- Dynamic product images previously received a single 1,200 px Cloudinary transformation. The storefront now builds 320, 480, 800 and 1,200 px variants for Cloudinary raster images and adds `srcset` plus a responsive `sizes` hint.
- A lightweight `MutationObserver` applies the same responsive attributes to product cards, galleries, drawers and route content created after the initial page render.
- Existing explicit `srcset` attributes are preserved. Non-Cloudinary URLs and SVG brand assets are excluded. Original Cloudinary public IDs and source assets are not changed.
- Every generated raster variant uses `c_limit`, `f_auto` and `q_auto`; the browser selects the appropriate candidate from the available widths.

### Cache behavior and limits

- Cloudinary standard uploaded-asset delivery is CDN-cached (documented default: up to 30 days). Versioned delivery URLs are retained where present so changed uploads can use a new version URL instead of relying on stale cached bytes.
- GitHub Pages does not provide configurable per-file `Cache-Control` response headers for this static deployment. Image caching therefore remains controlled by Cloudinary's delivery response/CDN, not by a custom Pages header.
- Cloudinary's `fl_immutable_cache` is not added: Cloudinary documents it as currently supported only by Firefox, so it would not provide a reliable cross-browser cache policy.
- Live response-header inspection from this execution environment was not available; CDN cache policy is documented from Cloudinary's current delivery guidance, not represented as a measured browser-cache header test.

### Step 6 verification

- Added automated tests for 4 responsive widths, preservation of Cloudinary version segments, replacement (not duplication) of existing transforms, SVG/non-Cloudinary exclusion, and dynamic DOM enhancement.
- Run JavaScript syntax, all Node regression tests, desktop/mobile Playwright checks and deployment before marking Step 6 complete.
- No Supabase Storage objects, product media rows, or Cloudinary originals are deleted or rewritten by this optimization step.

## Step 7A — upload-path prevention and fresh Storage baseline (read-only)

Audit date: 2026-11-06

### Admin upload path

- The owner-only Admin Panel image upload calls the `iqa-product-image-upload` Edge Function.
- The Edge Function validates the signed-in staff user and active owner role, validates image MIME type and file magic bytes, checks the target product, then uploads image bytes to Cloudinary under `iqa-watches/products`.
- After Cloudinary confirms the asset, the function registers only the Cloudinary URL and public ID in `product_media` through `iqa_register_cloudinary_product_image`.
- The reviewed Edge Function contains no Supabase Storage object upload call. A failed metadata registration triggers a best-effort Cloudinary asset cleanup.
- The browser Admin backend sends the image as multipart form data to this Edge Function; it does not directly upload image bytes to `storage.from(...)`.
- The local asset-intake helper is explicitly local-preview/validation only and does not upload files.

### Fresh live Storage baseline

A fresh read-only query against `storage.objects` returned:

| Bucket | Objects | Total bytes | Zero-byte objects |
|---|---:|---:|---:|
| `product-images` | 6 | 3,713,565 (~3.71 MB) | 2 |

This matches the Step 5 baseline. No object, database row, bucket setting, or policy was modified.

### Step 7A result

The reviewed Admin product-image upload path is Cloudinary-first and does not write product image bytes to Supabase Storage. Supabase continues to hold product records and Cloudinary media metadata. The current six legacy Storage objects remain unchanged.

### Remaining before any Storage cleanup

- Complete a repository-wide scan of all upload entry points and server functions, including non-image files, before declaring every Storage write path eliminated.
- Visually inspect the unassigned legacy JPEG in the owner-only Cloudinary Media Manager; do not attach it automatically.
- Verify all live product galleries and the Admin upload/gallery workflow.
- Only then prepare a proposed deletion list. No Storage deletion is authorized by this audit.

