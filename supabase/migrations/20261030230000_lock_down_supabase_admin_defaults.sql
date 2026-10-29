-- Close Supabase-managed creator default grants for future public-schema objects.
-- This complements the postgres-owner defaults migration.
begin;
alter default privileges for role supabase_admin in schema public
  revoke all privileges on tables from public, anon, authenticated;
alter default privileges for role supabase_admin in schema public
  revoke all privileges on sequences from public, anon, authenticated;
alter default privileges for role supabase_admin in schema public
  revoke execute on functions from public, anon, authenticated;
commit;
