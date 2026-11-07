
grant select, insert, update, delete on public.customer_addresses to authenticated;
grant select on public.orders, public.order_items, public.order_status_events, public.return_requests, public.refunds to authenticated;
grant insert (order_id,kind,reason,state) on public.return_requests to authenticated;
grant insert (product_id,order_id,customer_id,rating,body,state,verified_purchase) on public.reviews to authenticated;
grant insert (customer_id,subject,body) on public.support_tickets to authenticated;

