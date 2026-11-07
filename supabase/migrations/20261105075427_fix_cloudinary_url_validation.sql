alter table public.product_media drop constraint if exists product_media_cloudinary_url_check;
alter table public.product_media add constraint product_media_cloudinary_url_check
  check (image_url is null or image_url like 'https://res.cloudinary.com/rrmdzam7/image/upload/%');

create or replace function public.iqa_register_cloudinary_product_image(
  p_actor uuid, p_product_id uuid, p_image_url text, p_cloudinary_public_id text,
  p_alt_text text, p_is_primary boolean
) returns jsonb
language plpgsql security definer set search_path = ''
as $function$
declare v_media_id uuid;
begin
  if p_actor is null or not exists (
    select 1 from public.staff_profiles
    where user_id=p_actor and active=true and role='owner'
  ) then raise exception 'Active owner authorization is required.'; end if;

  if p_product_id is null
    or p_image_url is null
    or p_image_url not like 'https://res.cloudinary.com/rrmdzam7/image/upload/%'
    or p_cloudinary_public_id is null
    or p_cloudinary_public_id !~ '^iqa-watches/products/[A-Za-z0-9_-]+$'
    or length(coalesce(p_alt_text,'')) < 3 or length(p_alt_text)>180
  then raise exception 'Invalid Cloudinary product image metadata.'; end if;

  if not exists(select 1 from public.products where id=p_product_id)
  then raise exception 'Product not found.'; end if;

  if coalesce(p_is_primary,false) then
    update public.product_media set is_primary=false
    where product_id=p_product_id and is_primary=true;
  end if;

  insert into public.product_media(
    product_id,bucket_id,storage_path,image_url,cloudinary_public_id,
    alt_text,sort_order,is_primary,created_by
  ) values (
    p_product_id,'product-images',null,p_image_url,p_cloudinary_public_id,
    p_alt_text,
    coalesce((select max(sort_order)+1 from public.product_media where product_id=p_product_id),0),
    coalesce(p_is_primary,false),p_actor
  ) returning id into v_media_id;

  insert into public.activity_logs(actor,action,entity_type,entity_id,outcome,after_safe)
  values(p_actor,'add_product_image','product_media',v_media_id::text,'success',
    jsonb_build_object('product_id',p_product_id,'cloudinary_public_id',p_cloudinary_public_id,'is_primary',coalesce(p_is_primary,false)));

  return jsonb_build_object('ok',true,'media_id',v_media_id,'product_id',p_product_id,
    'image_url',p_image_url,'cloudinary_public_id',p_cloudinary_public_id,'is_primary',coalesce(p_is_primary,false));
end;
$function$;
revoke all on function public.iqa_register_cloudinary_product_image(uuid,uuid,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.iqa_register_cloudinary_product_image(uuid,uuid,text,text,text,boolean) to service_role;
