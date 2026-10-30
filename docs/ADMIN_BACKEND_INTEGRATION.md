# IQA WATCHES — secure admin backend integration

## Current verified project state

- Repository: `ugcnoorstudio-ui/IQA-WATCHES-`; working branch: `feat/secure-admin-backend-integration`.
- Supabase project: `ufidhdcwelaqtqrgeszy` (Free plan; keep the existing region and project).
- The owner Auth user and matching active `owner` staff profile have been provisioned and verified.
- Auth Site URL and Redirect URL are configured for the GitHub Pages origin.
- Store schema and security migrations have already been applied. Do not reapply them blindly.
- The static storefront is hosted on GitHub Pages. It cannot hold server secrets or execute private server-side code.

## Existing backend capabilities

- `admin/backend.js`: Supabase JS v2 session/profile adapter, verifies identity through Auth `getUser()`, reads the caller's own active staff profile, and provides read-only Products and Inventory loaders.
- `admin/admin-auth.js`: login gate, session recheck on focus/visibility, and sign-out lock.
- `admin/admin.js`: renders read-only product and inventory data with safe empty/error states.
- Supabase Edge Function `iqa-admin-mutate` is ACTIVE with JWT verification enabled. It checks the bearer token against Auth, verifies the actor in the database, and routes allow-listed operations to owner-restricted mutation RPCs.
- `iqa_admin_mutation` supports owner-approved product creation and inventory adjustment with validation, audit records, and idempotency.
- `iqa_catalogue_mutation` supports owner-restricted category/brand creation, taxonomy assignment, product image metadata registration, and publishing checks.
- Database function privileges were inspected: mutation RPC execution is not granted to `anon` or ordinary `authenticated` users; the Edge Function uses its server-side privileged key to call the RPC after verifying the user.
- Product and inventory tables currently contain zero live rows. Do not invent sample products as real stock.

## Current blockers — do not claim production readiness

1. `admin/backend-config.js` still contains `YOUR_SUPABASE_PUBLISHABLE_KEY`; the admin login therefore deliberately fails closed.
2. The admin HTML still contains four visible legacy NOOR WATCHES references. A prior repository write attempt was blocked by a safety check; do not work around that block through another channel.
3. The admin UI currently has read-only Products and Inventory loaders. The mutation Edge Function exists, but a complete tested UI for create/edit/delete, inventory workflows, and other business modules is not finished.
4. Orders, customers, payments, refunds, returns, suppliers, shipping, coupons, support, reports, staff management, and related workflows are not production-complete.
5. The open Draft PR #7 has not been merged. Its changes are not considered live until the owner reviews and explicitly approves deployment.

## Security posture and decisions

- RLS is enabled across the business schema. Several tables intentionally have no policies yet, which means access is denied by default. Do not add broad authenticated policies merely to make the dashboard display data.
- The existing overlapping Products/Variants SELECT policies need a careful review; do not remove or combine policies without verifying the intended public-catalogue and staff access semantics.
- Staff helper functions use SECURITY DEFINER with a fixed search_path and caller-scoped identity checks. Anonymous EXECUTE is revoked. Preserve these restrictions.
- The mutation Edge Function has `verify_jwt = true`, checks the exact allowed origin, verifies the token with Supabase Auth, and does not expose service credentials to the browser.
- Never put `service_role`, Supabase secret keys, payment secrets, or shipping credentials in GitHub Pages JavaScript or chat.
- The Security Advisor reports leaked-password protection disabled. Check whether this setting is available on the current Free plan before asking the owner to upgrade; do not recommend a paid upgrade under the zero-budget constraint.
- Test negative cases before enabling writes: logged-out user, expired session, inactive staff, non-owner mutation, role self-escalation, anonymous private-table reads, and cross-customer access.

## Zero-budget implementation policy

- Keep the project on its existing Supabase Free plan and use GitHub Pages / existing connected services.
- Do not enable paid add-ons, paid hosting, paid domains, paid plugins, or paid third-party APIs without explicit owner approval.
- Prefer free-tier capabilities and local/manual owner-controlled processes where a secure free automation is unavailable.
- Be explicit about free-tier quotas and operational limitations. Do not silently create a paid resource or trigger a billable action.

## Safe next steps

1. Finish a read-only audit of existing code, schema, RLS, Edge Functions, and deployment configuration.
2. Complete branding changes only through approved repository writes; do not bypass blocked writes.
3. Finish and test the admin authentication path after the owner configures the browser-safe publishable key in the repository using an approved workflow. The publishable key is intended for browser use, but only with correct RLS; never use a secret key.
4. Implement one business module at a time, starting with Products and Inventory, with server-side authorization, validation, audit logging, and idempotency.
5. Add other modules only after their table-specific RLS and server-side workflows are reviewed.
6. Run automated and manual tests, review PR #7, and obtain explicit owner approval before merging or deploying.

## Owner setup references

- Supabase Auth users: https://supabase.com/dashboard/project/ufidhdcwelaqtqrgeszy/auth/users
- Supabase API keys: https://supabase.com/dashboard/project/ufidhdcwelaqtqrgeszy/settings/api
- GitHub Pages preview: https://ugcnoorstudio-ui.github.io/IQA-WATCHES-/
- Admin preview: https://ugcnoorstudio-ui.github.io/IQA-WATCHES-/admin/
- Draft PR #7: https://github.com/ugcnoorstudio-ui/IQA-WATCHES-/pull/7

The owner account is already provisioned. Do not repeat owner creation or reapply existing migrations. Keep the browser key placeholder until an approved, safe repository update is available; do not bypass repository safety checks.
