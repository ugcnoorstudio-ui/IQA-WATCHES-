# IQA WATCHES — Image Migration Inventory (Step 1)

Audit date: 2026-11-06  
Repository: `ugcnoorstudio-ui/IQA-WATCHES-`  
Audited branch: `main`  
Baseline commit: `9028ee3bb8e2678553338075bafd1b91f50f2740`  
Cloudinary cloud: `rrmdzam7`

## Scope and method

Reviewed the storefront entry page (`index.html`), dynamic route renderer (`routes.js`), customer storefront renderer (`customer-storefront.js`), Admin Panel entry and media manager, plus the repository asset tree. This is a source-reference inventory; it does not claim a full Cloudinary account inventory or visual browser inspection.

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
| Local product image asset | `assets/products/casio-ae-1200whl-5av.jpg` | Still in Git repository | Unresolved reference/use; retain until exact usage and duplicate status are established |
| Other visual assets | CSS/JS assets in `assets/` | Local repository files | Reviewed as styling/behavior assets, not standalone image files |

## Supabase Storage findings (live database)

- Bucket: `product-images` (public; 5 MB configured object limit).
- 6 objects total; 2 are zero-byte folder placeholders.
- 4 non-empty objects total approximately 3.71 MB.
- Three non-empty legacy objects match existing `product_media.storage_path` values.
- One JPEG has no matching `product_media` row; it is not safe to classify as disposable.
- `product_media`: 4 rows; all 4 have Cloudinary `image_url` and `cloudinary_public_id`; 3 rows still retain legacy `storage_path`, and 1 newer row has `storage_path = null`.

## Supabase vs Cloudinary source classification

- Active static storefront references inspected in `index.html`: Cloudinary for brand marks and six static visual assets.
- Dynamic product imagery: Supabase is the metadata/database source; image bytes are delivered from Cloudinary URLs stored in `product_media.image_url`.
- Direct Supabase Storage URL construction or `storage.from(...).getPublicUrl(...)` was not found in the audited storefront files (`index.html`, `routes.js`, `customer-storefront.js`) or reviewed admin files (`admin/admin.js`, `admin/backend.js`, `admin/asset-intake.js`, `admin/media-manager.js`, `admin/model-viewer.js`). This is a targeted file audit, not a claim that every file in the repository has been exhaustively scanned.
- Supabase remains required for products, variants, customers, orders, authentication, admin authorization, and image metadata. Only image file storage/delivery is being moved to Cloudinary.

## Remaining inventory questions for Step 2

1. Confirm the full Cloudinary Media Library inventory against the six static IDs and three brand IDs (the connected repository/database tools do not expose a Cloudinary account-wide asset listing).
2. Resolve whether the local Casio JPG is actively referenced or is an unused duplicate before migrating or removing it.
3. Search any remaining non-storefront/secondary page assets and CSS background image references outside the audited files.
4. Review the unlinked Supabase JPEG before deciding whether it belongs in Cloudinary.

## Safety

No Supabase Storage objects, database rows, or repository source assets were deleted or changed by this inventory. No image migration or URL switch was performed as part of Step 1.
