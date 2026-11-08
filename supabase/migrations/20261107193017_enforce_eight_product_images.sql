-- Enforce an eight-image maximum per product.
-- Lock the parent product row so concurrent uploads cannot exceed the cap.
CREATE OR REPLACE FUNCTION public.iqa_enforce_product_media_gallery_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_count integer;
BEGIN
  PERFORM 1
    FROM public.products
   WHERE id = NEW.product_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found.';
  END IF;

  SELECT count(*) INTO v_count
    FROM public.product_media
   WHERE product_id = NEW.product_id;

  IF v_count >= 8 THEN
    RAISE EXCEPTION 'A product can have at most 8 images. Remove an existing image before adding another.';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS product_media_gallery_limit ON public.product_media;
CREATE TRIGGER product_media_gallery_limit
BEFORE INSERT ON public.product_media
FOR EACH ROW
EXECUTE FUNCTION public.iqa_enforce_product_media_gallery_limit();
