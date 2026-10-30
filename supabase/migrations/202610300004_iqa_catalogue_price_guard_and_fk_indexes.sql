-- Keep catalogue author foreign keys indexed and validate the effective variant price.
CREATE INDEX IF NOT EXISTS categories_created_by_idx ON public.categories(created_by);
CREATE INDEX IF NOT EXISTS brands_created_by_idx ON public.brands(created_by);
CREATE INDEX IF NOT EXISTS product_media_created_by_idx ON public.product_media(created_by);
DO $$
DECLARE
 v_definition text;
 v_old text := 'IF v_old.mrp IS NOT NULL AND v_old.selling_price IS NOT NULL AND v_old.mrp<v_old.selling_price THEN RAISE EXCEPTION ''MRP cannot be lower than selling price.'' USING ERRCODE=''23514''; END IF;';
 v_new text := 'IF v_old.mrp IS NOT NULL AND coalesce(v_variant.selling_price,v_old.selling_price,0)>v_old.mrp THEN RAISE EXCEPTION ''MRP cannot be lower than the selected variant selling price.'' USING ERRCODE=''23514''; END IF;';
BEGIN
 SELECT pg_get_functiondef('public.iqa_catalogue_mutation(uuid,text,jsonb)'::regprocedure) INTO v_definition;
 IF position(v_old in v_definition)=0 THEN RAISE EXCEPTION 'Expected publication price check not found; migration stopped.'; END IF;
 EXECUTE replace(v_definition,v_old,v_new);
END $$;