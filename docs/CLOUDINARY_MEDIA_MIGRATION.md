# Cloudinary media storage — implementation plan

## Target architecture

- Supabase Auth remains the identity provider for customer and staff sign-in.
- Supabase Postgres remains the system of record for products, variants, inventory, orders, customers, and product-media metadata.
- Cloudinary becomes the media store and CDN for public catalogue images.
- Existing Supabase Storage objects remain available during rollout and rollback; do not delete them.

## Current integration verified

- Storefront image resolution currently includes Supabase Storage URLs.
- Admin image upload calls the Supabase Edge Function `iqa-product-image-upload`.
- The Edge Function verifies the Supabase bearer token, checks the active owner role, validates image MIME/magic bytes and size, uploads to the `product-images` Supabase Storage bucket, then registers metadata using `iqa_register_product_image`.
- The admin browser client uses a publishable key only. Never expose Supabase service-role/secret keys or Cloudinary API secret in browser code.

## Cloudinary account requirements

- Create a Cloudinary Image & Video API Free account. Cloudinary's current public pricing lists $0, no credit card required, and 25 monthly credits. One credit can be consumed by 1 GB storage, 1 GB image bandwidth, or 1,000 transformations; actual usage combines these resources. Monitor usage in the Cloudinary console.
- Required non-secret setting: Cloud name.
- Required server-side secrets: API key and API secret. Configure them only as Supabase Edge Function secrets; never commit them or send them in chat.
- Free tier is not unlimited. Confirm the account's current plan and usage before production rollout.

## Secure upload design

1. Keep the existing `iqa-product-image-upload` Edge Function as the trusted upload gateway.
2. Continue verifying the Supabase JWT and active owner staff role before upload.
3. Validate product UUID, alt text, file size, MIME type, and file magic bytes.
4. Generate a unique Cloudinary public ID under a product-scoped folder; do not accept a client-supplied public ID.
5. Sign the Cloudinary upload request inside the Edge Function using the server-side API secret.
6. Upload to Cloudinary and receive the secure delivery URL and public ID.
7. Register metadata in Postgres using a reviewed, reversible storage-provider-aware database change. Do not assume the existing `storage_path` field or `iqa_register_product_image` RPC can safely store Cloudinary identifiers without inspection.
8. Return only the asset public ID and secure delivery URL to the admin browser.

## Storefront compatibility and rollout

- Add a provider-aware image resolver that supports Cloudinary secure URLs and legacy Supabase Storage URLs.
- Keep existing Supabase URLs readable until all assets and metadata are verified.
- Backfill assets idempotently; verify count, HTTP status, content type, image dimensions, visual rendering, and CDN caching.
- Test owner upload, rejected non-owner upload, customer login, staff login, catalogue listing, product detail, cart, and mobile layouts.
- Do not change production reads/writes, merge to `main`, deploy, or delete old objects until all tests pass and the user explicitly approves rollout.

## Pending setup

- User must create/claim the Cloudinary account and provide the Cloud name (not API secret).
- User must configure API key and API secret in Supabase Edge Function secrets through the secure dashboard flow. Do not ask the user to paste the API secret into chat.
- Inspect the exact `product_media` schema and registration RPC before implementing the metadata change.
- Confirm current Cloudinary Free plan quota in the account before production traffic is switched.
