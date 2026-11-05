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
