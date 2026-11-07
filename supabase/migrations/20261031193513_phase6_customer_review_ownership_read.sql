
do $$ begin
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='reviews' and policyname='reviews_customer_read') then
  create policy reviews_customer_read on public.reviews for select to authenticated
  using (customer_id=(select private.current_customer_id()));
 end if;
end $$;
