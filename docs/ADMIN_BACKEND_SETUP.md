# NOOR WATCHES admin backend setup

## Current status
- Public storefront remains the GitHub Pages app.
- `/admin/` is a **static preview only**. It has no login form, accepts no password, loads no customer/business records, and does not persist form submissions.
- A Supabase/PostgreSQL starter schema is supplied under `supabase/migrations/`. It has deny-by-default RLS for business tables. This is not yet a production backend and is not automatically connected to the frontend.
- No credentials or provider secrets are included in this repository.

## Proposed architecture
1. Keep GitHub Pages for the public storefront and admin shell.
2. Use Supabase Auth for verified identity and recovery, PostgreSQL for authoritative records, RLS plus narrowly scoped policies for access control.
3. Route privileged mutations through server-side Edge Functions or a trusted API. Validate permissions, state transitions, totals, coupon limits, inventory reservations and webhook signatures on the server.
4. Store payment/courier/email secrets only in server-side provider secrets. Never put a service-role key in browser JavaScript.
5. Enable database backups, log redaction, monitoring, rate limits and recovery drills before accepting real orders.

## Setup checklist
1. Create a separate Supabase project and enable MFA/recovery policy appropriate for staff.
2. Review and apply the migration in a development project first. It intentionally has no broad CRUD policies, so admin screens cannot access records yet.
3. Create the initial owner via Supabase Auth Dashboard (verified email). Then, using the trusted SQL Editor after checking that user's exact Auth UID, insert one active `staff_profiles` row with role `owner`. Never provide a public owner-signup endpoint.
4. Design and review least-privilege policies per table and per role. Keep customer PII, payments, staff management and settings restricted.
5. Implement server-side transactional functions for stock reservation/release, order transitions, coupon redemption and refunds; add idempotency keys and unique provider-event IDs.
6. Configure payment webhooks and verify signatures server-side. Mark payments paid only from verified gateway events/API reads.
7. Add storage buckets with restricted upload policies for product imagery and evidence; validate MIME type, size and image dimensions.
8. Add environment variables to the backend provider's secret manager. Use only public URL and anon key in frontend after RLS is verified; never use service-role credentials client-side.
9. Configure allowed origins, email sender/recovery, rate limits, monitoring, backup retention and restore tests.
10. Run the security acceptance tests before deploying production admin access.

## Role model (initial proposal)
- Owner: all approved store operations, staff and security settings.
- Administrator: day-to-day operations; sensitive staff/security settings remain owner-only.
- Inventory manager: products, variants, inventory and purchase-order receiving.
- Order manager: order fulfilment, shipping and permitted return workflow; no payment secrets or staff administration.
- Support staff: assigned support tickets and minimal customer/order fields needed to respond.
These permissions must be enforced in server policies and APIs, not just the UI.

## Production work still required
Real authentication/session lifecycle, password recovery, MFA policy, authorization policies, privileged server functions, product-image storage, CSV validation, transactional inventory, order lifecycle, gateway integration, invoice/tax configuration, courier integration, coupon enforcement, staff invitation, audit logging, alerting, backups and live browser/security tests.

## Costs
No service has been provisioned here, so there is no verified current bill. Supabase and any payment, email, storage or courier fees depend on provider plan, usage, region and current pricing. Check the selected provider's official pricing page before launch; assume no cost is guaranteed until a plan is selected. GitHub Pages hosting is already the current static storefront host, but it does not supply a private database or secure server runtime.
