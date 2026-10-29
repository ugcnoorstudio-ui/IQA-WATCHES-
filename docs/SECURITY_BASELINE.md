# IQA WATCHES security baseline

## Current enforcement
- RLS is enabled on the public business tables.
- anon and authenticated have no broad business-table write access.
- staff_profiles grants SELECT to authenticated users only, with a policy restricting rows to user_id = auth.uid().
- Published, non-sample, verified-sellable products and active variants have narrow public SELECT policies for storefront catalogue reads.
- Active staff roles have narrow SELECT policies for products, variants and inventory movements.
- Role-check helper functions used by those policies live in the non-exposed private schema. The authenticated role has function execution permission so RLS can evaluate them; the schema is not exposed through the Data API. The old public helper RPC functions are not executable by anon or authenticated.
- Seventeen other business tables intentionally have RLS enabled with no policies yet. They remain inaccessible through browser roles until table/role-specific policies are reviewed.
- The public schema is not writable by browser roles. `public.iqa_admin_mutation(uuid,text,jsonb)` is executable only by `service_role`; it re-checks that the actor UUID belongs to an active Owner profile before any write.
- Default privileges for future public-schema tables, sequences and functions created by the migration owner postgres are revoked from PUBLIC, anon and authenticated.

## Important boundaries
- Do not grant broad table access to make an admin screen work.
- Do not add policies until the data owner, role matrix, allowed columns, and read/write operations are specified.
- Never put a Supabase service-role/secret key, database password, payment secret, courier secret, or OAuth secret in browser code or Git.
- Product creation and stock adjustments are routed through the JWT-verified `iqa-admin-mutate` Edge Function. The function verifies the caller with Supabase Auth, then invokes a service-role-only database function. The database independently verifies the active Owner profile, validates input, serializes inventory changes, prevents stock falling below reservations, uses request idempotency, and writes audit records in the same transaction.
- Do not use user-editable Auth metadata for authorization.
- Views exposed to browser roles must use security_invoker = true or remain inaccessible.
- New tables must explicitly enable RLS. Default privileges do not automatically enable RLS.

## Verification
After each security migration, verify that every public table has RLS enabled; browser roles have only the expected table grants; the public helper RPC functions have no browser EXECUTE grants; anon has no USAGE on private; authenticated has only the USAGE/EXECUTE required for RLS helpers; and anon/authenticated cannot CREATE in public.

## Negative acceptance tests before launch
1. Anonymous user cannot select, insert, update or delete private business records; only the explicitly published catalogue read is public.
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
The Owner identity, Supabase Auth login gate, baseline schema, staff self-profile read, catalogue reads, and owner-only product creation/inventory adjustment workflow are configured. This does not enable customer/order/payment CRUD, storefront checkout, MFA enforcement, or general production operations. Supabase's leaked-password protection advisor is currently warning that the setting is disabled; enable it before production launch.

## Migration-owner limitation
The project database role cannot alter the Supabase-managed supabase_admin role's default privileges (the attempted change was rejected with PostgreSQL permission denied and was not applied). The hardening migration therefore applies to the postgres migration owner used for project migrations. Continue creating application objects through reviewed migrations as postgres; do not create exposed application tables/functions manually under supabase_admin.
