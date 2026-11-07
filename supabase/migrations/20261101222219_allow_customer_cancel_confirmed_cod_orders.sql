
do $$
declare v_def text;
begin
 select pg_get_functiondef('public.iqa_cancel_customer_order(uuid)'::regprocedure) into v_def;
 v_def := replace(v_def,
   'if v_order.state <> ''pending'' then',
   'if v_order.state not in (''pending'',''confirmed'') then');
 v_def := replace(v_def,
   'Only orders that are still pending can be cancelled online',
   'Only confirmed or pending Cash on Delivery orders can be cancelled before processing');
 if position('v_order.state not in (''pending'',''confirmed'')' in v_def)=0 then
   raise exception 'Could not safely update cancellation transition';
 end if;
 execute v_def;
end $$;

