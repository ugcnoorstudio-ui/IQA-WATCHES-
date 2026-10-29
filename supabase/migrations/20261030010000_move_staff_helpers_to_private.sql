-- Move authorization helpers out of the exposed public API schema.
CREATE SCHEMA IF NOT EXISTS private AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.current_staff_role()
RETURNS public.staff_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT role FROM public.staff_profiles
  WHERE user_id = auth.uid() AND active = true LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION private.has_staff_role(allowed public.staff_role[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_profiles
    WHERE user_id = auth.uid() AND active = true AND role = ANY(allowed)
  )
$function$;

CREATE OR REPLACE FUNCTION private.is_active_staff()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_profiles
    WHERE user_id = auth.uid() AND active = true
  )
$function$;

REVOKE ALL ON FUNCTION private.current_staff_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.has_staff_role(public.staff_role[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_active_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.current_staff_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_staff_role(public.staff_role[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_active_staff() TO authenticated, service_role;

ALTER POLICY inventory_team_read_movements ON public.inventory_movements
USING (private.has_staff_role(ARRAY['owner','administrator','inventory_manager']::public.staff_role[]));
ALTER POLICY staff_read_variants ON public.product_variants
USING (private.has_staff_role(ARRAY['owner','administrator','inventory_manager','order_manager']::public.staff_role[]));
ALTER POLICY staff_read_products ON public.products
USING (private.has_staff_role(ARRAY['owner','administrator','inventory_manager','order_manager','support_staff']::public.staff_role[]));

REVOKE ALL ON FUNCTION public.current_staff_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_staff_role(public.staff_role[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_active_staff() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_staff_role() TO service_role;
GRANT EXECUTE ON FUNCTION public.has_staff_role(public.staff_role[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_active_staff() TO service_role;
