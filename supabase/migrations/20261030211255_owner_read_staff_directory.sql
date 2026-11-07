create policy staff_profiles_owner_read on public.staff_profiles for select to authenticated using (public.has_staff_role(array['owner']::public.staff_role[]));
