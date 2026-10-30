-- Restrict product image uploads/deletes to active owners and keep metadata writes in the privileged RPC.
create policy "iqa_owner_upload_product_images" on storage.objects for insert to authenticated with check (
 bucket_id='product-images' and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
 and exists(select 1 from public.staff_profiles s where s.user_id=(select auth.uid()) and s.active=true and s.role='owner')
);
create policy "iqa_owner_delete_product_images" on storage.objects for delete to authenticated using (
 bucket_id='product-images' and exists(select 1 from public.staff_profiles s where s.user_id=(select auth.uid()) and s.active=true and s.role='owner')
);
create or replace function private.iqa_admin_mutate(p_action text, p_actor uuid, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 v_product_id uuid; v_variant_id uuid; v_category_id uuid; v_brand_id uuid;
 v_sku text; v_variant_sku text; v_qty integer; v_before integer; v_after integer;
 v_price numeric; v_mrp numeric; v_name text; v_reason text; v_delta integer;
 v_movement text; v_request_id uuid; v_existing jsonb; v_result jsonb;
 v_slug text; v_category_name text; v_brand_name text; v_primary_media boolean;
begin
 begin v_request_id := (p_payload->>'request_id')::uuid;
 exception when others then raise exception 'A valid request_id is required.'; end;
 if p_action not in ('create_product','adjust_inventory','create_category','create_brand','assign_product_taxonomy','add_product_image','publish_product') then raise exception 'Unsupported action.'; end if;
 insert into private.admin_mutation_requests(request_id,actor,action)
 values(v_request_id,p_actor,p_action) on conflict(request_id) do nothing;
 if not found then
   select response into v_existing from private.admin_mutation_requests
   where request_id=v_request_id and actor=p_actor and action=p_action;
   if not found then raise exception 'Request ID already used for a different operation.'; end if;
   if v_existing is null then raise exception 'This request is already being processed.'; end if;
   return v_existing;
 end if;

 if p_action='create_product' then
   v_name:=nullif(btrim(p_payload->>'name'),'');
   v_sku:=nullif(upper(btrim(p_payload->>'sku')),'');
   v_variant_sku:=coalesce(nullif(upper(btrim(p_payload->>'variant_sku')),''),v_sku||'-DEFAULT');
   if v_name is null or length(v_name)>160 or v_sku is null or length(v_sku)>80 or length(v_variant_sku)>100 then raise exception 'Product name and valid SKU are required.'; end if;
   if coalesce(p_payload->>'audience','') not in ('','Men','Women','Unisex','Other') then raise exception 'Invalid audience.'; end if;
   if coalesce(p_payload->>'selling_price','')<>'' then v_price:=(p_payload->>'selling_price')::numeric; if v_price<0 or v_price>100000000 then raise exception 'Invalid selling price.'; end if; end if;
   if coalesce(p_payload->>'mrp','')<>'' then v_mrp:=(p_payload->>'mrp')::numeric; if v_mrp<0 or v_mrp>100000000 then raise exception 'Invalid MRP.'; end if; end if;
   v_qty:=coalesce(nullif(p_payload->>'initial_stock','')::integer,0);
   if v_qty<0 or v_qty>1000000 then raise exception 'Initial stock must be between 0 and 1,000,000.'; end if;
   insert into public.products(name,sku,brand,category,audience,description,selling_price,mrp,state,is_sample,verified_sellable,specs,seo)
   values(v_name,v_sku,nullif(btrim(p_payload->>'brand'),''),nullif(btrim(p_payload->>'category'),''),nullif(p_payload->>'audience',''),
    coalesce(p_payload->>'description',''),v_price,v_mrp,'draft',true,false,'{}'::jsonb,'{}'::jsonb) returning id into v_product_id;
   v_variant_id:=gen_random_uuid();
   insert into public.product_variants(id,product_id,sku,options,selling_price,stock_on_hand,stock_reserved,low_stock_threshold,active)
   values(v_variant_id,v_product_id,v_variant_sku,'{}'::jsonb,v_price,v_qty,0,greatest(0,coalesce(nullif(p_payload->>'low_stock_threshold','')::integer,0)),true);
   if v_qty>0 then insert into public.inventory_movements(variant_id,movement_type,quantity_delta,reason,actor)
    values(v_variant_id,'stock_in',v_qty,'Initial stock on product creation',p_actor); end if;
   insert into public.activity_logs(actor,action,entity_type,entity_id,outcome,after_safe)
   values(p_actor,'create_product','product',v_product_id::text,'success',jsonb_build_object('name',v_name,'sku',v_sku,'variant_sku',v_variant_sku,'initial_stock',v_qty,'state','draft'));
   v_result:=jsonb_build_object('ok',true,'product_id',v_product_id,'variant_id',v_variant_id,'state','draft','available',v_qty);

 elsif p_action='adjust_inventory' then
   begin v_variant_id:=(p_payload->>'variant_id')::uuid; exception when others then raise exception 'A valid variant_id is required.'; end;
   v_delta:=(p_payload->>'quantity_delta')::integer; v_movement:=coalesce(p_payload->>'movement_type','adjustment');
   if v_movement not in ('stock_in','stock_out','adjustment','receipt') then raise exception 'Invalid movement type.'; end if;
   if v_delta=0 or abs(v_delta)>1000000 then raise exception 'Quantity change must be non-zero and within 1,000,000.'; end if;
   if v_movement in ('stock_in','receipt') and v_delta<0 then raise exception 'Stock-in movement must be positive.'; end if;
   if v_movement='stock_out' and v_delta>0 then raise exception 'Stock-out movement must be negative.'; end if;
   v_reason:=nullif(btrim(p_payload->>'reason'),'');
   if v_reason is null or length(v_reason)>500 then raise exception 'A reason (up to 500 characters) is required.'; end if;
   select stock_on_hand into v_before from public.product_variants where id=v_variant_id and active=true for update;
   if not found then raise exception 'Active product variant not found.'; end if;
   v_after:=v_before+v_delta; if v_after<0 then raise exception 'Insufficient stock: adjustment would make stock negative.'; end if;
   update public.product_variants set stock_on_hand=v_after where id=v_variant_id;
   insert into public.inventory_movements(variant_id,movement_type,quantity_delta,reason,reference,actor)
   values(v_variant_id,v_movement,v_delta,v_reason,nullif(p_payload->>'reference',''),p_actor);
   insert into public.activity_logs(actor,action,entity_type,entity_id,outcome,before_safe,after_safe)
   values(p_actor,'adjust_inventory','product_variant',v_variant_id::text,'success',jsonb_build_object('stock_on_hand',v_before),
    jsonb_build_object('stock_on_hand',v_after,'delta',v_delta,'reason',v_reason));
   v_result:=jsonb_build_object('ok',true,'variant_id',v_variant_id,'stock_before',v_before,'stock_after',v_after,'available',v_after);

 elsif p_action in ('create_category','create_brand') then
   v_name:=nullif(btrim(p_payload->>'name'),''); v_slug:=lower(nullif(btrim(p_payload->>'slug'),''));
   if v_name is null or length(v_name)<2 or length(v_name)>80 or v_slug is null or length(v_slug)>90 or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
     raise exception 'Enter a name (2–80 characters) and valid lowercase URL slug.';
   end if;
   if p_action='create_category' then
     insert into public.categories(name,slug,state,created_by) values(v_name,v_slug,'published',p_actor) returning id into v_category_id;
     insert into public.activity_logs(actor,action,entity_type,entity_id,outcome,after_safe)
     values(p_actor,'create_category','category',v_category_id::text,'success',jsonb_build_object('name',v_name,'slug',v_slug,'state','published'));
     v_result:=jsonb_build_object('ok',true,'category_id',v_category_id,'name',v_name,'state','published');
   else
     insert into public.brands(name,slug,state,created_by) values(v_name,v_slug,'published',p_actor) returning id into v_brand_id;
     insert into public.activity_logs(actor,action,entity_type,entity_id,outcome,after_safe)
     values(p_actor,'create_brand','brand',v_brand_id::text,'success',jsonb_build_object('name',v_name,'slug',v_slug,'state','published'));
     v_result:=jsonb_build_object('ok',true,'brand_id',v_brand_id,'name',v_name,'state','published');
   end if;

 elsif p_action='assign_product_taxonomy' then
   begin v_product_id:=(p_payload->>'product_id')::uuid; v_category_id:=(p_payload->>'category_id')::uuid; v_brand_id:=(p_payload->>'brand_id')::uuid;
   exception when others then raise exception 'Select a valid product, category and brand.'; end;
   select name into v_category_name from public.categories where id=v_category_id and state='published';
   if not found then raise exception 'Choose a published category.'; end if;
   select name into v_brand_name from public.brands where id=v_brand_id and state='published';
   if not found then raise exception 'Choose a published brand.'; end if;
   perform 1 from public.products where id=v_product_id for update;
   if not found then raise exception 'Product not found.'; end if;
   update public.products set category_id=v_category_id,brand_id=v_brand_id,category=v_category_name,brand=v_brand_name
   where id=v_product_id;
   insert into public.activity_logs(actor,action,entity_type,entity_id,outcome,after_safe)
   values(p_actor,'assign_product_taxonomy','product',v_product_id::text,'success',jsonb_build_object('category_id',v_category_id,'brand_id',v_brand_id));
   v_result:=jsonb_build_object('ok',true,'product_id',v_product_id,'category_id',v_category_id,'brand_id',v_brand_id);

 elsif p_action='add_product_image' then
   begin v_product_id:=(p_payload->>'product_id')::uuid; exception when others then raise exception 'Choose a valid product.'; end;
   v_name:=nullif(btrim(p_payload->>'storage_path'),''); v_reason:=nullif(btrim(p_payload->>'alt_text'),'');
   if v_name is null or v_name !~ ('^'||v_product_id::text||'/[A-Za-z0-9._-]+
   begin v_product_id:=(p_payload->>'product_id')::uuid; exception when others then raise exception 'Choose a valid product.'; end;
   v_reason:=nullif(btrim(p_payload->>'reason'),'');
   if v_reason is null or length(v_reason)<8 or length(v_reason)>500 then raise exception 'A publication approval reason (8–500 characters) is required.'; end if;
   select selling_price,mrp,category_id,brand_id into v_price,v_mrp,v_category_id,v_brand_id
   from public.products where id=v_product_id for update;
   if not found then raise exception 'Product not found.'; end if;
   if v_price is null or v_price<=0 or (v_mrp is not null and v_mrp<v_price) then raise exception 'Set a valid selling price and MRP before publishing.'; end if;
   if v_category_id is null or v_brand_id is null then raise exception 'Assign both a published category and brand before publishing.'; end if;
   if not exists(select 1 from public.categories where id=v_category_id and state='published') or not exists(select 1 from public.brands where id=v_brand_id and state='published') then raise exception 'Product taxonomy must be published.'; end if;
   select id,stock_on_hand-stock_reserved into v_variant_id,v_after from public.product_variants where product_id=v_product_id and active=true order by created_at limit 1 for update;
   if not found or v_after<=0 then raise exception 'At least one active variant with available stock is required.'; end if;
   select exists(select 1 from public.product_media where product_id=v_product_id and is_primary=true) into v_primary_media;
   if not v_primary_media then raise exception 'Upload and approve a primary product image before publishing.'; end if;
   update public.products set state='published',is_sample=false,verified_sellable=true where id=v_product_id;
   insert into public.activity_logs(actor,action,entity_type,entity_id,outcome,before_safe,after_safe)
   values(p_actor,'publish_product','product',v_product_id::text,'success',jsonb_build_object('state','draft'),
    jsonb_build_object('state','published','verified_sellable',true,'reason',v_reason));
   v_result:=jsonb_build_object('ok',true,'product_id',v_product_id,'state','published','verified_sellable',true,'available',v_after);
 end if;

 update private.admin_mutation_requests set response=v_result where request_id=v_request_id;
 return v_result;
end $$;
revoke all on function private.iqa_admin_mutate(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function private.iqa_admin_mutate(text,uuid,jsonb) to service_role;
create or replace function public.iqa_admin_mutate(p_action text,p_actor uuid,p_payload jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select private.iqa_admin_mutate(p_action,p_actor,p_payload) $$;
revoke all on function public.iqa_admin_mutate(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.iqa_admin_mutate(text,uuid,jsonb) to service_role;
) or length(v_name)>180 then raise exception 'Invalid product image path.'; end if;
   if v_reason is null or length(v_reason)<3 or length(v_reason)>180 then raise exception 'Image alt text must be 3–180 characters.'; end if;
   perform 1 from public.products where id=v_product_id for update;
   if not found then raise exception 'Product not found.'; end if;
   if coalesce((p_payload->>'is_primary')::boolean,false) then update public.product_media set is_primary=false where product_id=v_product_id; end if;
   insert into public.product_media(product_id,storage_path,alt_text,is_primary,created_by)
   values(v_product_id,v_name,v_reason,coalesce((p_payload->>'is_primary')::boolean,false),p_actor) returning id into v_variant_id;
   insert into public.activity_logs(actor,action,entity_type,entity_id,outcome,after_safe)
   values(p_actor,'add_product_image','product',v_product_id::text,'success',jsonb_build_object('media_id',v_variant_id,'storage_path',v_name,'is_primary',coalesce((p_payload->>'is_primary')::boolean,false)));
   v_result:=jsonb_build_object('ok',true,'product_id',v_product_id,'media_id',v_variant_id,'storage_path',v_name);
 elsif p_action='publish_product' then
   begin v_product_id:=(p_payload->>'product_id')::uuid; exception when others then raise exception 'Choose a valid product.'; end;
   v_reason:=nullif(btrim(p_payload->>'reason'),'');
   if v_reason is null or length(v_reason)<8 or length(v_reason)>500 then raise exception 'A publication approval reason (8–500 characters) is required.'; end if;
   select selling_price,mrp,category_id,brand_id into v_price,v_mrp,v_category_id,v_brand_id
   from public.products where id=v_product_id for update;
   if not found then raise exception 'Product not found.'; end if;
   if v_price is null or v_price<=0 or (v_mrp is not null and v_mrp<v_price) then raise exception 'Set a valid selling price and MRP before publishing.'; end if;
   if v_category_id is null or v_brand_id is null then raise exception 'Assign both a published category and brand before publishing.'; end if;
   if not exists(select 1 from public.categories where id=v_category_id and state='published') or not exists(select 1 from public.brands where id=v_brand_id and state='published') then raise exception 'Product taxonomy must be published.'; end if;
   select id,stock_on_hand-stock_reserved into v_variant_id,v_after from public.product_variants where product_id=v_product_id and active=true order by created_at limit 1 for update;
   if not found or v_after<=0 then raise exception 'At least one active variant with available stock is required.'; end if;
   select exists(select 1 from public.product_media where product_id=v_product_id and is_primary=true) into v_primary_media;
   if not v_primary_media then raise exception 'Upload and approve a primary product image before publishing.'; end if;
   update public.products set state='published',is_sample=false,verified_sellable=true where id=v_product_id;
   insert into public.activity_logs(actor,action,entity_type,entity_id,outcome,before_safe,after_safe)
   values(p_actor,'publish_product','product',v_product_id::text,'success',jsonb_build_object('state','draft'),
    jsonb_build_object('state','published','verified_sellable',true,'reason',v_reason));
   v_result:=jsonb_build_object('ok',true,'product_id',v_product_id,'state','published','verified_sellable',true,'available',v_after);
 end if;

 update private.admin_mutation_requests set response=v_result where request_id=v_request_id;
 return v_result;
end $$;
revoke all on function private.iqa_admin_mutate(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function private.iqa_admin_mutate(text,uuid,jsonb) to service_role;
create or replace function public.iqa_admin_mutate(p_action text,p_actor uuid,p_payload jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select private.iqa_admin_mutate(p_action,p_actor,p_payload) $$;
revoke all on function public.iqa_admin_mutate(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.iqa_admin_mutate(text,uuid,jsonb) to service_role;
