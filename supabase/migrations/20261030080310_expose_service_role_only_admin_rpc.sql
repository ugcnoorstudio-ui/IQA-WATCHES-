create or replace function public.iqa_admin_mutate(p_action text,p_actor uuid,p_payload jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select private.iqa_admin_mutate(p_action,p_actor,p_payload) $$;
revoke all on function public.iqa_admin_mutate(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.iqa_admin_mutate(text,uuid,jsonb) to service_role;
