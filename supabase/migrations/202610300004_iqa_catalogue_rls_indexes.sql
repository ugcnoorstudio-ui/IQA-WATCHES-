-- Catalogue RLS policy optimization and FK indexes (applied 2026-10-30).
CREATE INDEX IF NOT EXISTS categories_created_by_idx ON public.categories(created_by);
CREATE INDEX IF NOT EXISTS brands_created_by_idx ON public.brands(created_by);
CREATE INDEX IF NOT EXISTS product_media_created_by_idx ON public.product_media(created_by);

DROP POLICY IF EXISTS categories_public_active_read ON public.categories;
DROP POLICY IF EXISTS categories_staff_read ON public.categories;
CREATE POLICY categories_public_active_read ON public.categories FOR SELECT TO anon USING(state='published'::public.record_state);
CREATE POLICY categories_staff_read ON public.categories FOR SELECT TO authenticated USING(state='published'::public.record_state OR private.has_staff_role(ARRAY['owner'::public.staff_role,'administrator'::public.staff_role,'inventory_manager'::public.staff_role,'order_manager'::public.staff_role,'support_staff'::public.staff_role]));

DROP POLICY IF EXISTS brands_public_active_read ON public.brands;
DROP POLICY IF EXISTS brands_staff_read ON public.brands;
CREATE POLICY brands_public_active_read ON public.brands FOR SELECT TO anon USING(state='published'::public.record_state);
CREATE POLICY brands_staff_read ON public.brands FOR SELECT TO authenticated USING(state='published'::public.record_state OR private.has_staff_role(ARRAY['owner'::public.staff_role,'administrator'::public.staff_role,'inventory_manager'::public.staff_role,'order_manager'::public.staff_role,'support_staff'::public.staff_role]));

DROP POLICY IF EXISTS product_media_public_read ON public.product_media;
DROP POLICY IF EXISTS product_media_staff_read ON public.product_media;
CREATE POLICY product_media_public_read ON public.product_media FOR SELECT TO anon USING(EXISTS(SELECT 1 FROM public.products p WHERE p.id=product_id AND p.state='published'::public.record_state AND p.is_sample=false AND p.verified_sellable=true));
CREATE POLICY product_media_staff_read ON public.product_media FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.products p WHERE p.id=product_id AND p.state='published'::public.record_state AND p.is_sample=false AND p.verified_sellable=true) OR private.has_staff_role(ARRAY['owner'::public.staff_role,'administrator'::public.staff_role,'inventory_manager'::public.staff_role,'order_manager'::public.staff_role,'support_staff'::public.staff_role]));
