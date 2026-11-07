alter type public.order_state add value if not exists 'ready_for_pickup' after 'packed';
