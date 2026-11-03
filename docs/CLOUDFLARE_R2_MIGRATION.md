# Cloudflare R2 migration — implementation notes

## Target architecture

- Supabase Auth remains the identity provider for customer and staff sign-in.
- Supabase Postgres remains the system of record for structured commerce data (products, variants, inventory, orders, customers, and product-media metadata).
- Cloudflare R2 becomes the object store for product images and other uploaded media.
- The browser must never receive an R2 S3 secret/access key. Upload authorization and object writes must be performed by a trusted server endpoint (Cloudflare Worker or equivalent).

## Verified current integration (from main)

- Storefront image URLs are resolved in `index.html` and currently reference Supabase Storage.
- Admin image upload is implemented by `IQA_ADMIN_BACKEND.uploadProductImage()` in `admin/backend.js`.
- That method currently invokes the Supabase Edge Function `iqa-product-image-upload`.
- Admin Supabase client uses a browser-safe publishable key. Do not replace it with a service-role key.
- Existing Supabase Storage bucket is `product-images`; do not delete or empty it during migration.

## Required R2 service contract

Before switching production code, provision a Cloudflare Worker (or equivalent trusted backend) with secrets stored only as server-side environment variables:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_BASE_URL` (custom domain used for public catalogue images)
- Supabase JWT verification configuration / project URL

The Worker must:
1. Verify the caller's Supabase access token and enforce an authorized staff role for uploads.
2. Validate MIME type, file size, product ID, and generated object key; never trust a client-supplied object key.
3. Generate a unique key such as `products/{product_id}/{uuid}.{ext}`.
4. Write the object to R2 using server-side credentials.
5. Return only the object key and public delivery URL (never credentials).
6. Use restrictive CORS, safe cache headers, and structured errors.
7. Keep private customer/order documents private; only intended catalogue assets should be publicly readable.

## Database metadata

Keep `product_media` as metadata in Postgres. Store the R2 object key in a dedicated field (or a clearly versioned storage-provider field) and retain product ID, alt text, primary-image flag, MIME type, byte size, and timestamps. Do not repurpose the current Supabase `storage_path` semantics without a reviewed migration. Do not remove the current bucket constraint until all readers/writers are updated.

## Safe rollout

1. Provision a non-production R2 bucket and Worker.
2. Add Worker endpoint to deployment environment configuration; never commit credentials.
3. Implement and test the R2 upload endpoint using a test product.
4. Update admin upload to call the Worker with the Supabase bearer token.
5. Update storefront image resolver to support the R2 public base URL and legacy Supabase URLs during transition.
6. Backfill existing image objects and update metadata in a reversible, idempotent batch.
7. Verify every migrated image (HTTP status, content type, dimensions, visual rendering, cache headers).
8. Run customer login, staff login, product listing, product detail, cart, and admin upload regression tests.
9. Switch reads/writes only after verification. Keep Supabase originals for rollback until a later explicit cleanup.

## Important limitations / pending inputs

- No R2 bucket, public delivery domain, Worker endpoint, or R2 credentials have been provisioned in this repository workflow yet.
- Do not create a public bucket or expose credentials as a shortcut.
- The reported Supabase Cached Egress overage has not been attributed to a specific route or asset. Measure request sources before claiming the R2 move resolves it.
- Do not merge this branch into `main` or deploy until the Worker endpoint is configured and tests pass.
