
do $$ begin
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='support_tickets' and policyname='support_tickets_customer_insert') then
  create policy support_tickets_customer_insert on public.support_tickets for insert to authenticated
  with check (customer_id=(select private.current_customer_id()) and priority='normal' and state='open' and assigned_to is null);
 end if;
end $$;
grant insert (customer_id,subject,body) on public.support_tickets to authenticated;

