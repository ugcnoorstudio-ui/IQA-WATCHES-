# Supabase Storage policy

Product images are delivered from Cloudinary. Supabase Storage is retained only as a private migration/rollback source; no storefront image URL should point to the `product-images` bucket.

## Safe private-bucket procedure

1. Verify every `product_media.image_url` and `cloudinary_public_id` points to Cloudinary.
2. Verify product specs, order snapshots, published content and store settings do not contain Supabase Storage URLs.
3. An authenticated owner invokes `iqa-lock-down-product-images` from the admin Cloudinary media panel.
4. The Edge Function rechecks the references and calls the official Supabase Storage API `storage.updateBucket('product-images', { public: false })`.
5. Verify the bucket reports `public = false`. Existing objects are preserved; this action does not delete files or clear legacy `storage_path` values.

Do not update `storage.buckets` or `storage.objects` directly with SQL. Bucket configuration must go through the Storage API. Production remains unchanged until an owner explicitly runs the action.

The monthly Cached Egress value already recorded is historical and does not decrease when access is disabled. The purpose of this change is to stop new public Storage deliveries. Any previously cached public responses may remain until their CDN cache lifetime expires.
