-- Keep the public-catalogue predicate outside the exposed Data API schema.
CREATE OR REPLACE FUNCTION private.iqa_is_public_product(p_product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = p_product_id
      AND p.state = 'published'::public.record_state
      AND p.is_sample = false
      AND p.verified_sellable = true
      AND EXISTS (
        SELECT 1 FROM public.product_variants v
        WHERE v.product_id = p.id AND v.active = true
          AND v.stock_on_hand > v.stock_reserved
      )
  );
$function$;
REVOKE ALL ON FUNCTION private.iqa_is_public_product(uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.iqa_is_public_product(uuid) TO anon, authenticated;

ALTER POLICY products_public_catalogue_read ON public.products
  USING (private.iqa_is_public_product(id));
ALTER POLICY product_variants_public_catalogue_read ON public.product_variants
  USING (active = true AND stock_on_hand > stock_reserved AND private.iqa_is_public_product(product_id));
ALTER POLICY product_media_public_read ON public.product_media
  USING (private.iqa_is_public_product(product_id));

REVOKE ALL ON FUNCTION public.iqa_is_public_product(uuid) FROM PUBLIC, anon, authenticated;
DROP FUNCTION public.iqa_is_public_product(uuid);
