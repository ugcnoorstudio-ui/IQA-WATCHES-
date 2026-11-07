
do $$
declare v_def text;
begin
 select pg_get_functiondef('public.iqa_admin_update_order_status(uuid,uuid,public.order_state,text)'::regprocedure) into v_def;
 v_def:=replace(v_def,
   'p_new_state not in (''confirmed'',''processing'',''packed'',''shipped'',''delivered'',''cancelled'')',
   'p_new_state not in (''confirmed'',''processing'',''packed'',''ready_for_pickup'',''shipped'',''delivered'',''cancelled'')');
 v_def:=replace(v_def,
   '(v_order.state=''packed'' and p_new_state in (''shipped'',''cancelled'')) or',
   '(v_order.state=''packed'' and p_new_state in (''ready_for_pickup'',''shipped'',''cancelled'')) or' || chr(10) || '    (v_order.state=''ready_for_pickup'' and p_new_state=''delivered'') or');
 if position('ready_for_pickup' in v_def)=0 then raise exception 'Could not add pickup status transition'; end if;
 execute v_def;
end $$;

