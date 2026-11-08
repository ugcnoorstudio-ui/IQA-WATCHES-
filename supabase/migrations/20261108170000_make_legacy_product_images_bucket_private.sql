-- Supabase Storage is retained only as a private migration/rollback source.
-- Product media is served from Cloudinary; do not expose legacy originals publicly.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.product_media
    WHERE image_url IS NULL
       OR cloudinary_public_id IS NULL
       OR image_url !~ '^https://res\.cloudinary\.com/rrmdzam7/image/upload/'
  ) THEN
    RAISE EXCEPTION
      'Cannot make product-images private: every product media row must have a verified Cloudinary URL and public ID.';
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
      'Cannot make product-images private: a live database record still references Supabase Storage.';
  END IF;
END;
$$;

-- Keep the six existing objects as private rollback/migration copies.
-- No object or product_media row is deleted or rewritten.
UPDATE storage.buckets
SET public = false,
    updated_at = now()
WHERE id = 'product-images'
  AND public IS DISTINCT FROM false;
