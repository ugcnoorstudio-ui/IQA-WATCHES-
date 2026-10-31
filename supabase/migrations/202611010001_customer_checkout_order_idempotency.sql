-- IQA WATCHES customer checkout: idempotency and atomic stock reservation.
create table if not exists public.checkout_idempotency (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(customer_user_id, idempotency_key)
);
alter table public.checkout_idempotency enable row level security;
revoke all on public.checkout_idempotency from anon, authenticated;
grant all on public.checkout_idempotency to service_role;

create or replace function public.iqa_create_customer_order(
  p_user_id uuid, p_idempotency_key text, p_address_id uuid, p_items jsonb,
  p_shipping_total numeric, p_delivery_snapshot jsonb
) returns jsonb language plpgsql security definer
set search_path = public, private, pg_temp as $$
declare
  v_customer_id uuid; v_order_id uuid; v_order_number text; v_item_total numeric := 0;
  v_line record; v_variant public.product_variants%rowtype; v_product public.products%rowtype;
  v_qty integer; v_price numeric; v_line_total numeric; v_existing uuid; v_snapshot jsonb;
begin
  if p_user_id is null or p_idempotency_key is null or length(p_idempotency_key) < 16 or length(p_idempotency_key) > 100 then raise exception 'Invalid checkout identity or idempotency key'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 20 then raise exception 'Cart must contain between 1 and 20 distinct items'; end if;
  if p_shipping_total is null or p_shipping_total < 0 or p_shipping_total > 100000 then raise exception 'Invalid verified shipping total'; end if;
  insert into public.checkout_idempotency(customer_user_id,idempotency_key) values(p_user_id,p_idempotency_key) on conflict(customer_user_id,idempotency_key) do nothing;
  select order_id into v_existing from public.checkout_idempotency where customer_user_id=p_user_id and idempotency_key=p_idempotency_key for update;
  if v_existing is not null then select order_number into v_order_number from public.orders where id=v_existing; return jsonb_build_object('ok',true,'duplicate',true,'order_id',v_existing,'order_number',v_order_number); end if;
  select id into v_customer_id from public.customers where auth_user_id=p_user_id for update;
  if v_customer_id is null then
    insert into public.customers(auth_user_id,email,phone,full_name)
    select id,email,phone,coalesce(raw_user_meta_data->>'full_name','') from auth.users where id=p_user_id returning id into v_customer_id;
  end if;
  if v_customer_id is null then raise exception 'Customer profile could not be created'; end if;
  if not exists(select 1 from public.customer_addresses where id=p_address_id and customer_id=v_customer_id) then raise exception 'Select a saved delivery address belonging to your account'; end if;
  v_order_number := 'IQA-' || to_char(now() at time zone 'Asia/Kolkata','YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  insert into public.orders(order_number,customer_id,state,currency,item_total,discount_total,shipping_total,tax_total,payable_total,payment_state,delivery_snapshot)
  values(v_order_number,v_customer_id,'pending','INR',0,0,p_shipping_total,0,0,'pending',coalesce(p_delivery_snapshot,'{}'::jsonb)) returning id into v_order_id;
  for v_line in select value as item from jsonb_array_elements(p_items) loop
    if not (v_line.item ? 'variant_id') or not (v_line.item ? 'quantity') then raise exception 'Each cart item must include variant_id and quantity'; end if;
    if (v_line.item->>'quantity') !~ '^[0-9]+$' then raise exception 'Invalid item quantity'; end if;
    v_qty := (v_line.item->>'quantity')::integer;
    if v_qty < 1 or v_qty > 10 then raise exception 'Quantity must be between 1 and 10'; end if;
    select * into v_variant from public.product_variants where id=(v_line.item->>'variant_id')::uuid and active=true for update;
    if not found then raise exception 'A selected watch is no longer available'; end if;
    select * into v_product from public.products where id=v_variant.product_id and state='published' and verified_sellable=true and is_sample=false;
    if not found then raise exception 'A selected watch is not approved for sale'; end if;
    if v_variant.stock_on_hand-v_variant.stock_reserved < v_qty then raise exception 'Insufficient stock for SKU %',v_variant.sku; end if;
    v_price := coalesce(v_variant.selling_price,v_product.selling_price);
    if v_price is null or v_price <= 0 then raise exception 'A selected watch has no valid selling price'; end if;
    v_line_total := v_price*v_qty; v_item_total := v_item_total+v_line_total;
    v_snapshot := jsonb_build_object('product_id',v_product.id,'name',v_product.name,'brand',v_product.brand,'category',v_product.category,'sku',v_variant.sku,'options',v_variant.options,'selling_price',v_price);
    insert into public.order_items(order_id,variant_id,sku_snapshot,product_snapshot,quantity,unit_price,line_total) values(v_order_id,v_variant.id,v_variant.sku,v_snapshot,v_qty,v_price,v_line_total);
    update public.product_variants set stock_reserved=stock_reserved+v_qty where id=v_variant.id;
  end loop;
  update public.orders set item_total=v_item_total,payable_total=v_item_total+p_shipping_total,updated_at=now() where id=v_order_id;
  insert into public.order_status_events(order_id,previous_state,new_state,reason,actor) values(v_order_id,null,'pending','Customer submitted an order request',null);
  update public.checkout_idempotency set order_id=v_order_id where customer_user_id=p_user_id and idempotency_key=p_idempotency_key;
  return jsonb_build_object('ok',true,'duplicate',false,'order_id',v_order_id,'order_number',v_order_number,'item_total',v_item_total,'shipping_total',p_shipping_total,'payable_total',v_item_total+p_shipping_total,'payment_state','pending');
end; $$;
revoke all on function public.iqa_create_customer_order(uuid,text,uuid,jsonb,numeric,jsonb) from public, anon, authenticated;
grant execute on function public.iqa_create_customer_order(uuid,text,uuid,jsonb,numeric,jsonb) to service_role;
