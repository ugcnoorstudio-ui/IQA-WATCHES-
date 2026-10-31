-- IQA WATCHES: read-only checkout security contract checks.
-- Safe to run against production: this file creates no orders and changes no data.
do $$
declare
  fn oid := 'public.iqa_create_customer_order(uuid,text,uuid,jsonb,numeric,jsonb)'::regprocedure;
begin
  if not (select prosecdef from pg_proc where oid = fn) then
    raise exception 'FAIL: order RPC must remain SECURITY DEFINER for the trusted server-side transaction';
  end if;
  if has_function_privilege('anon', fn, 'EXECUTE')
     or has_function_privilege('authenticated', fn, 'EXECUTE')
     or has_function_privilege('public', fn, 'EXECUTE') then
    raise exception 'FAIL: customer order RPC must not be callable by public, anon, or authenticated';
  end if;
  if not has_function_privilege('service_role', fn, 'EXECUTE') then
    raise exception 'FAIL: trusted Edge Function service role must retain EXECUTE';
  end if;
  if coalesce((select array_to_string(proconfig, ',') from pg_proc where oid = fn), '') not like '%search_path=""%' then
    raise exception 'FAIL: SECURITY DEFINER RPC must use an empty search_path';
  end if;
  if not (select relrowsecurity from pg_class where oid='public.customer_addresses'::regclass) then
    raise exception 'FAIL: customer_addresses RLS must remain enabled';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='customer_addresses'
      and roles @> array['authenticated']::name[]
      and cmd='ALL'
      and qual ilike '%current_customer_id%'
      and with_check ilike '%current_customer_id%'
  ) then
    raise exception 'FAIL: customer address owner policy missing';
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.checkout_idempotency'::regclass
      and contype='u'
      and pg_get_constraintdef(oid) ilike '%customer_user_id, idempotency_key%'
  ) then
    raise exception 'FAIL: checkout idempotency uniqueness constraint missing';
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.product_variants'::regclass
      and contype='c'
      and pg_get_constraintdef(oid) ilike '%stock_reserved%'
      and pg_get_constraintdef(oid) ilike '%stock_on_hand%'
  ) then
    raise exception 'FAIL: stock reservation bounds constraint missing';
  end if;
end $$;
select 'PASS: checkout ACL, hardened search_path, address RLS, idempotency uniqueness and stock bounds' as result;
