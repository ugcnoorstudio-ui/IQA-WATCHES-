create or replace function private.iqa_update_product(p_actor uuid, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $fn$
declare
  v_request uuid; v_product uuid; v_reason text; v_existing jsonb; v_before jsonb; v_after jsonb; v_result jsonb;
  v_name text; v_description text; v_audience text; v_price numeric; v_mrp numeric;
begin
  if p_actor is null or p_payload is null or jsonb_typeof(p_payload) <> 'object' then raise exception 'Invalid update request.'; end if;
  if not exists (select 1 from public.staff_profiles s where s.user_id=p_actor and s.active=true and s.role='owner') then raise exception 'Active Owner authorization required.'; end if;
  begin v_request := (p_payload->>'request_id')::uuid; v_product := (p_payload->>'product_id')::uuid;
  exception when others then raise exception 'Valid request_id and product_id are required.'; end;
  v_reason := nullif(btrim(p_payload->>'reason'),'');
  if v_reason is null or length(v_reason)<8 or length(v_reason)>500 then raise exception 'An update reason (8–500 characters) is required.'; end if;
  if exists (select 1 from jsonb_object_keys(p_payload) k where k <> all(array['request_id','product_id','reason','name','description','audience','selling_price','mrp','specs','seo'])) then raise exception 'Unsupported product field.'; end if;
  insert into private.admin_mutation_requests(request_id,actor,action) values(v_request,p_actor,'update_product') on conflict(request_id) do nothing;
  if not found then
    select response into v_existing from private.admin_mutation_requests where request_id=v_request and actor=p_actor and action='update_product';
    if not found then raise exception 'Request ID already used for a different operation.'; end if;
    if v_existing is null then raise exception 'This request is already being processed.'; end if;
    return v_existing;
  end if;
  select jsonb_build_object('name',name,'description',description,'audience',audience,'selling_price',selling_price,'mrp',mrp,'specs',specs,'seo',seo)
  into v_before from public.products where id=v_product for update;
  if not found then raise exception 'Product not found.'; end if;
  if p_payload ? 'name' then v_name:=nullif(btrim(p_payload->>'name'),''); if v_name is null or length(v_name)>160 then raise exception 'Product name must be 1–160 characters.'; end if; end if;
  if p_payload ? 'description' then v_description:=p_payload->>'description'; if v_description is null or length(v_description)>10000 then raise exception 'Description must be present and at most 10,000 characters.'; end if; end if;
  if p_payload ? 'audience' then v_audience:=p_payload->>'audience'; if v_audience is not null and v_audience not in ('Men','Women','Unisex','Other') then raise exception 'Invalid audience.'; end if; end if;
  if p_payload ? 'selling_price' then begin v_price:=nullif(p_payload->>'selling_price','')::numeric; exception when others then raise exception 'Invalid selling price.'; end; if v_price is not null and (v_price<0 or v_price>100000000) then raise exception 'Invalid selling price.'; end if; end if;
  if p_payload ? 'mrp' then begin v_mrp:=nullif(p_payload->>'mrp','')::numeric; exception when others then raise exception 'Invalid MRP.'; end; if v_mrp is not null and (v_mrp<0 or v_mrp>100000000) then raise exception 'Invalid MRP.'; end if; end if;
  if p_payload ? 'specs' and jsonb_typeof(p_payload->'specs') not in ('object','null') then raise exception 'Specs must be a JSON object.'; end if;
  if p_payload ? 'seo' and jsonb_typeof(p_payload->'seo') not in ('object','null') then raise exception 'SEO must be a JSON object.'; end if;
  update public.products set
    name=case when p_payload ? 'name' then v_name else name end,
    description=case when p_payload ? 'description' then v_description else description end,
    audience=case when p_payload ? 'audience' then v_audience else audience end,
    selling_price=case when p_payload ? 'selling_price' then v_price else selling_price end,
    mrp=case when p_payload ? 'mrp' then v_mrp else mrp end,
    specs=case when p_payload ? 'specs' then coalesce(p_payload->'specs','{}'::jsonb) else specs end,
    seo=case when p_payload ? 'seo' then coalesce(p_payload->'seo','{}'::jsonb) else seo end
  where id=v_product;
  select jsonb_build_object('name',name,'description',description,'audience',audience,'selling_price',selling_price,'mrp',mrp,'specs',specs,'seo',seo)
  into v_after from public.products where id=v_product;
  insert into public.activity_logs(actor,actor_role,action,entity_type,entity_id,outcome,reason,before_safe,after_safe)
  values(p_actor,'owner','update_product','product',v_product::text,'success',v_reason,v_before,v_after);
  v_result:=jsonb_build_object('ok',true,'product_id',v_product,'state',(select state::text from public.products where id=v_product));
  update private.admin_mutation_requests set response=v_result where request_id=v_request;
  return v_result;
end;
$fn$;

create or replace function private.iqa_update_product_variant(p_actor uuid, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $fn$
declare
  v_request uuid; v_variant uuid; v_reason text; v_existing jsonb; v_before jsonb; v_after jsonb; v_result jsonb;
  v_sku text; v_price numeric; v_threshold integer;
begin
  if p_actor is null or p_payload is null or jsonb_typeof(p_payload) <> 'object' then raise exception 'Invalid variant update request.'; end if;
  if not exists (select 1 from public.staff_profiles s where s.user_id=p_actor and s.active=true and s.role='owner') then raise exception 'Active Owner authorization required.'; end if;
  begin v_request := (p_payload->>'request_id')::uuid; v_variant := (p_payload->>'variant_id')::uuid;
  exception when others then raise exception 'Valid request_id and variant_id are required.'; end;
  v_reason := nullif(btrim(p_payload->>'reason'),'');
  if v_reason is null or length(v_reason)<8 or length(v_reason)>500 then raise exception 'An update reason (8–500 characters) is required.'; end if;
  if exists (select 1 from jsonb_object_keys(p_payload) k where k <> all(array['request_id','variant_id','reason','sku','options','selling_price','low_stock_threshold'])) then raise exception 'Unsupported variant field.'; end if;
  insert into private.admin_mutation_requests(request_id,actor,action) values(v_request,p_actor,'update_product_variant') on conflict(request_id) do nothing;
  if not found then
    select response into v_existing from private.admin_mutation_requests where request_id=v_request and actor=p_actor and action='update_product_variant';
    if not found then raise exception 'Request ID already used for a different operation.'; end if;
    if v_existing is null then raise exception 'This request is already being processed.'; end if;
    return v_existing;
  end if;
  select jsonb_build_object('sku',sku,'options',options,'selling_price',selling_price,'low_stock_threshold',low_stock_threshold)
  into v_before from public.product_variants where id=v_variant for update;
  if not found then raise exception 'Product variant not found.'; end if;
  if p_payload ? 'sku' then v_sku:=upper(nullif(btrim(p_payload->>'sku'),'')); if v_sku is null or length(v_sku)>100 then raise exception 'Variant SKU must be 1–100 characters.'; end if; if exists(select 1 from public.product_variants where sku=v_sku and id<>v_variant) then raise exception 'Variant SKU already exists.'; end if; end if;
  if p_payload ? 'options' and jsonb_typeof(p_payload->'options') <> 'object' then raise exception 'Variant options must be a JSON object.'; end if;
  if p_payload ? 'selling_price' then begin v_price:=nullif(p_payload->>'selling_price','')::numeric; exception when others then raise exception 'Invalid variant selling price.'; end; if v_price is not null and (v_price<0 or v_price>100000000) then raise exception 'Invalid variant selling price.'; end if; end if;
  if p_payload ? 'low_stock_threshold' then begin v_threshold:=(p_payload->>'low_stock_threshold')::integer; exception when others then raise exception 'Invalid low-stock threshold.'; end; if v_threshold<0 or v_threshold>1000000 then raise exception 'Low-stock threshold must be between 0 and 1,000,000.'; end if; end if;
  update public.product_variants set
    sku=case when p_payload ? 'sku' then v_sku else sku end,
    options=case when p_payload ? 'options' then p_payload->'options' else options end,
    selling_price=case when p_payload ? 'selling_price' then v_price else selling_price end,
    low_stock_threshold=case when p_payload ? 'low_stock_threshold' then v_threshold else low_stock_threshold end
  where id=v_variant;
  select jsonb_build_object('sku',sku,'options',options,'selling_price',selling_price,'low_stock_threshold',low_stock_threshold)
  into v_after from public.product_variants where id=v_variant;
  insert into public.activity_logs(actor,actor_role,action,entity_type,entity_id,outcome,reason,before_safe,after_safe)
  values(p_actor,'owner','update_product_variant','product_variant',v_variant::text,'success',v_reason,v_before,v_after);
  v_result:=jsonb_build_object('ok',true,'variant_id',v_variant);
  update private.admin_mutation_requests set response=v_result where request_id=v_request;
  return v_result;
end;
$fn$;

revoke all on function private.iqa_update_product(uuid,jsonb) from public, anon, authenticated, service_role;
revoke all on function private.iqa_update_product_variant(uuid,jsonb) from public, anon, authenticated, service_role;
create or replace function public.iqa_update_product(p_actor uuid,p_payload jsonb)
returns jsonb language sql security definer set search_path=''
as $fn$ select private.iqa_update_product(p_actor,p_payload) $fn$;
create or replace function public.iqa_update_product_variant(p_actor uuid,p_payload jsonb)
returns jsonb language sql security definer set search_path=''
as $fn$ select private.iqa_update_product_variant(p_actor,p_payload) $fn$;
revoke all on function public.iqa_update_product(uuid,jsonb) from public, anon, authenticated;
revoke all on function public.iqa_update_product_variant(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.iqa_update_product(uuid,jsonb) to service_role;
grant execute on function public.iqa_update_product_variant(uuid,jsonb) to service_role;
