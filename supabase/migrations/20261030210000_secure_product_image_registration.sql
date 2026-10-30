-- Secure owner-only product image metadata registration.
create or replace function public.iqa_register_product_image(
  p_actor uuid,
  p_product_id uuid,
  p_storage_path text,
  p_alt_text text,
  p_is_primary boolean
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_media_id uuid;
begin
  if p_actor is null or not exists (
    select 1 from public.staff_profiles where user_id=p_actor and active=true and role='owner'
  ) then raise exception 'Active owner authorization is required.'; end if;
  if p_product_id is null or p_storage_path is null
     or p_storage_path !~ ('^'||p_product_id::text||'/[0-9a-f-]{36}\.(jpg|png|webp|avif)$')
     or length(coalesce(p_alt_text,''))<3 or length(p_alt_text)>180 then
    raise exception 'Invalid product image metadata.';
  end if;
  if not exists(select 1 from public.products where id=p_product_id) then raise exception 'Product not found.'; end if;
  if not exists(select 1 from storage.objects where bucket_id='product-images' and name=p_storage_path) then
    raise exception 'Uploaded image object was not found.';
  end if;
  if coalesce(p_is_primary,false) then
    update public.product_media set is_primary=false where product_id=p_product_id and is_primary=true;
  end if;
  insert into public.product_media(product_id,bucket_id,storage_path,alt_text,sort_order,is_primary,created_by)
  values(p_product_id,'product-images',p_storage_path, p_alt_text,
    coalesce((select max(sort_order)+1 from public.product_media where product_id=p_product_id),0),
    coalesce(p_is_primary,false),p_actor)
  returning id into v_media_id;
  insert into public.activity_logs(actor,action,entity_type,entity_id,outcome,after_safe)
  values(p_actor,'add_product_image','product_media',v_media_id::text,'success',
    jsonb_build_object('product_id',p_product_id,'storage_path',p_storage_path,'is_primary',coalesce(p_is_primary,false)));
  return jsonb_build_object('ok',true,'media_id',v_media_id,'product_id',p_product_id,'storage_path',p_storage_path,'is_primary',coalesce(p_is_primary,false));
end;
$$;
revoke all on function public.iqa_register_product_image(uuid,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.iqa_register_product_image(uuid,uuid,text,text,boolean) to service_role;
