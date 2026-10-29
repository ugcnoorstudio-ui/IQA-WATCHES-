-- Mumbai backend hardening follow-up.
-- All business tables remain deny-by-default; no browser CRUD policies are added.
begin;
revoke all on function public.current_staff_role() from public, anon, authenticated;
revoke all on function public.is_active_staff() from public, anon, authenticated;
revoke all on function public.has_staff_role(public.staff_role[]) from public, anon, authenticated;
create index if not exists inventory_movements_variant_id_idx on public.inventory_movements(variant_id);
create index if not exists inventory_movements_actor_idx on public.inventory_movements(actor);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists order_items_variant_id_idx on public.order_items(variant_id);
create index if not exists order_status_events_order_id_idx on public.order_status_events(order_id);
create index if not exists order_status_events_actor_idx on public.order_status_events(actor);
create index if not exists orders_customer_id_idx on public.orders(customer_id);
create index if not exists payment_events_order_id_idx on public.payment_events(order_id);
create index if not exists product_variants_product_id_idx on public.product_variants(product_id);
create index if not exists purchase_order_items_purchase_order_id_idx on public.purchase_order_items(purchase_order_id);
create index if not exists purchase_order_items_variant_id_idx on public.purchase_order_items(variant_id);
create index if not exists purchase_orders_supplier_id_idx on public.purchase_orders(supplier_id);
create index if not exists refunds_order_id_idx on public.refunds(order_id);
create index if not exists refunds_payment_event_id_idx on public.refunds(payment_event_id);
create index if not exists refunds_requested_by_idx on public.refunds(requested_by);
create index if not exists refunds_approved_by_idx on public.refunds(approved_by);
create index if not exists return_requests_order_id_idx on public.return_requests(order_id);
create index if not exists return_requests_assigned_to_idx on public.return_requests(assigned_to);
create index if not exists reviews_product_id_idx on public.reviews(product_id);
create index if not exists reviews_order_id_idx on public.reviews(order_id);
create index if not exists reviews_customer_id_idx on public.reviews(customer_id);
create index if not exists support_tickets_customer_id_idx on public.support_tickets(customer_id);
create index if not exists support_tickets_assigned_to_idx on public.support_tickets(assigned_to);
create index if not exists content_entries_updated_by_idx on public.content_entries(updated_by);
create index if not exists store_settings_updated_by_idx on public.store_settings(updated_by);
create index if not exists activity_logs_actor_idx on public.activity_logs(actor);
drop policy if exists staff_read_own_profile on public.staff_profiles;
create policy staff_read_own_profile on public.staff_profiles
for select to authenticated using (user_id = (select auth.uid()));
commit;
