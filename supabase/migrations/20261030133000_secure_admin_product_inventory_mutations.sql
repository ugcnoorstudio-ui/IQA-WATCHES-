-- IQA WATCHES: owner-only, atomic product and inventory mutations.
-- Browser roles receive no direct table access; only the Edge Function's service role can call the RPC.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.admin_mutation_requests (
 request_id uuid primary key,
 actor uuid not null references auth.users(id),
 action text not null,
 response jsonb,
 created_at timestamptz not null default now()
);
revoke all on private.admin_mutation_requests from public, anon, authenticated;
grant all on private.admin_mutation_requests to service_role;

create or replace function private.iqa_admin_mutate(p_action text, p_actor uuid, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 v_product_id uuid; v_variant_id uuid; v_sku text; v_variant_sku text;
 v_qty integer; v_before integer; v_after integer; v_price numeric; v_mrp numeric;
 v_name text; v_reason text; v_delta integer; v_movement text;
 v_request_id uuid; v_existing jsonb; v_result jsonb;
begin
 begin v_request_id := (p_payload->>'request_id')::uuid;
 exception when others then raise exception 'A valid request_id is required.'; end;
 if p_action not in ('create_product','adjust_inventory') then raise exception 'Unsupported action.'; end if;
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
 else
   begin v_variant_id:=(p_payload->>'variant_id')::uuid; exception when others then raise exception 'A valid variant_id is required.'; end;
   v_delta:=(p_payload->>'quantity_delta')::integer;
   v_movement:=coalesce(p_payload->>'movement_type','adjustment');
   if v_movement not in ('stock_in','stock_out','adjustment','receipt') then raise exception 'Invalid movement type.'; end if;
   if v_delta=0 or abs(v_delta)>1000000 then raise exception 'Quantity change must be non-zero and within 1,000,000.'; end if;
   if v_movement in ('stock_in','receipt') and v_delta<0 then raise exception 'Stock-in movement must be positive.'; end if;
   if v_movement='stock_out' and v_delta>0 then raise exception 'Stock-out movement must be negative.'; end if;
   v_reason:=nullif(btrim(p_payload->>'reason'),'');
   if v_reason is null or length(v_reason)>500 then raise exception 'A reason (up to 500 characters) is required.'; end if;
   select stock_on_hand into v_before from public.product_variants where id=v_variant_id and active=true for update;
   if not found then raise exception 'Active product variant not found.'; end if;
   v_after:=v_before+v_delta;
   if v_after<0 then raise exception 'Insufficient stock: adjustment would make stock negative.'; end if;
   update public.product_variants set stock_on_hand=v_after where id=v_variant_id;
   insert into public.inventory_movements(variant_id,movement_type,quantity_delta,reason,reference,actor)
   values(v_variant_id,v_movement,v_delta,v_reason,nullif(p_payload->>'reference',''),p_actor);
   insert into public.activity_logs(actor,action,entity_type,entity_id,outcome,before_safe,after_safe)
   values(p_actor,'adjust_inventory','product_variant',v_variant_id::text,'success',jsonb_build_object('stock_on_hand',v_before),
    jsonb_build_object('stock_on_hand',v_after,'delta',v_delta,'reason',v_reason));
   v_result:=jsonb_build_object('ok',true,'variant_id',v_variant_id,'stock_before',v_before,'stock_after',v_after,'available',v_after);
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
