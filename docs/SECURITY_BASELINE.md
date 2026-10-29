# NOOR WATCHES security baseline

## Current enforcement
- Public-schema business tables use RLS and remain deny-by-default.
- Browser roles `anon` and `authenticated` receive no business-table CRUD privileges.
- The only browser table grant is `SELECT` on `staff_profiles`; its RLS policy limits rows to `user_id = auth.uid()`.
- Staff helper functions are not executable by browser roles. They are reserved for trusted server-side use.
- The public schema is not writable by browser roles.
- Default privileges for future public-schema tables, sequences and functions created by the migration owner `postgres` are revoked from `PUBLIC`, `anon` and `authenticated`.

## Important boundaries
- Do not grant broad table access to make an admin screen work.
- Do not add policies until the data owner, role matrix, allowed columns, and read/write operations are specified.
- Never put a Supabase service-role/secret key, database password, payment secret, courier secret, or OAuth secret in browser code or Git.
- Keep privileged mutations in authenticated Edge Functions or another trusted server runtime. Verify the user, active staff profile, role, input, state transition, and audit record on the server.
- Do not use user-editable Auth metadata for authorization.
- Views exposed to browser roles must use `security_invoker = true` or remain inaccessible.
- New tables must explicitly enable RLS. Default privileges do not automatically enable RLS.

## Verification SQL
Run after every schema/security migration:

```sql
-- 1. Every public table must have RLS enabled.
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r','p')
order by c.relname;

-- 2. Browser-role table grants (expected: staff_profiles SELECT for authenticated only).
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon','authenticated','PUBLIC')
order by grantee, table_name, privilege_type;

-- 3. Browser-role function execution (expected: no rows for privileged helpers).
select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where specific_schema = 'public'
  and grantee in ('anon','authenticated','PUBLIC')
order by routine_name, grantee;

-- 4. Public-schema CREATE privileges (expected: false for browser roles and PUBLIC).
select
  has_schema_privilege('anon','public','CREATE') as anon_can_create,
  has_schema_privilege('authenticated','public','CREATE') as authenticated_can_create,
  has_schema_privilege('public','public','CREATE') as public_can_create;
```

## Negative acceptance tests before launch
1. Anonymous user cannot select, insert, update or delete business records.
2. Signed-in customer cannot read another customer's profile, orders, tickets or returns.
3. Inactive staff cannot access staff workspaces or privileged operations.
4. Support staff cannot edit products, inventory, refunds, staff roles or store settings.
5. Inventory manager cannot approve refunds or change staff roles.
6. Order manager cannot read payment secrets or change staff permissions.
7. No browser user can promote their own role or change their active flag.
8. Duplicate payment webhooks cannot create duplicate payment/order effects.
9. Forged payment webhook signatures are rejected.
10. Every privileged mutation produces a redacted audit event.
11. No service-role key or provider secret appears in repository files, page source, browser storage or network responses.
12. Backup restore is tested before accepting production orders.

## Scope and status
This baseline hardens database defaults only. It does not enable customer/admin CRUD, configure Auth, create an owner account, deploy Edge Functions, connect the storefront, or make the store production-ready.
