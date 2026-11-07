create or replace function public.iqa_cancel_customer_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_customer_id uuid;
  v_order public.orders%rowtype;
  v_item record;
  v_variant public.product_variants%rowtype;
begin
  if v_user_id is null then
    raise exception 'Sign in to cancel an order';
  end if;
  select id into v_customer_id
    from public.customers
   where auth_user_id = v_user_id;
  if v_customer_id is null then
    raise exception 'Customer account could not be verified';
  end if;

  select * into v_order
    from public.orders
   where id = p_order_id and customer_id = v_customer_id
   for update;
  if not found then
    raise exception 'This order was not found in your account';
  end if;
  if v_order.state <> 'pending' then
    raise exception 'Only orders that are still pending can be cancelled online';
  end if;
  if v_order.payment_state <> 'pending'
     or coalesce(v_order.delivery_snapshot->>'payment_method','') <> 'cash_on_delivery' then
    raise exception 'This order cannot be cancelled through the COD cancellation flow';
  end if;

  for v_item in
    select variant_id, sum(quantity)::integer as quantity
      from public.order_items
     where order_id = v_order.id
     group by variant_id
     order by variant_id
  loop
    select * into v_variant
      from public.product_variants
     where id = v_item.variant_id
     for update;
    if not found or v_variant.stock_reserved < v_item.quantity then
      raise exception 'Reserved stock could not be safely released; please contact support';
    end if;
    update public.product_variants
       set stock_reserved = stock_reserved - v_item.quantity
     where id = v_item.variant_id;
  end loop;

  update public.orders
     set state = 'cancelled', updated_at = now()
   where id = v_order.id;

  insert into public.order_status_events(order_id, previous_state, new_state, reason, actor)
  values(v_order.id, v_order.state, 'cancelled', 'Customer cancelled the pending Cash on Delivery order', v_user_id);

  return jsonb_build_object('ok', true, 'order_id', v_order.id, 'order_number', v_order.order_number, 'state', 'cancelled');
end;
$function$;

revoke all on function public.iqa_cancel_customer_order(uuid) from public, anon;
grant execute on function public.iqa_cancel_customer_order(uuid) to authenticated;
