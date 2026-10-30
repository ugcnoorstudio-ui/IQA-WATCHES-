-- IQA WATCHES catalogue taxonomy, product media storage and Owner publication gate.
-- Applied to Supabase project ufidhdcwelaqtqrgeszy on 2026-10-30.

CREATE TABLE IF NOT EXISTS public.categories (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, slug text NOT NULL UNIQUE,
 state public.record_state NOT NULL DEFAULT 'draft', created_by uuid REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT categories_name_length CHECK(char_length(name) BETWEEN 2 AND 80),
 CONSTRAINT categories_slug_format CHECK(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
CREATE TABLE IF NOT EXISTS public.brands (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, slug text NOT NULL UNIQUE,
 state public.record_state NOT NULL DEFAULT 'draft', created_by uuid REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT brands_name_length CHECK(char_length(name) BETWEEN 2 AND 80),
 CONSTRAINT brands_slug_format CHECK(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS products_category_id_idx ON public.products(category_id);
CREATE INDEX IF NOT EXISTS products_brand_id_idx ON public.products(brand_id);

CREATE TABLE IF NOT EXISTS public.product_media (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
 bucket_id text NOT NULL DEFAULT 'product-images' CHECK(bucket_id='product-images'), storage_path text NOT NULL UNIQUE,
 alt_text text NOT NULL, sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order BETWEEN 0 AND 1000),
 is_primary boolean NOT NULL DEFAULT false, created_by uuid NOT NULL REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT product_media_alt_length CHECK(char_length(alt_text) BETWEEN 3 AND 180),
 CONSTRAINT product_media_path CHECK(storage_path ~ '^[0-9a-fA-F-]{36}/[A-Za-z0-9._-]+$')
);
CREATE UNIQUE INDEX IF NOT EXISTS product_media_one_primary_idx ON public.product_media(product_id) WHERE is_primary=true;
CREATE INDEX IF NOT EXISTS product_media_product_order_idx ON public.product_media(product_id,sort_order);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.categories,public.brands,public.product_media TO anon,authenticated;
CREATE POLICY categories_public_active_read ON public.categories FOR SELECT TO anon,authenticated USING(state='published'::public.record_state);
CREATE POLICY categories_staff_read ON public.categories FOR SELECT TO authenticated USING(private.has_staff_role(ARRAY['owner'::public.staff_role,'administrator'::public.staff_role,'inventory_manager'::public.staff_role,'order_manager'::public.staff_role,'support_staff'::public.staff_role]));
CREATE POLICY brands_public_active_read ON public.brands FOR SELECT TO anon,authenticated USING(state='published'::public.record_state);
CREATE POLICY brands_staff_read ON public.brands FOR SELECT TO authenticated USING(private.has_staff_role(ARRAY['owner'::public.staff_role,'administrator'::public.staff_role,'inventory_manager'::public.staff_role,'order_manager'::public.staff_role,'support_staff'::public.staff_role]));
CREATE POLICY product_media_public_read ON public.product_media FOR SELECT TO anon,authenticated USING(EXISTS(SELECT 1 FROM public.products p WHERE p.id=product_id AND p.state='published'::public.record_state AND p.is_sample=false AND p.verified_sellable=true));
CREATE POLICY product_media_staff_read ON public.product_media FOR SELECT TO authenticated USING(private.has_staff_role(ARRAY['owner'::public.staff_role,'administrator'::public.staff_role,'inventory_manager'::public.staff_role,'order_manager'::public.staff_role,'support_staff'::public.staff_role]));

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('product-images','product-images',true,5242880,ARRAY['image/jpeg','image/png','image/webp','image/avif'])
ON CONFLICT(id) DO UPDATE SET public=true,file_size_limit=5242880,allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp','image/avif'];
CREATE POLICY iqa_product_images_owner_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='product-images' AND private.has_staff_role(ARRAY['owner'::public.staff_role]));
CREATE POLICY iqa_product_images_owner_update ON storage.objects FOR UPDATE TO authenticated USING(bucket_id='product-images' AND private.has_staff_role(ARRAY['owner'::public.staff_role])) WITH CHECK(bucket_id='product-images' AND private.has_staff_role(ARRAY['owner'::public.staff_role]));
CREATE POLICY iqa_product_images_owner_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id='product-images' AND private.has_staff_role(ARRAY['owner'::public.staff_role]));

CREATE OR REPLACE FUNCTION public.iqa_catalogue_mutation(p_actor uuid,p_action text,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
 v_request uuid; v_old record; v_result jsonb; v_name text; v_slug text; v_reason text;
 v_category uuid; v_brand uuid; v_product uuid; v_media uuid; v_path text; v_alt text;
 v_file_type text; v_variant record;
BEGIN
 IF p_actor IS NULL OR p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' THEN RAISE EXCEPTION 'Invalid request.' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id=p_actor AND active=true AND role='owner'::public.staff_role) THEN RAISE EXCEPTION 'Active Owner approval is required.' USING ERRCODE='42501'; END IF;
 v_request:=NULLIF(p_payload->>'request_id','')::uuid;
 IF v_request IS NULL THEN RAISE EXCEPTION 'A valid request_id is required.' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_request::text,0));
 SELECT * INTO v_old FROM private.admin_mutation_idempotency WHERE request_id=v_request;
 IF FOUND THEN IF v_old.actor<>p_actor OR v_old.action<>p_action THEN RAISE EXCEPTION 'Request ID has already been used.' USING ERRCODE='23505'; END IF; RETURN v_old.result; END IF;

 IF p_action IN('create_category','create_brand') THEN
  v_name:=btrim(coalesce(p_payload->>'name','')); v_slug:=lower(btrim(coalesce(p_payload->>'slug','')));
  IF length(v_name)<2 OR length(v_name)>80 OR v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR length(v_slug)>90 THEN RAISE EXCEPTION 'Enter a 2–80 character name and a valid lowercase URL slug.' USING ERRCODE='22023'; END IF;
  IF p_action='create_category' THEN
   INSERT INTO public.categories(name,slug,state,created_by) VALUES(v_name,v_slug,'published',p_actor) RETURNING id INTO v_category;
   v_result:=jsonb_build_object('ok',true,'action',p_action,'id',v_category,'name',v_name,'slug',v_slug);
  ELSE
   INSERT INTO public.brands(name,slug,state,created_by) VALUES(v_name,v_slug,'published',p_actor) RETURNING id INTO v_brand;
   v_result:=jsonb_build_object('ok',true,'action',p_action,'id',v_brand,'name',v_name,'slug',v_slug);
  END IF;
  INSERT INTO public.activity_logs(actor,actor_role,action,entity_type,entity_id,outcome,after_safe) VALUES(p_actor,'owner'::public.staff_role,p_action,replace(p_action,'create_',''),coalesce(v_category,v_brand)::text,'success',jsonb_build_object('name',v_name,'slug',v_slug));

 ELSIF p_action='assign_product_taxonomy' THEN
  v_product:=NULLIF(p_payload->>'product_id','')::uuid; v_category:=NULLIF(p_payload->>'category_id','')::uuid; v_brand:=NULLIF(p_payload->>'brand_id','')::uuid;
  IF v_product IS NULL OR v_category IS NULL OR v_brand IS NULL THEN RAISE EXCEPTION 'Choose a product, category and brand.' USING ERRCODE='22023'; END IF;
  PERFORM 1 FROM public.products WHERE id=v_product FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found.' USING ERRCODE='P0002'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.categories WHERE id=v_category AND state='published') OR NOT EXISTS(SELECT 1 FROM public.brands WHERE id=v_brand AND state='published') THEN RAISE EXCEPTION 'Selected category and brand must be active.' USING ERRCODE='22023'; END IF;
  UPDATE public.products SET category_id=v_category,brand_id=v_brand,category=(SELECT name FROM public.categories WHERE id=v_category),brand=(SELECT name FROM public.brands WHERE id=v_brand),updated_at=now() WHERE id=v_product;
  INSERT INTO public.activity_logs(actor,actor_role,action,entity_type,entity_id,outcome,after_safe) VALUES(p_actor,'owner'::public.staff_role,'product.taxonomy_assigned','product',v_product::text,'success',jsonb_build_object('category_id',v_category,'brand_id',v_brand));
  v_result:=jsonb_build_object('ok',true,'action',p_action,'product_id',v_product);

 ELSIF p_action='add_product_image' THEN
  v_product:=NULLIF(p_payload->>'product_id','')::uuid; v_path:=btrim(coalesce(p_payload->>'storage_path','')); v_alt:=btrim(coalesce(p_payload->>'alt_text',''));
  IF v_product IS NULL OR length(v_alt)<3 OR length(v_alt)>180 OR v_path !~ ('^'||v_product::text||'/[A-Za-z0-9._-]+$') THEN RAISE EXCEPTION 'Invalid product image metadata.' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.products WHERE id=v_product) THEN RAISE EXCEPTION 'Product not found.' USING ERRCODE='P0002'; END IF;
  SELECT metadata->>'mimetype' INTO v_file_type FROM storage.objects WHERE bucket_id='product-images' AND name=v_path;
  IF NOT FOUND OR v_file_type NOT IN('image/jpeg','image/png','image/webp','image/avif') THEN RAISE EXCEPTION 'Uploaded image was not found or has an unsupported type.' USING ERRCODE='22023'; END IF;
  IF coalesce((p_payload->>'is_primary')::boolean,false) THEN UPDATE public.product_media SET is_primary=false WHERE product_id=v_product; END IF;
  INSERT INTO public.product_media(product_id,storage_path,alt_text,sort_order,is_primary,created_by) VALUES(v_product,v_path,v_alt,coalesce(NULLIF(p_payload->>'sort_order','')::integer,0),coalesce((p_payload->>'is_primary')::boolean,false),p_actor) RETURNING id INTO v_media;
  INSERT INTO public.activity_logs(actor,actor_role,action,entity_type,entity_id,outcome,after_safe) VALUES(p_actor,'owner'::public.staff_role,'product.image_added','product',v_product::text,'success',jsonb_build_object('media_id',v_media,'storage_path',v_path,'is_primary',coalesce((p_payload->>'is_primary')::boolean,false)));
  v_result:=jsonb_build_object('ok',true,'action',p_action,'media_id',v_media,'storage_path',v_path);

 ELSIF p_action='publish_product' THEN
  v_product:=NULLIF(p_payload->>'product_id','')::uuid; v_reason:=btrim(coalesce(p_payload->>'reason',''));
  IF v_product IS NULL OR length(v_reason)<8 OR length(v_reason)>500 THEN RAISE EXCEPTION 'Choose a product and enter an approval reason (8–500 characters).' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_old FROM public.products WHERE id=v_product FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found.' USING ERRCODE='P0002'; END IF;
  IF v_old.category_id IS NULL OR v_old.brand_id IS NULL THEN RAISE EXCEPTION 'Assign an active category and brand before publishing.' USING ERRCODE='23514'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.product_media WHERE product_id=v_product AND is_primary=true) THEN RAISE EXCEPTION 'A primary product image is required before publishing.' USING ERRCODE='23514'; END IF;
  SELECT * INTO v_variant FROM public.product_variants WHERE product_id=v_product AND active=true ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF NOT FOUND OR coalesce(v_variant.selling_price,v_old.selling_price,0)<=0 OR v_variant.stock_on_hand<=v_variant.stock_reserved THEN RAISE EXCEPTION 'At least one active, priced variant with available stock is required.' USING ERRCODE='23514'; END IF;
  IF v_old.mrp IS NOT NULL AND v_old.selling_price IS NOT NULL AND v_old.mrp<v_old.selling_price THEN RAISE EXCEPTION 'MRP cannot be lower than selling price.' USING ERRCODE='23514'; END IF;
  UPDATE public.products SET state='published',is_sample=false,verified_sellable=true,updated_at=now() WHERE id=v_product;
  INSERT INTO public.activity_logs(actor,actor_role,action,entity_type,entity_id,outcome,reason,before_safe,after_safe) VALUES(p_actor,'owner'::public.staff_role,'product.published','product',v_product::text,'success',v_reason,jsonb_build_object('state',v_old.state,'verified_sellable',v_old.verified_sellable),jsonb_build_object('state','published','verified_sellable',true,'primary_image_required',true,'category_id',v_old.category_id,'brand_id',v_old.brand_id));
  v_result:=jsonb_build_object('ok',true,'action',p_action,'product_id',v_product,'state','published','verified_sellable',true);
 ELSE RAISE EXCEPTION 'Unsupported catalogue operation.' USING ERRCODE='22023';
 END IF;
 INSERT INTO private.admin_mutation_idempotency(request_id,actor,action,result) VALUES(v_request,p_actor,p_action,v_result);
 RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.iqa_catalogue_mutation(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.iqa_catalogue_mutation(uuid,text,jsonb) TO service_role;
