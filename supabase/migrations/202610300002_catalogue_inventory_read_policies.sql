-- IQA WATCHES: first least-privilege read policies for catalogue and inventory.
-- Public storefront sees only explicitly verified, non-sample published products.
-- Authenticated staff see only the operational data their role requires.
begin;

grant select on public.products to anon, authenticated;
grant select on public.product_variants to anon, authenticated;
grant select on public.inventory_movements to authenticated;

create policy public_read_verified_products
on public.products for select to anon, authenticated
using (state = 'published' and is_sample = false and verified_sellable = true);

create policy staff_read_products
on public.products for select to authenticated
using (public.has_staff_role(array['owner','administrator','inventory_manager','order_manager','support_staff']::public.staff_role[]));

create policy public_read_available_variants
on public.product_variants for select to anon, authenticated
using (
  active = true and exists (
    select 1 from public.products p
    where p.id = product_variants.product_id
      and p.state = 'published'
      and p.is_sample = false
      and p.verified_sellable = true
  )
);

create policy staff_read_variants
on public.product_variants for select to authenticated
using (public.has_staff_role(array['owner','administrator','inventory_manager','order_manager']::public.staff_role[]));

create policy inventory_team_read_movements
on public.inventory_movements for select to authenticated
using (public.has_staff_role(array['owner','administrator','inventory_manager']::public.staff_role[]));

commit;
