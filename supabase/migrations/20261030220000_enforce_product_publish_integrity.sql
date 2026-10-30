-- Enforce verified sellability at the database boundary, not only in the admin UI/RPC.
-- Existing invalid published records are demoted to drafts and recorded in the audit log.

create or replace function private.enforce_product_publish_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.state::text = 'published' or new.verified_sellable = true then
    if new.category_id is null or not exists (
      select 1 from public.categories c
      where c.id = new.category_id and c.state::text = 'published'
    ) then
      raise exception 'A published category is required before a product can be sellable.'
        using errcode = '23514';
    end if;

    if new.brand_id is null or not exists (
      select 1 from public.brands b
      where b.id = new.brand_id and b.state::text = 'published'
    ) then
      raise exception 'A published brand is required before a product can be sellable.'
        using errcode = '23514';
    end if;

    if not exists (
      select 1 from public.product_media pm
      where pm.product_id = new.id and pm.is_primary = true
    ) then
      raise exception 'A primary product image is required before a product can be sellable.'
        using errcode = '23514';
    end if;

    if not exists (
      select 1 from public.product_variants v
      where v.product_id = new.id
        and v.active = true
        and coalesce(v.selling_price, new.selling_price, 0) > 0
        and v.stock_on_hand > v.stock_reserved
        and (new.mrp is null or new.mrp >= coalesce(v.selling_price, new.selling_price, 0))
    ) then
      raise exception 'An active priced variant with available stock and valid MRP is required.'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_product_publish_integrity() from public, anon, authenticated;

-- Record and correct any existing product that was marked sellable without meeting all requirements.
with invalid_products as (
  select p.id, p.state::text as old_state, p.verified_sellable as old_verified
  from public.products p
  where (p.state::text = 'published' or p.verified_sellable = true)
    and (
      p.category_id is null
      or not exists (select 1 from public.categories c where c.id=p.category_id and c.state::text='published')
      or p.brand_id is null
      or not exists (select 1 from public.brands b where b.id=p.brand_id and b.state::text='published')
      or not exists (select 1 from public.product_media pm where pm.product_id=p.id and pm.is_primary=true)
      or not exists (
        select 1 from public.product_variants v
        where v.product_id=p.id and v.active=true
          and coalesce(v.selling_price,p.selling_price,0)>0
          and v.stock_on_hand>v.stock_reserved
          and (p.mrp is null or p.mrp>=coalesce(v.selling_price,p.selling_price,0))
      )
    )
), corrected as (
  update public.products p
  set state='draft', verified_sellable=false, updated_at=now()
  from invalid_products i
  where p.id=i.id
  returning p.id, i.old_state, i.old_verified
)
insert into public.activity_logs(actor, actor_role, action, entity_type, entity_id, outcome, reason, before_safe, after_safe)
select null, null, 'product.publish_integrity_reconciled', 'product', id::text, 'success',
       'Automatically demoted because required publication evidence was missing.',
       jsonb_build_object('state',old_state,'verified_sellable',old_verified),
       jsonb_build_object('state','draft','verified_sellable',false)
from corrected;

drop trigger if exists products_publish_integrity_guard on public.products;
create trigger products_publish_integrity_guard
before insert or update of state, verified_sellable, category_id, brand_id, selling_price, mrp
on public.products
for each row execute function private.enforce_product_publish_integrity();
