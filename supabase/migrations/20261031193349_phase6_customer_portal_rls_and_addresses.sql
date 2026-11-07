
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.current_customer_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.id
  from public.customers c
  where c.auth_user_id = (select auth.uid())
  limit 1
$$;
revoke all on function private.current_customer_id() from public, anon;
grant execute on function private.current_customer_id() to authenticated;

create unique index if not exists customers_auth_user_id_uidx
  on public.customers(auth_user_id) where auth_user_id is not null;

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  label text not null default 'Home' check (char_length(label) between 1 and 40),
  recipient_name text not null check (char_length(recipient_name) between 1 and 100),
  phone text not null check (char_length(phone) between 7 and 20),
  address_line1 text not null check (char_length(address_line1) between 3 and 200),
  address_line2 text,
  landmark text,
  city text not null,
  state text not null,
  postal_code text not null check (postal_code ~ '^[0-9]{6}$'),
  country text not null default 'India',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customer_addresses_customer_idx on public.customer_addresses(customer_id);
create unique index if not exists customer_addresses_one_default_idx on public.customer_addresses(customer_id) where is_default;

alter table public.customer_addresses enable row level security;
grant select, insert, update, delete on public.customer_addresses to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='customers' and policyname='customers_self_read') then
    create policy customers_self_read on public.customers for select to authenticated using (auth_user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='customers' and policyname='customers_self_insert') then
    create policy customers_self_insert on public.customers for insert to authenticated with check (auth_user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='customers' and policyname='customers_self_update') then
    create policy customers_self_update on public.customers for update to authenticated using (auth_user_id = (select auth.uid())) with check (auth_user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='customer_addresses' and policyname='customer_addresses_self_all') then
    create policy customer_addresses_self_all on public.customer_addresses for all to authenticated
    using (customer_id = (select private.current_customer_id()))
    with check (customer_id = (select private.current_customer_id()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='orders' and policyname='orders_customer_read') then
    create policy orders_customer_read on public.orders for select to authenticated
    using (customer_id = (select private.current_customer_id()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='order_items' and policyname='order_items_customer_read') then
    create policy order_items_customer_read on public.order_items for select to authenticated
    using (exists (select 1 from public.orders o where o.id=order_items.order_id and o.customer_id=(select private.current_customer_id())));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='order_status_events' and policyname='order_status_events_customer_read') then
    create policy order_status_events_customer_read on public.order_status_events for select to authenticated
    using (exists (select 1 from public.orders o where o.id=order_status_events.order_id and o.customer_id=(select private.current_customer_id())));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='return_requests' and policyname='return_requests_customer_read') then
    create policy return_requests_customer_read on public.return_requests for select to authenticated
    using (exists (select 1 from public.orders o where o.id=return_requests.order_id and o.customer_id=(select private.current_customer_id())));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='return_requests' and policyname='return_requests_customer_insert') then
    create policy return_requests_customer_insert on public.return_requests for insert to authenticated
    with check (
      state='requested' and assigned_to is null and
      exists (select 1 from public.orders o where o.id=return_requests.order_id and o.customer_id=(select private.current_customer_id()))
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='refunds' and policyname='refunds_customer_read') then
    create policy refunds_customer_read on public.refunds for select to authenticated
    using (exists (select 1 from public.orders o where o.id=refunds.order_id and o.customer_id=(select private.current_customer_id())));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='reviews' and policyname='reviews_customer_insert') then
    create policy reviews_customer_insert on public.reviews for insert to authenticated
    with check (
      customer_id=(select private.current_customer_id()) and state='pending' and verified_purchase=false
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='reviews' and policyname='reviews_public_approved_read') then
    create policy reviews_public_approved_read on public.reviews for select to anon, authenticated
    using (state='approved');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='coupons' and policyname='coupons_active_customer_read') then
    create policy coupons_active_customer_read on public.coupons for select to authenticated
    using (active=true and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()));
  end if;
end $$;

grant select on public.customers to authenticated;
grant insert (auth_user_id,email,phone,full_name) on public.customers to authenticated;
grant update (email,phone,full_name) on public.customers to authenticated;
grant select on public.orders, public.order_items, public.order_status_events, public.return_requests, public.refunds to authenticated;
grant insert on public.return_requests to authenticated;
grant select on public.reviews to anon, authenticated;
grant insert (product_id,order_id,customer_id,rating,body,state,verified_purchase) on public.reviews to authenticated;
grant select on public.coupons to authenticated;
