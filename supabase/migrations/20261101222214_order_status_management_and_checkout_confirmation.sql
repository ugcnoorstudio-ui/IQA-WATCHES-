
do $$
declare
  v_def text;
begin
  select pg_get_functiondef('public.iqa_create_customer_order(uuid,text,uuid,jsonb,numeric,jsonb)'::regprocedure) into v_def;
  v_def := replace(v_def,
    'values(v_order_number,v_customer_id,''pending'',''INR''',
    'values(v_order_number,v_customer_id,''confirmed'',''INR''');
  v_def := replace(v_def,
    'values(v_order_id,null,''pending'',''Customer submitted an order request'',null)',
    'values(v_order_id,null,''confirmed'',''Cash on Delivery order confirmed at successful checkout'',null)');
  if position('v_customer_id,''confirmed'',''INR''' in v_def)=0 then
    raise exception 'Could not safely update checkout default state';
  end if;
  execute v_def;
end $$;

create or replace function public.iqa_admin_update_order_status(
  p_actor uuid,
  p_order_id uuid,
  p_new_state public.order_state,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_staff public.staff_profiles%rowtype;
  v_order public.orders%rowtype;
  v_reason text := nullif(btrim(p_reason), '');
begin
  if p_actor is null or p_order_id is null or v_reason is null or length(v_reason) < 5 or length(v_reason) > 500 then
    raise exception 'A valid order, staff actor and reason (5–500 characters) are required';
  end if;

  select * into v_staff from public.staff_profiles where user_id=p_actor and active=true;
  if not found or v_staff.role <> 'owner' then
    raise exception 'Active IQA WATCHES owner role required';
  end if;

  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;

  if p_new_state not in ('confirmed','processing','packed','shipped','delivered','cancelled') then
    raise exception 'This order status is not available in the admin workflow';
  end if;
  if v_order.state = p_new_state then
    raise exception 'Order already has this status';
  end if;

  if not (
    (v_order.state='confirmed' and p_new_state in ('processing','packed','cancelled')) or
    (v_order.state='processing' and p_new_state in ('packed','shipped','cancelled')) or
    (v_order.state='packed' and p_new_state in ('shipped','cancelled')) or
    (v_order.state='shipped' and p_new_state='delivered')
  ) then
    raise exception 'This status transition is not allowed from the current order state';
  end if;

  update public.orders set state=p_new_state, updated_at=now() where id=p_order_id;
  insert into public.order_status_events(order_id,previous_state,new_state,reason,actor)
  values(p_order_id,v_order.state,p_new_state,v_reason,p_actor);
  insert into public.activity_logs(actor,actor_role,action,entity_type,entity_id,outcome,reason,before_safe,after_safe)
  values(p_actor,'owner','update_order_status','order',p_order_id::text,'success',v_reason,
    jsonb_build_object('state',v_order.state),
    jsonb_build_object('state',p_new_state));

  return jsonb_build_object('ok',true,'order_id',p_order_id,'order_number',v_order.order_number,'state',p_new_state);
end;
$function$;

revoke all on function public.iqa_admin_update_order_status(uuid,uuid,public.order_state,text) from public, anon, authenticated;
grant execute on function public.iqa_admin_update_order_status(uuid,uuid,public.order_state,text) to service_role;
