-- NOOR WATCHES: one-time owner bootstrap, callable only by trusted database operators.
-- This does not create an Auth user or expose owner creation to browser clients.
begin;

create or replace function public.bootstrap_first_owner(
  p_user_id uuid,
  p_display_name text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
begin
  if p_user_id is null then
    raise exception 'A valid Auth user ID is required';
  end if;

  if p_display_name is null or length(btrim(p_display_name)) < 2 or length(btrim(p_display_name)) > 100 then
    raise exception 'Display name must be between 2 and 100 characters';
  end if;

  if not exists (select 1 from auth.users u where u.id = p_user_id) then
    raise exception 'The specified Auth user does not exist';
  end if;

  if exists (
    select 1 from public.staff_profiles sp
    where sp.role = 'owner'::public.staff_role and sp.active = true
  ) then
    raise exception 'An active owner already exists; bootstrap is permanently closed';
  end if;

  if exists (select 1 from public.staff_profiles sp where sp.user_id = p_user_id) then
    raise exception 'This user already has a staff profile; use a reviewed operator process';
  end if;

  insert into public.staff_profiles (user_id, display_name, role, active)
  values (p_user_id, btrim(p_display_name), 'owner'::public.staff_role, true);
end;
$$;

-- Never expose this SECURITY DEFINER function to PostgREST/browser roles.
revoke all on function public.bootstrap_first_owner(uuid, text) from public, anon, authenticated;

commit;
