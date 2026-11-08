# IQA WATCHES — Clerk-first authentication migration (Staging)

## Status
Planning and compatibility audit only. This document does not authorize or perform a production change. The implementation target is the Supabase project `qcxgsomqxfoueootxzpv` (IQA WATCHES STAGING). Production project `nyhyfdququxnorqlnnqq` must remain untouched until staging acceptance tests pass.

## Product decision
- Clerk is the primary identity provider for sign-up, sign-in, sessions, account recovery, and user identity.
- Supabase remains the Postgres database, Storage only where already required, and RLS enforcement point. Avoid using Supabase Auth as the application's login/session provider.
- Cloudflare remains the API/edge boundary: verify Clerk JWTs, apply rate limits and request validation, and perform privileged server-side orchestration where appropriate.
- Cloudinary remains the product-media delivery/optimization service. Reduce unnecessary uploads, transformations, and duplicate media processing; do not move image traffic through Supabase.
- Better Stack remains operational monitoring; Sentry remains application error tracking. Preserve their current integrations.

## Verified staging facts
- Staging project: `qcxgsomqxfoueootxzpv`, region `ap-south-1`, status ACTIVE_HEALTHY.
- Production project: `nyhyfdququxnorqlnnqq` (read-only boundary for this migration).
- Staging `public.staff_profiles.user_id` is currently UUID, primary key, and FK to `auth.users(id)`; table currently reports 0 rows.
- Staging `public.customers.auth_user_id` is UUID, unique, and FK to `auth.users(id)`; table currently reports 0 rows.
- Several audit/actor columns and private mutation request records reference `auth.users`. Do not blindly cast Clerk IDs into UUID columns.
- Existing RLS predicates and helper routines use `auth.uid()`; Clerk's `sub` claim is a string such as `user_...`, so these predicates must be deliberately migrated to compare the verified JWT subject as text (for example `(select auth.jwt()->>'sub')`) or resolve through a reviewed identity mapping.
- Existing admin browser adapter uses `supabase.auth.signInWithPassword`, `auth.getSession`, `auth.getUser`, and `staff_profiles.user_id = user.id`; this is still Supabase Auth and must be replaced before enabling Clerk login.
- Existing privileged Edge Function path uses Supabase Auth identity assumptions. Verify each function's JWT verification and actor resolution before switching tokens.
- Staging Security Advisor currently reports RLS disabled on `private.admin_mutation_requests`. Do not auto-enable it without first defining the intended server-only access policy; the Advisor's suggested ALTER TABLE alone could break intended server-side operations.

## Required target design
1. Configure Clerk's native Supabase third-party authentication integration for the staging Clerk application and staging Supabase project. Use the current Clerk/Supabase native integration; do not create the deprecated Clerk Supabase JWT template and do not share the Supabase JWT secret with Clerk.
2. Configure Supabase's third-party auth provider for the exact Clerk issuer/domain and verify JWT acceptance before application code is switched.
3. Use the Clerk session token as the Supabase client's access token. The browser client must use only the Supabase publishable key. Never ship service-role/secret keys.
4. Use a stable external identity mapping. Preferred pattern: keep internal UUID primary keys for relational integrity and add a unique text `clerk_user_id` to staff/customer identity records. RLS checks the signed JWT subject against that text mapping or a tightly scoped helper. Avoid changing all relational PKs to text.
5. Rework actor/audit attribution to resolve Clerk subject to an internal UUID actor record server-side. Never trust a client-supplied role, actor UUID, or user metadata for authorization.
6. Update Cloudflare API authentication to verify Clerk JWT signatures/issuer/audience using Clerk's published JWKS and validate expiry. Forward the verified identity/claims only; privileged operations still need server-side role checks and audit logging.
7. Review Supabase Edge Functions individually. Supabase gateway JWT verification must accept the configured third-party Clerk token; function code must not call Supabase Auth `getUser()` as if Clerk were a Supabase Auth user. Resolve the Clerk subject against the identity mapping and verify active staff status before any privileged operation.
8. Keep business data and sensitive operations behind RLS and narrow server-side functions. Do not broaden grants to make the new client work.

## Staging migration sequence
1. Finish the schema inventory for every FK to `auth.users`, every `auth.uid()` policy/function, every Edge Function, and every Cloudflare route.
2. Confirm the intended Clerk application, Clerk domain, allowed redirect URLs, and whether the user will use the same Clerk tenant for staging and production or separate instances.
3. Configure Clerk native Supabase integration and Supabase third-party provider in staging dashboard.
4. Add nullable `clerk_user_id text` identity mapping columns/tables and indexes; retain internal UUID keys. Apply RLS/function changes in a versioned migration only after exact dependencies are inventoried.
5. Replace admin login/session handling with ClerkJS; pass `await clerk.session.getToken()` to the Supabase client `accessToken` callback.
6. Update Cloudflare Worker and Edge Function token verification and actor mapping.
7. Test: anonymous denied; signed-in customer can only read own records; inactive staff denied; active Owner can perform only allowed operations; support staff cannot perform Owner actions; tampered role metadata denied; expired/wrong-issuer token denied; duplicate requests remain idempotent; service-role secrets absent from browser assets.
8. Verify Better Stack and Sentry continue receiving operational events; verify Cloudinary image delivery remains direct and optimized.
9. Only after all tests pass, prepare a separate reviewed production migration and rollback plan.

## Explicit non-goals
- Do not delete or disable the Supabase Auth project while existing internal references remain.
- Do not alter Production during Staging work.
- Do not enable broad RLS policies or grant broad table access.
- Do not replace Cloudflare with another runtime or route Cloudinary media through Supabase.
- Moving application authentication to Clerk does not change Codex product/usage limits; it removes the application's runtime dependency on Supabase Auth.

## User-provided Clerk frontend domain
The user previously supplied the Clerk development frontend domain `mint-werewolf-5797.clerk.accounts.dev`. Treat it as a development/staging value only until confirmed in the Clerk Dashboard. Never commit private keys or secrets.
