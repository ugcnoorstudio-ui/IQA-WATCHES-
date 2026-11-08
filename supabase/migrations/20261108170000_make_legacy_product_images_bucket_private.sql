-- Preflight only. Supabase Storage bucket configuration is changed through
-- the owner-only Storage API function, never by writing storage schema tables in SQL.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.product_media
    WHERE image_url IS NULL
       OR cloudinary_public_id IS NULL
       OR image_url !~ '^https://res\.cloudinary\.com/'
  ) THEN
    RAISE EXCEPTION
      'Storage privacy preflight failed: every product media row must have a verified Cloudinary URL and public ID.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.products
    WHERE coalesce(specs::text, '') ILIKE '%supabase.co/storage/%'
  ) OR EXISTS (
    SELECT 1 FROM public.order_items
    WHERE coalesce(product_snapshot::text, '') ILIKE '%supabase.co/storage/%'
  ) OR EXISTS (
    SELECT 1 FROM public.content_entries
    WHERE coalesce(body::text, '') ILIKE '%supabase.co/storage/%'
  ) OR EXISTS (
    SELECT 1 FROM public.store_settings
    WHERE coalesce(value::text, '') ILIKE '%supabase.co/storage/%'
  ) THEN
    RAISE EXCEPTION
      'Storage privacy preflight failed: a live database record still references Supabase Storage.';
  END IF;
END;
$$;

-- No bucket, object, or product_media row is modified by this migration.
-- An authenticated owner invokes iqa-lock-down-product-images, which calls
-- supabase.storage.updateBucket('product-images', { public: false }).
