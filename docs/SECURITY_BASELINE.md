# IQA WATCHES security baseline

## Current enforcement

- RLS is enabled on the public business tables.
- Browser roles have no broad business-table write access.
- `staff_profiles` grants SELECT to authenticated users only, with a policy restricting rows to `user_id = auth.uid()`.
- Anonymous catalogue reads are limited to published, non-sample, verified-sellable products that have at least one active variant with available stock.
- Anonymous product reads are limited by column-level grants. Internal publication flags and stock counts are not selectable by `anon`.
- Anonymous users can read published categories, brands and product-media metadata. Authenticated staff reads require an active staff role.
- Authenticated staff can read full product/variant and inventory records only when their staff role passes the corresponding RLS policy.
- The `private.iqa_is_public_product(uuid)` SECURITY DEFINER predicate is in the non-exposed `private` schema. Anonymous execution is granted only because the catalogue RLS policies call it; the schema is not exposed through the Data API.
- Seventeen other business tables intentionally have RLS enabled with no policies. They remain inaccessible through browser roles until table/role-specific policies are reviewed.
- Both `public.iqa_admin_mutate(text,uuid,jsonb)` and `public.iqa_catalogue_mutation(uuid,text,jsonb)` are executable only by `service_role`. Each checks the actor's active Owner profile before privileged writes.
- The `iqa-admin-mutate` Edge Function is ACTIVE at version 4 with platform JWT verification enabled. It verifies the caller's Supabase Auth identity and allow-lists operations before forwarding them to the database.
- Product images are stored in the intentionally public `product-images` bucket for storefront delivery. Upload, overwrite and delete are restricted to active Owners through Storage RLS.

## Important boundaries

- Do not grant broad table access to make an admin screen work.
- Do not add policies until the data owner, role matrix, allowed columns, and read/write operations are specified.
- Never put a Supabase service-role/secret key, database password, payment secret, courier secret, or OAuth secret in browser code or Git.
- Do not use user-editable Auth metadata for authorization.
- Any view exposed to browser roles must use `security_invoker = true` unless it is deliberately designed and reviewed as a narrowly scoped public projection.
- New tables must explicitly enable RLS. Default privileges do not automatically enable RLS.

## Verification

- Anonymous SELECT tests on products and variants returned no rows (the catalogue is empty) and succeeded without permission errors.
- Anonymous column checks confirmed product name/price are readable, while internal publication flags and variant stock counts are not.
- Anonymous execution of both mutation RPCs is denied; `service_role` execution is allowed.
- The public catalogue predicate is no longer in the exposed `public` schema.
- Security Advisor reports no remaining public SECURITY DEFINER RPC warning for the catalogue predicate.
- Performance Advisor's overlapping-permissive-policy warning was resolved by limiting public category/brand/media policies to `anon` and staff policies to `authenticated`.
- Security Advisor still reports 17 unrelated RLS-enabled tables with no policies (intentionally inaccessible) and leaked-password protection disabled.
- Performance Advisor reports unused indexes while tables are empty; these are informational and should be re-evaluated after real catalogue traffic.

## Negative acceptance tests before launch

1. Anonymous users cannot insert, update or delete catalogue records.
2. Anonymous users cannot read internal stock counts or publication flags.
3. Unpublished, sample, unverified or out-of-stock products are not visible in the public catalogue.
4. Signed-in customers cannot read staff-only inventory or private business records.
5. Inactive staff cannot access staff workspaces or privileged operations.
6. Support staff cannot edit products, inventory, refunds, staff roles or store settings.
7. No browser user can promote their own role or change their active flag.
8. Duplicate requests cannot create duplicate product or inventory effects.
9. Every privileged mutation produces a redacted audit event.
10. No service-role key or provider secret appears in repository files, page source, browser storage or network responses.
11. Backup restore is tested before accepting production orders.

## Scope and status

The Owner identity, Auth login gate, catalogue schema, public catalogue read policies, Owner-only product creation/inventory adjustment/taxonomy/image/publication workflow and public storefront data loader are implemented in the active project. No real product records have been entered. The authenticated Owner workflow has not yet been exercised end-to-end with a live product and image. Customer/order/payment CRUD, storefront checkout and MFA enforcement are not enabled.

The leaked-password protection Advisor warning remains open. Enable it in Supabase Auth settings before production.
