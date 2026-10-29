-- IQA WATCHES: restrict staff helper RPC execution to signed-in users.
-- SECURITY DEFINER is needed for these helpers to read staff_profiles under RLS.
begin;
revoke all on function public.current_staff_role() from public, anon;
revoke all on function public.is_active_staff() from public, anon;
revoke all on function public.has_staff_role(public.staff_role[]) from public, anon;
grant execute on function public.current_staff_role() to authenticated;
grant execute on function public.is_active_staff() to authenticated;
grant execute on function public.has_staff_role(public.staff_role[]) to authenticated;
commit;
