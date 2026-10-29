-- NOOR WATCHES: fail-closed defaults for future public-schema objects.
-- Existing storefront/admin behavior is unchanged; browser CRUD remains disabled.
begin;

-- The public schema remains readable where required by PostgREST, but browser roles
-- cannot create objects in it.
revoke create on schema public from public, anon, authenticated;

-- Reassert the current deny-by-default boundary across every existing public object.
revoke all privileges on all tables in schema public from public, anon, authenticated;
revoke all privileges on all sequences in schema public from public, anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

-- Future objects created by the migration owner (postgres) inherit the same safe defaults.
alter default privileges for role postgres in schema public
  revoke all privileges on tables from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all privileges on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

commit;
