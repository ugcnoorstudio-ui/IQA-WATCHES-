-- Restore the narrowly scoped staff self-profile read required by the admin auth adapter.
-- The existing RLS policy restricts this SELECT to user_id = auth.uid().
begin;
grant select on public.staff_profiles to authenticated;
commit;
