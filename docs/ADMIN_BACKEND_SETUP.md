# IQA WATCHES admin backend setup

## Current implementation status
- Public storefront and admin shell are hosted on GitHub Pages.
- Supabase project IQA WATCHES is active (PostgreSQL 17).
- Supabase Auth is connected to the admin shell. The login page accepts only existing staff accounts; public signup is not provided.
- Initial Owner identity ugcnoorstudio@gmail.com is email-confirmed and has an active owner row in public.staff_profiles. Passwords are not stored in this repository or shared in chat.
- admin/backend-config.js contains only the project URL and public publishable key. No service-role key or provider secret is used in the browser.
- Staff-role helper functions used by RLS policies now live in the non-exposed private schema. Their old public RPC entry points are no longer executable by anon or authenticated.
- RLS is enabled on public business tables. The owner can read their own staff profile; role-gated read policies exist for products, variants and inventory movements. Seventeen business tables intentionally have no browser policies yet and remain inaccessible.
- The admin navigation and forms are still a management-shell preview. Most forms do not persist data; no payment, order, customer, support, shipping or refund mutation is enabled.

## Admin access
- Admin URL: https://ugcnoorstudio-ui.github.io/IQA-WATCHES-/admin/
- Sign in using the existing verified staff email and the password set by the account owner.
- Do not create a public owner-signup route. Staff invitations and role changes must be owner-authorized server operations with audit records.
- If sign-in fails, verify the Supabase Auth user, email confirmation, matching staff_profiles.user_id, active = true, and allowed redirect/origin settings. Never ask for a password in chat.

## Architecture
1. Keep GitHub Pages for the public storefront and static admin shell.
2. Use Supabase Auth for identity and PostgreSQL for authoritative records.
3. Enforce read access with least-privilege RLS policies per table, role and operation.
4. Route privileged writes through authenticated Edge Functions or another trusted server runtime. Validate the user, active staff profile, role, input, state transition, totals, inventory reservations, idempotency and audit record server-side.
5. Keep payment, courier, email and OAuth secrets only in server-side provider secrets. Never put a service-role key in browser JavaScript.
6. Enable backups, log redaction, monitoring, rate limits, recovery drills and MFA before accepting real orders.

## Remaining setup checklist
1. Enable leaked-password protection in Supabase Auth and review password strength/session lifetime.
2. Configure MFA for the Owner and other staff; test recovery and session revocation.
3. Design and review least-privilege policies for each remaining table. Keep customer PII, payments, refunds, staff management and settings restricted.
4. Implement trusted transactional functions for stock reservation/release, order transitions, coupon redemption and refunds; use idempotency keys and unique provider-event IDs.
5. Configure payment webhooks and verify signatures server-side. Mark payments paid only from verified gateway events/API reads.
6. Add storage buckets with restricted upload policies for product imagery and evidence; validate MIME type, size and image dimensions.
7. Configure allowed origins, email sender/recovery, rate limits, monitoring, backup retention and restore tests.
8. Run the security acceptance tests before enabling production admin workflows.

## Role model
- Owner: all approved store operations, staff and security settings.
- Administrator: day-to-day operations; sensitive staff/security settings remain owner-only.
- Inventory manager: products, variants, inventory and purchase-order receiving.
- Order manager: order fulfilment, shipping and permitted return workflow; no payment secrets or staff administration.
- Support staff: assigned support tickets and minimal customer/order fields needed to respond.
These permissions must be enforced in database policies and trusted APIs, not just hidden in the UI.

## Production work still required
Least-privilege policies for remaining tables, privileged Edge Functions, product-image storage, CSV validation, transactional inventory, order lifecycle, gateway integration, invoice/tax configuration, courier integration, coupon enforcement, staff invitation, audit logging, alerting, backups, MFA enforcement and live browser/security tests.

## Costs
The Supabase project already exists. This work did not create a new project or enable a paid add-on. The current plan, usage and possible billing were not checked; verify them in the Supabase dashboard. GitHub Pages remains the static host and does not provide a private application server.
