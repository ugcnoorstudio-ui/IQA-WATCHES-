-- IQA WATCHES: owner-only transactional product and inventory writes.
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE IF NOT EXISTS private.admin_mutation_idempotency (
 request_id uuid PRIMARY KEY,
 actor uuid NOT NULL REFERENCES auth.users(id),
 action text NOT NULL,
 result jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON private.admin_mutation_idempotency FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.iqa_admin_mutation(p_actor uuid,p_action text,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
 v_request_id uuid; v_existing record; v_result jsonb; v_product_id uuid; v_variant_id uuid;
 v_variant record; v_name text; v_sku text; v_variant_sku text; v_brand text; v_category text;
 v_audience text; v_description text; v_price numeric(12,2); v_mrp numeric(12,2);
 v_stock integer; v_threshold integer; v_delta integer; v_new_stock integer;
 v_reason text; v_reference text; v_movement_type text;
BEGIN
 IF p_actor IS NULL OR p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' THEN RAISE EXCEPTION 'Invalid request.' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id=p_actor AND active=true AND role='owner'::public.staff_role) THEN RAISE EXCEPTION 'Owner approval is required for this operation.' USING ERRCODE='42501'; END IF;
 v_request_id:=NULLIF(p_payload->>'request_id','')::uuid;
 IF v_request_id IS NULL THEN RAISE EXCEPTION 'A valid request_id is required.' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_request_id::text,0));
 SELECT * INTO v_existing FROM private.admin_mutation_idempotency WHERE request_id=v_request_id;
 IF FOUND THEN
  IF v_existing.actor<>p_actor OR v_existing.action<>p_action THEN RAISE EXCEPTION 'Request ID has already been used.' USING ERRCODE='23505'; END IF;
  RETURN v_existing.result;
 END IF;
 IF p_action='create_product' THEN
  v_name:=btrim(coalesce(p_payload->>'name','')); v_sku:=upper(btrim(coalesce(p_payload->>'sku','')));
  v_variant_sku:=upper(btrim(coalesce(nullif(p_payload->>'variant_sku',''),v_sku)));
  v_brand:=nullif(btrim(coalesce(p_payload->>'brand','')),''); v_category:=nullif(btrim(coalesce(p_payload->>'category','')),'');
  v_audience:=nullif(btrim(coalesce(p_payload->>'audience','')),''); v_description:=btrim(coalesce(p_payload->>'description',''));
  v_reason:=btrim(coalesce(p_payload->>'reason','')); v_stock:=coalesce(nullif(p_payload->>'initial_stock','')::integer,0);
  v_threshold:=coalesce(nullif(p_payload->>'low_stock_threshold','')::integer,0);
  v_price:=nullif(p_payload->>'selling_price','')::numeric; v_mrp:=nullif(p_payload->>'mrp','')::numeric;
  IF length(v_name)<2 OR length(v_name)>120 THEN RAISE EXCEPTION 'Product name must be 2–120 characters.' USING ERRCODE='22023'; END IF;
  IF length(v_sku)<2 OR length(v_sku)>64 OR v_sku !~ '^[A-Z0-9][A-Z0-9._-]*$' THEN RAISE EXCEPTION 'Product SKU is invalid.' USING ERRCODE='22023'; END IF;
  IF length(v_variant_sku)<2 OR length(v_variant_sku)>64 OR v_variant_sku !~ '^[A-Z0-9][A-Z0-9._-]*$' THEN RAISE EXCEPTION 'Variant SKU is invalid.' USING ERRCODE='22023'; END IF;
  IF v_audience IS NOT NULL AND v_audience NOT IN('Men','Women','Unisex','Other') THEN RAISE EXCEPTION 'Invalid audience.' USING ERRCODE='22023'; END IF;
  IF length(v_description)>4000 OR v_stock<0 OR v_stock>1000000 OR v_threshold<0 OR v_threshold>100000 THEN RAISE EXCEPTION 'Description or stock values are outside allowed limits.' USING ERRCODE='22023'; END IF;
  IF v_price IS NOT NULL AND(v_price<0 OR v_price>100000000) THEN RAISE EXCEPTION 'Selling price is outside allowed limits.' USING ERRCODE='22023'; END IF;
  IF v_mrp IS NOT NULL AND(v_mrp<0 OR v_mrp>100000000) THEN RAISE EXCEPTION 'MRP is outside allowed limits.' USING ERRCODE='22023'; END IF;
  IF v_stock>0 AND length(v_reason)<4 THEN RAISE EXCEPTION 'A reason of at least 4 characters is required for initial stock.' USING ERRCODE='22023'; END IF;
  INSERT INTO public.products(name,sku,brand,category,audience,description,selling_price,mrp,state,is_sample,verified_sellable)
   VALUES(v_name,v_sku,v_brand,v_category,v_audience,v_description,v_price,v_mrp,'draft',false,false) RETURNING id INTO v_product_id;
  INSERT INTO public.product_variants(product_id,sku,options,selling_price,stock_on_hand,stock_reserved,low_stock_threshold,active)
   VALUES(v_product_id,v_variant_sku,'{}'::jsonb,v_price,v_stock,0,v_threshold,true) RETURNING id INTO v_variant_id;
  IF v_stock>0 THEN INSERT INTO public.inventory_movements(variant_id,movement_type,quantity_delta,reason,reference,actor)
   VALUES(v_variant_id,'stock_in',v_stock,v_reason,'Initial product setup',p_actor); END IF;
  INSERT INTO public.activity_logs(actor,actor_role,action,entity_type,entity_id,outcome,reason,before_safe,after_safe)
   VALUES(p_actor,'owner'::public.staff_role,'product.created','product',v_product_id::text,'success',nullif(v_reason,''),null,
    jsonb_build_object('name',v_name,'sku',v_sku,'variant_sku',v_variant_sku,'state','draft','selling_price',v_price,'mrp',v_mrp,'initial_stock',v_stock));
  v_result:=jsonb_build_object('ok',true,'action',p_action,'product_id',v_product_id,'variant_id',v_variant_id,'state','draft','verified_sellable',false,'stock_on_hand',v_stock);
 ELSIF p_action='adjust_inventory' THEN
  v_variant_id:=nullif(p_payload->>'variant_id','')::uuid; v_delta:=nullif(p_payload->>'quantity_delta','')::integer;
  v_reason:=btrim(coalesce(p_payload->>'reason','')); v_reference:=nullif(btrim(coalesce(p_payload->>'reference','')),'');
  v_movement_type:=coalesce(nullif(p_payload->>'movement_type',''),'adjustment');
  IF v_variant_id IS NULL OR v_delta IS NULL OR v_delta=0 OR v_delta < -100000 OR v_delta > 100000 THEN RAISE EXCEPTION 'Choose a variant and enter a non-zero adjustment up to 100,000 units.' USING ERRCODE='22023'; END IF;
  IF length(v_reason)<4 OR length(v_reason)>500 THEN RAISE EXCEPTION 'A reason of 4–500 characters is required.' USING ERRCODE='22023'; END IF;
  IF v_reference IS NOT NULL AND length(v_reference)>120 THEN RAISE EXCEPTION 'Reference must be 120 characters or fewer.' USING ERRCODE='22023'; END IF;
  IF v_movement_type NOT IN('stock_in','stock_out','adjustment') THEN RAISE EXCEPTION 'Unsupported movement type.' USING ERRCODE='22023'; END IF;
  IF(v_movement_type='stock_in' AND v_delta<0) OR(v_movement_type='stock_out' AND v_delta>0) THEN RAISE EXCEPTION 'Quantity sign does not match movement type.' USING ERRCODE='22023'; END IF;
  SELECT id,sku,stock_on_hand,stock_reserved INTO v_variant FROM public.product_variants WHERE id=v_variant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Variant not found.' USING ERRCODE='P0002'; END IF;
  v_new_stock:=v_variant.stock_on_hand+v_delta;
  IF v_new_stock<v_variant.stock_reserved THEN RAISE EXCEPTION 'Stock cannot fall below reserved quantity.' USING ERRCODE='23514'; END IF;
  IF v_new_stock<0 OR v_new_stock>1000000 THEN RAISE EXCEPTION 'Resulting stock is outside allowed limits.' USING ERRCODE='22023'; END IF;
  UPDATE public.product_variants SET stock_on_hand=v_new_stock WHERE id=v_variant_id;
  INSERT INTO public.inventory_movements(variant_id,movement_type,quantity_delta,reason,reference,actor)
   VALUES(v_variant_id,v_movement_type,v_delta,v_reason,v_reference,p_actor);
  INSERT INTO public.activity_logs(actor,actor_role,action,entity_type,entity_id,outcome,reason,before_safe,after_safe)
   VALUES(p_actor,'owner'::public.staff_role,'inventory.adjusted','product_variant',v_variant_id::text,'success',v_reason,
    jsonb_build_object('sku',v_variant.sku,'stock_on_hand',v_variant.stock_on_hand,'stock_reserved',v_variant.stock_reserved),
    jsonb_build_object('sku',v_variant.sku,'stock_on_hand',v_new_stock,'stock_reserved',v_variant.stock_reserved,'quantity_delta',v_delta,'movement_type',v_movement_type,'reference',v_reference));
  v_result:=jsonb_build_object('ok',true,'action',p_action,'variant_id',v_variant_id,'sku',v_variant.sku,'previous_stock',v_variant.stock_on_hand,'stock_on_hand',v_new_stock,'stock_reserved',v_variant.stock_reserved,'available',v_new_stock-v_variant.stock_reserved);
 ELSE RAISE EXCEPTION 'Unsupported administrative action.' USING ERRCODE='22023';
 END IF;
 INSERT INTO private.admin_mutation_idempotency(request_id,actor,action,result) VALUES(v_request_id,p_actor,p_action,v_result);
 RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.iqa_admin_mutation(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.iqa_admin_mutation(uuid,text,jsonb) TO service_role;
