-- NOOR WATCHES secure-store starter schema (PostgreSQL / Supabase)
-- Apply only to a new, reviewed backend project. Never commit secrets.
begin;
create extension if not exists pgcrypto;
create type public.staff_role as enum ('owner','administrator','inventory_manager','order_manager','support_staff');
create type public.record_state as enum ('draft','published','archived','scheduled');
create type public.order_state as enum ('pending','confirmed','processing','packed','shipped','delivered','cancelled','payment_failed','return_requested','returned','refund_pending','refunded');
create type public.payment_state as enum ('pending','authorized','paid','failed','partially_refunded','refunded','review_required');
create type public.ticket_state as enum ('open','in_progress','waiting','resolved','closed');
create table public.staff_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '',
 role public.staff_role not null default 'support_staff',
 active boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.products (
 id uuid primary key default gen_random_uuid(), name text not null, sku text not null unique,
 brand text, category text, audience text check (audience is null or audience in ('Men','Women','Unisex','Other')),
 description text not null default '', selling_price numeric(12,2) check(selling_price is null or selling_price>=0),
 mrp numeric(12,2) check(mrp is null or mrp>=0), state public.record_state not null default 'draft',
 is_sample boolean not null default true, verified_sellable boolean not null default false,
 specs jsonb not null default '{}'::jsonb, seo jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index products_state_category_idx on public.products(state,category);
create table public.product_variants (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id),
 sku text not null unique, options jsonb not null default '{}'::jsonb,
 selling_price numeric(12,2) check(selling_price is null or selling_price>=0),
 stock_on_hand integer not null default 0 check(stock_on_hand>=0),
 stock_reserved integer not null default 0 check(stock_reserved>=0 and stock_reserved<=stock_on_hand),
 low_stock_threshold integer not null default 0 check(low_stock_threshold>=0),
 active boolean not null default true, created_at timestamptz not null default now()
);
create table public.inventory_movements (
 id uuid primary key default gen_random_uuid(), variant_id uuid not null references public.product_variants(id),
 movement_type text not null check(movement_type in ('stock_in','stock_out','adjustment','reservation','release','receipt')),
 quantity_delta integer not null check(quantity_delta<>0), reason text not null,
 reference text, actor uuid references auth.users(id), created_at timestamptz not null default now()
);
create table public.customers (
 id uuid primary key default gen_random_uuid(), auth_user_id uuid unique references auth.users(id),
 email text, phone text, full_name text, consent jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create table public.orders (
 id uuid primary key default gen_random_uuid(), order_number text not null unique,
 customer_id uuid references public.customers(id), state public.order_state not null default 'pending',
 currency text not null default 'INR', item_total numeric(12,2) not null default 0 check(item_total>=0),
 discount_total numeric(12,2) not null default 0 check(discount_total>=0),
 shipping_total numeric(12,2) not null default 0 check(shipping_total>=0),
 tax_total numeric(12,2) not null default 0 check(tax_total>=0),
 payable_total numeric(12,2) not null default 0 check(payable_total>=0),
 payment_state public.payment_state not null default 'pending', delivery_snapshot jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index orders_state_created_idx on public.orders(state,created_at desc);
create table public.order_items (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id),
 variant_id uuid references public.product_variants(id), sku_snapshot text not null,
 product_snapshot jsonb not null, quantity integer not null check(quantity>0),
 unit_price numeric(12,2) not null check(unit_price>=0), line_total numeric(12,2) not null check(line_total>=0)
);
create table public.order_status_events (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id),
 previous_state public.order_state, new_state public.order_state not null, reason text not null,
 actor uuid references auth.users(id), created_at timestamptz not null default now()
);
create table public.payment_events (
 id uuid primary key default gen_random_uuid(), order_id uuid references public.orders(id),
 gateway text not null, gateway_reference text, event_id text unique, state public.payment_state not null,
 amount numeric(12,2) not null check(amount>=0), currency text not null default 'INR',
 verified_at timestamptz, safe_payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table public.refunds (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id),
 payment_event_id uuid references public.payment_events(id), amount numeric(12,2) not null check(amount>0),
 reason text not null, state text not null check(state in ('requested','approved','submitted','succeeded','failed','rejected')),
 gateway_reference text, requested_by uuid references auth.users(id), approved_by uuid references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.coupons (
 id uuid primary key default gen_random_uuid(), code text not null unique, kind text not null check(kind in ('percentage','fixed')),
 value numeric(12,2) not null check(value>0), minimum_order numeric(12,2) not null default 0 check(minimum_order>=0),
 starts_at timestamptz, ends_at timestamptz, usage_limit integer check(usage_limit is null or usage_limit>=0),
 per_customer_limit integer check(per_customer_limit is null or per_customer_limit>=0),
 rules jsonb not null default '{}'::jsonb, active boolean not null default false, created_at timestamptz not null default now()
);
create table public.support_tickets (
 id uuid primary key default gen_random_uuid(), customer_id uuid references public.customers(id),
 subject text not null, body text not null, priority text not null default 'normal' check(priority in ('low','normal','high','urgent')),
 state public.ticket_state not null default 'open', assigned_to uuid references auth.users(id),
 internal_notes jsonb not null default '[]'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.return_requests (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id),
 kind text not null check(kind in ('return','refund','warranty')), reason text not null,
 state text not null default 'requested', assigned_to uuid references auth.users(id),
 evidence jsonb not null default '[]'::jsonb, resolution text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.suppliers (
 id uuid primary key default gen_random_uuid(), name text not null, verified_business_details jsonb not null default '{}'::jsonb,
 active boolean not null default false, created_at timestamptz not null default now()
);
create table public.purchase_orders (
 id uuid primary key default gen_random_uuid(), supplier_id uuid not null references public.suppliers(id),
 po_number text not null unique, state text not null default 'draft' check(state in ('draft','ordered','partially_received','received','cancelled')),
 supplier_invoice_ref text, notes text, created_at timestamptz not null default now()
);
create table public.purchase_order_items (
 id uuid primary key default gen_random_uuid(), purchase_order_id uuid not null references public.purchase_orders(id),
 variant_id uuid not null references public.product_variants(id), quantity_ordered integer not null check(quantity_ordered>0),
 quantity_received integer not null default 0 check(quantity_received>=0 and quantity_received<=quantity_ordered),
 unit_cost numeric(12,2) check(unit_cost is null or unit_cost>=0)
);
create table public.content_entries (
 id uuid primary key default gen_random_uuid(), content_type text not null, slug text not null unique,
 title text not null, body jsonb not null default '{}'::jsonb, state public.record_state not null default 'draft',
 publish_at timestamptz, updated_by uuid references auth.users(id), updated_at timestamptz not null default now()
);
create table public.reviews (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id),
 order_id uuid references public.orders(id), customer_id uuid references public.customers(id),
 rating smallint check(rating between 1 and 5), body text not null, verified_purchase boolean not null default false,
 state text not null default 'pending' check(state in ('pending','approved','rejected','reported')),
 created_at timestamptz not null default now()
);
create table public.activity_logs (
 id uuid primary key default gen_random_uuid(), actor uuid references auth.users(id), actor_role public.staff_role,
 action text not null, entity_type text not null, entity_id text, outcome text not null,
 reason text, before_safe jsonb, after_safe jsonb, created_at timestamptz not null default now()
);
create index activity_logs_created_idx on public.activity_logs(created_at desc);
create table public.integration_events (
 id uuid primary key default gen_random_uuid(), integration text not null, event_type text not null,
 external_event_id text unique, outcome text not null, redacted_details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create table public.store_settings (
 key text primary key, value jsonb not null default '{}'::jsonb, updated_by uuid references auth.users(id), updated_at timestamptz not null default now()
);
create or replace function public.current_staff_role() returns public.staff_role
language sql stable security definer set search_path=public,pg_temp
as $$ select role from public.staff_profiles where user_id=auth.uid() and active=true limit 1 $$;
create or replace function public.is_active_staff() returns boolean
language sql stable security definer set search_path=public,pg_temp
as $$ select exists(select 1 from public.staff_profiles where user_id=auth.uid() and active=true) $$;
create or replace function public.has_staff_role(allowed public.staff_role[]) returns boolean
language sql stable security definer set search_path=public,pg_temp
as $$ select exists(select 1 from public.staff_profiles where user_id=auth.uid() and active=true and role=any(allowed)) $$;
-- Deny-by-default: all business tables require a future reviewed policy. Staff profile rows
-- are readable only by the profile owner; role changes must be performed by a trusted server.
do $$ declare t text; begin
 foreach t in array array['products','product_variants','inventory_movements','customers','orders','order_items','order_status_events','payment_events','refunds','coupons','support_tickets','return_requests','suppliers','purchase_orders','purchase_order_items','content_entries','reviews','activity_logs','integration_events','store_settings'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
 end loop;
end $$;
alter table public.staff_profiles enable row level security;
revoke all on public.staff_profiles from anon, authenticated;
grant select on public.staff_profiles to authenticated;
create policy staff_read_own_profile on public.staff_profiles for select to authenticated using (user_id=auth.uid());
grant execute on function public.current_staff_role() to authenticated;
grant execute on function public.is_active_staff() to authenticated;
grant execute on function public.has_staff_role(public.staff_role[]) to authenticated;
commit;
-- No broad staff CRUD policies are included intentionally. Add narrowly scoped role/permission
-- policies and server-side transactional RPCs after threat-model review. Never expose service-role keys.
