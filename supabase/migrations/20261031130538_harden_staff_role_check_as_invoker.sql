CREATE OR REPLACE FUNCTION public.has_staff_role(allowed public.staff_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_profiles
    WHERE user_id = auth.uid()
      AND active = true
      AND role = ANY(allowed)
  )
$function$;
GRANT EXECUTE ON FUNCTION public.has_staff_role(public.staff_role[]) TO authenticated;
