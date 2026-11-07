-- Enforce the storefront gallery contract at the database boundary.
-- Locking the parent product serializes concurrent uploads for the same product.
create or replace function public.iqa_enforce_product_media_gallery_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_count integer;
begin
  perform 1
  from public.products
  where id = new.product_id
  for update;

  if not found then
    raise exception 'Product not found.';
  end if;

  select count(*) into v_count
  from public.product_media
  where product_id = new.product_id;

  if v_count >= 8 then
    raise exception 'A product can have at most 8 images. Remove an existing image before adding another.';
  end if;

  return new;
end;
$function$;

revoke all on function public.iqa_enforce_product_media_gallery_limit() from public, anon, authenticated;

drop trigger if exists product_media_gallery_limit on public.product_media;
create trigger product_media_gallery_limit
before insert on public.product_media
for each row
execute function public.iqa_enforce_product_media_gallery_limit();
