-- Avoid overlapping authenticated SELECT policies: public catalogue reads are anonymous-only;
-- authenticated reads remain limited to active staff via the staff policies.
ALTER POLICY brands_public_active_read ON public.brands TO anon;
ALTER POLICY categories_public_active_read ON public.categories TO anon;
ALTER POLICY product_media_public_read ON public.product_media TO anon;
