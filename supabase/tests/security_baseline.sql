-- IQA WATCHES Phase 2 database/security baseline.
-- Read-only assertions: this script creates no objects and changes no rows.
do $$
declare
  v_fn oid;
  v_def text;
  v_missing text;
begin
  select string_agg(n.nspname || '.' || c.relname, ', ' order by n.nspname, c.relname)
    into v_missing
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where c.relkind in ('r','p') and n.nspname = 'public' and not c.relrowsecurity;
  if v_missing is not null then raise exception 'FAIL: public tables without RLS: %', v_missing; end if;

  if exists (select 1 from information_schema.role_table_grants
    where table_schema='public' and grantee='anon'
      and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'))
     or exists (select 1 from information_schema.role_column_grants
    where table_schema='public' and grantee='anon'
      and privilege_type in ('INSERT','UPDATE','DELETE')) then
    raise exception 'FAIL: anon has a public-schema write grant';
  end if;

  if exists (select 1 from information_schema.role_table_grants
    where table_schema='public' and grantee='authenticated'
      and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER')
      and not ((table_name='customer_addresses' and privilege_type in ('INSERT','UPDATE','DELETE'))
        or (table_name='customers' and privilege_type in ('INSERT','UPDATE'))
        or (table_name='return_requests' and privilege_type='INSERT'))) then
    raise exception 'FAIL: unexpected authenticated table-level write grant';
  end if;

  if exists (select 1 from information_schema.role_column_grants
    where table_schema='public' and grantee='authenticated'
      and privilege_type in ('INSERT','UPDATE','DELETE')
      and table_name not in ('customer_addresses','customers','return_requests','reviews','support_tickets')) then
    raise exception 'FAIL: unexpected authenticated column-level write grant';
  end if;

  if not exists (select 1 from pg_class where oid='public.checkout_idempotency'::regclass and relrowsecurity) then
    raise exception 'FAIL: checkout_idempotency must have RLS enabled';
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='checkout_idempotency') then
    raise exception 'FAIL: checkout_idempotency should remain policy-less and inaccessible to browser roles';
  end if;
  if has_table_privilege('anon','public.checkout_idempotency','SELECT')
     or has_table_privilege('anon','public.checkout_idempotency','INSERT')
     or has_table_privilege('authenticated','public.checkout_idempotency','SELECT')
     or has_table_privilege('authenticated','public.checkout_idempotency','INSERT') then
    raise exception 'FAIL: browser role can access checkout_idempotency';
  end if;

  v_fn := 'public.iqa_cancel_customer_order(uuid)'::regprocedure;
  if not (select prosecdef from pg_proc where oid=v_fn) then
    raise exception 'FAIL: customer cancellation RPC must retain its reviewed SECURITY DEFINER boundary';
  end if;
  if has_function_privilege('anon',v_fn,'EXECUTE') or has_function_privilege('public',v_fn,'EXECUTE')
     or not has_function_privilege('authenticated',v_fn,'EXECUTE') then
    raise exception 'FAIL: customer cancellation RPC grants changed unexpectedly';
  end if;
  if coalesce((select array_to_string(proconfig,',') from pg_proc where oid=v_fn),'') not like '%search_path=""%' then
    raise exception 'FAIL: customer cancellation RPC must use an empty search_path';
  end if;

  v_def := lower(pg_get_functiondef(v_fn));
  if position('auth.uid()' in v_def)=0
     or position('where id = p_order_id and customer_id = v_customer_id' in v_def)=0
     or position('cash_on_delivery' in v_def)=0
     or position('for update' in v_def)=0
     or position('stock_reserved = stock_reserved - v_item.quantity' in v_def)=0
     or position('order_status_events' in v_def)=0 then
    raise exception 'FAIL: customer cancellation ownership, COD, locking, stock-release or audit guard changed';
  end if;

  if exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef and p.oid<>v_fn
      and (has_function_privilege('anon',p.oid,'EXECUTE')
        or has_function_privilege('authenticated',p.oid,'EXECUTE'))) then
    raise exception 'FAIL: unexpected public SECURITY DEFINER function is executable by browser roles';
  end if;

  if exists (select 1 from pg_roles where rolname in ('anon','authenticated') and (rolsuper or rolbypassrls)) then
    raise exception 'FAIL: browser role has superuser or BYPASSRLS';
  end if;
end
$$;

select 'PASS: Phase 2 RLS, browser grants, checkout isolation, customer cancellation ownership and SECURITY DEFINER ACL checks' as result;
