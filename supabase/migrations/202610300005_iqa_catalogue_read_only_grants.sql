-- IQA WATCHES: expose catalogue tables as read-only to browser roles.
-- All catalogue writes must pass through the verified Owner Edge Function/RPC.
REVOKE ALL PRIVILEGES ON TABLE public.categories, public.brands, public.product_media
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.categories, public.brands, public.product_media
  TO anon, authenticated;
