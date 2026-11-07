ALTER FUNCTION public.iqa_create_customer_order(uuid,text,uuid,jsonb,numeric,jsonb) SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.iqa_create_customer_order(uuid,text,uuid,jsonb,numeric,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.iqa_create_customer_order(uuid,text,uuid,jsonb,numeric,jsonb) TO service_role;
