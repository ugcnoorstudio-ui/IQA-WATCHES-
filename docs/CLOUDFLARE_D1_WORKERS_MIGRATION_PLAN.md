# IQA WATCHES — Cloudflare D1 + Workers Backend Migration Plan

**Status:** Planning / audit baseline only. No production data, Supabase resources, or live routes have been changed by this document.

## 1. Target service boundaries

| Responsibility | Target service | Boundary |
|---|---|---|
| Customer and staff identity, Google OAuth, password login, session refresh/revocation | Supabase Auth only | Supabase Auth endpoints and auth session SDK are retained. No business tables, Storage, Realtime, or Edge Functions remain dependencies after cutover. |
| Business data | Cloudflare D1 | Products, variants, inventory, customers, addresses, orders, order items, order events, payment/refund records, coupons, support, returns, suppliers, purchase orders, content, reviews, staff authorization profiles, settings, activity and integration events, idempotency. |
| Business APIs and authorization | Cloudflare Workers | All reads/writes, validation, role checks, order transitions, checkout, webhooks, media metadata registration, audit writes, rate limits. |
| Product images, brand assets, campaign media | Cloudinary | Store secure URLs and public IDs in D1; never store image binaries in D1. |
| Static storefront/admin delivery, DNS, WAF, edge protection | Cloudflare Pages / Cloudflare security products | Keep existing Pages site; Workers API is a separately versioned service/route. |
| Source control and CI/CD | GitHub | Versioned D1 migrations, Worker code, tests, deployment gates. |
| Error and performance monitoring | Sentry | Frontend and Worker errors; scrub credentials, tokens, payment and customer PII. |
| Uptime, logs and alerting | Better Stack | Public health checks, Worker health, D1/API availability and actionable alerts. |

## 2. Existing baseline discovered

- Repository: `ugcnoorstudio-ui/IQA-WATCHES-`; production site: `https://iqa-watches-storefront.pages.dev`.
- Production Supabase project: `nyhyfdququxnorqlnnqq`; staging project: `qcxgsomqxfoueootxzpv`.
- Production migration history currently lists 39 migrations; staging lists 40 (including the eight-image rule migration).
- Production currently lists 11 active Edge Functions. They include admin mutation/health, product-image upload, customer checkout/cancellation, public content, Cloudinary media library, and migration helpers.
- Existing admin browser adapter currently uses Supabase Auth **and** Supabase Data API table reads, count queries and Edge Function invokes. These data-plane calls must be replaced with Worker API calls; merely changing environment variables is not a migration.
- The initial schema and later migrations establish business domains including staff profiles, products, product variants, inventory movements, customers, customer addresses, orders, order items, order status events, payment events, refunds, coupons, support tickets, return requests, suppliers, purchase orders/items, content entries, reviews, activity logs, integration events, store settings, product media and checkout idempotency. Exact production catalog/columns/constraints must be exported from the live database before D1 schema is finalized.
- Production Supabase Storage audit previously found 6 objects / 3.71 MB in `product-images`; the four linked media records already point to Cloudinary. Originals are retained pending final reference and backup verification.
- Supabase production/staging Auth and API data plane previously returned HTTP 402 `exceed_cached_egress_quota`. Auth remains a required dependency under the new architecture, so the Auth endpoint must pass a live smoke test before cutover. Moving the business backend to Cloudflare does not remove this Auth dependency.
- Cloudflare account/D1/Workers direct-management credentials were not available to this workspace at audit time. Do not report D1 provisioning, Worker deployment, or Cloudflare production verification until those operations actually succeed.

## 3. Worker API design

Use one Worker service with explicit versioned routes (or a small set of bounded Workers if deployment size/ownership requires separation):

- `GET /api/v1/health` — dependency status without exposing secrets or internal details.
- `GET /api/v1/catalogue`, `GET /api/v1/products/:slug` — public, published, sellable catalogue only.
- `POST /api/v1/auth/session-check` — verify a Supabase access token and return a minimal identity/session status; never issue a second app password.
- `GET/POST/PATCH /api/v1/admin/*` — staff-only admin reads and mutations; role checked from D1 staff profile on every request.
- `GET/POST /api/v1/customer/*` — customer-owned profile, address, order, cancellation, return and review workflows.
- `POST /api/v1/checkout` — server-side prices, stock reservation, serviceable PIN code, COD/payment policy, coupon validation and idempotency.
- `POST /api/v1/webhooks/:provider` — provider-specific signature verification, replay protection and idempotent event processing.
- `POST /api/v1/media/signature` or a constrained upload proxy — authenticated upload authorization; Cloudinary credentials stay in Worker secrets. Validate MIME, size, product ownership/role, folder, public ID and returned secure URL.
- `GET /api/v1/content` — published public content only; draft/scheduled content is staff-only.

Every non-public route must:
1. Require HTTPS and a valid Supabase Auth access token.
2. Verify JWT signature against the project's published JWKS, plus issuer, audience, expiry and subject. Never trust a decoded-but-unverified token.
3. Load the active staff/customer relationship from D1 using the verified subject. Do not authorize from user-editable Supabase user_metadata.
4. Enforce resource ownership and role/action permissions server-side (not just hidden buttons).
5. Validate input with strict schemas, parameterized SQL, bounded pagination and explicit allowlists.
6. Apply per-route rate limits and idempotency where relevant.
7. Write append-only, redacted audit/integration events for privileged mutations.
8. Return minimal errors; never log bearer tokens, secrets, full payment payloads or unnecessary PII.

Use D1 prepared statements only. Use D1 batch transactions for atomic multi-row workflows. Do not rely on a sequence of independent writes for checkout, inventory reservation, order-state changes, refunds or audit records.

## 4. D1 data model and migration rules

- Preserve existing UUID identifiers as canonical TEXT values to avoid breaking order references, Cloudinary mappings and external records.
- Preserve timestamps as UTC ISO-8601 TEXT; preserve monetary values as integer paise where the source precision permits. Document any legacy decimal conversion and reconcile totals.
- Use SQLite CHECK constraints for enums, nonnegative stock/amounts, valid state values and bounded text. Add foreign keys and indexes based on actual query patterns.
- Store JSON payloads as validated JSON text; never treat untrusted JSON as authorization data.
- Keep payment secrets, Cloudinary API secrets, Supabase JWT verification secrets (if any symmetric fallback is required), webhook signing secrets and Better Stack/Sentry DSNs in Worker secrets or the appropriate protected configuration, never in the repository or browser.
- D1 should contain a staff authorization table keyed by the Supabase Auth subject. Staff role and active state are trusted server-side records. The customer table maps customer records to the Supabase Auth subject.
- Keep append-only order status history, activity logs, payment events and integration events. Prevent ordinary update/delete routes for these records.
- Keep Cloudinary media URLs/public IDs and ownership metadata in D1; no binary image data in D1.
- Generate versioned SQL files under `cloudflare/migrations/`; apply them to a disposable local/test D1 database first, then staging D1, then production D1 only after reviewed backups and a successful dry-run.

## 5. Phased migration and release gates

### Phase A — inventory and backup (read-only)
1. Export exact table definitions, indexes, constraints, triggers, views, functions, policies, enum values and row counts from both Supabase environments.
2. Export data using a repeatable, encrypted, access-controlled process. Include checksums and a manifest; do not put production exports in Git.
3. Inventory every frontend/backend Supabase call, all 11 production Edge Functions, Storage buckets/objects, Auth configuration/providers/redirect URLs, webhooks, scheduled jobs and secrets by name (never values).
4. Record source/target row counts, nullability, relationships, sequence/UUID rules and PII classification.
5. Confirm restore procedure and test restore before proceeding.

**Gate A:** inventory complete, backup verified, restore test passes. No deletion.

### Phase B — D1 schema and Worker implementation
1. Create staging D1 and versioned migrations for the exact production schema.
2. Implement Worker token verification against Supabase Auth JWKS and D1-backed active staff/customer authorization.
3. Implement public catalogue, admin reads/mutations, customer portal, checkout, payment webhook, shipping, coupons, returns, reviews, content, media and audit endpoints.
4. Add explicit role matrix and owner-only actions consistent with existing rules; do not silently widen staff write access.
5. Add rate limits, CORS allowlist, CSRF strategy for cookie-authenticated routes (if used), idempotency, request IDs, redaction and health probes.
6. Keep current Supabase Edge Functions operational during parallel validation; do not route production traffic to incomplete Worker endpoints.

**Gate B:** migrations apply cleanly on test D1; schema and authorization tests pass; no production writes.

### Phase C — data migration and reconciliation
1. Load a consistent source snapshot into staging D1 with deterministic import order and idempotent batches.
2. Reconcile row counts, primary keys, foreign keys/orphans, monetary totals, inventory totals, order states, media references, customer ownership, audit history and checksums.
3. Re-run delta export/import to capture writes since the initial snapshot.
4. Validate Cloudinary references; keep Supabase Storage originals until every referenced asset has a verified Cloudinary copy and the rollback window closes.
5. Run security tests for cross-customer IDOR, inactive staff, wrong roles, stale/expired/forged JWTs, replayed webhooks, duplicate checkout, invalid stock, coupon abuse and illegal order transitions.

**Gate C:** all critical data reconciles exactly (or documented approved exceptions); no missing order/payment/media references; security tests pass.

### Phase D — integration and staging verification
1. Change the admin adapter so Supabase SDK is used only for Auth sign-in, OAuth callback, session refresh and sign-out. All business data uses Worker APIs.
2. Replace customer storefront business-data calls with Worker APIs.
3. Deploy staging Worker + D1; test admin and customer flows with real staging identities.
4. Verify Cloudinary upload, checkout, payment webhook, shipping serviceability, customer cancellation, admin order transitions, content publishing and audit logs.
5. Run unit, integration, browser desktop/mobile, accessibility, security and performance checks. Verify Sentry and Better Stack events.

**Gate D:** all staging tests pass; no Supabase Data API, Storage, Realtime or Edge Function calls remain in application runtime except the explicitly retained Auth endpoints.

### Phase E — controlled production cutover
1. Take a final verified backup and short write freeze/maintenance window.
2. Import final delta and reconcile again.
3. Deploy Worker and D1 production migrations; smoke-test health, auth, public catalogue and admin/customer flows.
4. Switch frontend API origin to Worker; verify production desktop/mobile, checkout and admin actions.
5. Monitor errors, latency, order/payment reconciliation and alerts during the agreed rollback window.
6. Roll back routing to the old backend if any critical gate fails. Do not delete old resources during the rollback window.

**Gate E:** production traffic is stable and every critical flow is verified; rollback window expires with owner approval.

### Phase F — retire Supabase business services (last)
Only after Gate E:
1. Disable old Supabase business API usage in the application and verify network traces show no Data API or Edge Function dependencies.
2. Remove/deploy-retire the 11 business Edge Functions after confirming no scheduled tasks, webhooks or migration jobs still call them.
3. Remove Supabase Storage objects/buckets only after Cloudinary mapping, public URL checks, backups and reference scans pass.
4. Remove business tables, functions, triggers, policies and non-auth schemas only after a final export and dependency check. Preserve Supabase Auth and its required auth schema/configuration.
5. Re-run the full CI, desktop/mobile browser checks, production Auth smoke test and Worker/D1 health checks.
6. Keep encrypted archival exports according to the agreed retention policy.

**Gate F:** Supabase is used only for Auth; no business data or API dependency remains; final verification report is signed off. Never drop the Supabase project itself.

## 6. Required automated tests

- JWT: valid, expired, wrong issuer/audience, bad signature, missing subject, rotated JWKS keys, revoked/inactive staff.
- Authorization: customer A cannot read/update customer B; staff cannot escalate role; inactive staff denied; non-owner cannot execute owner-only actions.
- Commerce: server-calculated totals, stock reservation/release, duplicate idempotency key, invalid PIN, disabled COD, invalid coupon, payment callback signature/replay, refund state consistency.
- Orders: allowed/forbidden state transitions, reason required, atomic order event + audit event.
- Data: foreign-key integrity, uniqueness, numeric bounds, JSON validation, migration repeatability and restore test.
- Media: allowed MIME and size only, Cloudinary secure URL/public ID validation, no Supabase Storage URL dependency.
- Runtime: CORS, rate limits, health, logs redaction, Sentry/Better Stack alerts.
- Browser: admin Google OAuth and email login, logout/session expiry, catalogue, product details, cart/checkout, account/orders, desktop/mobile layout and accessibility.

## 7. Explicit non-goals / safety

- Do not delete or truncate any Supabase production table, Storage object, Edge Function, Auth user or project during planning or parallel migration.
- Do not merge or deploy a release with failing CI, browser checks or production Auth smoke tests.
- Do not create fake payment/courier integrations. Courier provider and credentials must be supplied/configured before courier-specific live behavior can be verified.
- Do not store Supabase service-role keys or Cloudinary secrets in frontend code.
- Do not treat a green static build as proof that checkout, Auth, D1 or Worker runtime works.
- Supabase Auth is still a live dependency. If its quota block persists, the retained login service must be restored and tested before cutover.


## 8. Production data snapshot (read-only audit, 2026-11-08)

Exact row counts were queried from the production database for the following business tables. These are a planning baseline only; repeat the snapshot immediately before migration and reconcile again after import.

| Table | Production rows |
|---|---:|
| staff_profiles | 1 |
| products | 3 |
| product_variants | 3 |
| inventory_movements | 1 |
| customers | 2 |
| customer_addresses | 1 |
| orders | 3 |
| order_items | 3 |
| order_status_events | 3 |
| payment_events | 0 |
| refunds | 0 |
| coupons | 0 |
| support_tickets | 0 |
| return_requests | 0 |
| suppliers | 0 |
| purchase_orders | 0 |
| purchase_order_items | 0 |
| content_entries | 0 |
| reviews | 0 |
| activity_logs | 28 |
| integration_events | 0 |
| store_settings | 2 |
| product_media | 4 |
| checkout_idempotency | 3 |
| private.admin_mutation_requests | 23 |
| Supabase Auth users (identity service; do not migrate out) | 5 |

Staging had zero rows in the listed business tables at the same audit point. Production has five Auth users and one active staff profile according to the earlier role audit; the five Auth identities remain in Supabase Auth and must not be copied into D1 as passwords or treated as business records. D1 should store only the verified Auth subject IDs needed to link customers/staff.

The production business dataset is small, but it is not disposable: preserve the three orders, three order items, three status events, inventory movement, activity history, idempotency records, customer address and all four Cloudinary media metadata records. Also include the private admin mutation idempotency ledger in the D1 model or document a formally approved retention alternative; do not silently omit it.

**Audit limitation:** this count snapshot does not replace a consistent export/backup, full schema/index/trigger/constraint inspection, auth-provider configuration review, or restore test. No rows were changed or deleted by the count queries.


## 9. Authentication verification prerequisite

The Worker must independently verify Supabase access tokens before trusting their subject. Supabase's current guidance distinguishes asymmetric signing keys from the legacy shared-secret (HS256) mode:

- For asymmetric signing, Workers can verify JWTs locally using the project's public JWKS endpoint: `/auth/v1/.well-known/jwks.json`.
- The JWKS endpoint does not return usable public keys for legacy symmetric signing. Supabase recommends validating those tokens through the Auth `/auth/v1/user` endpoint instead.
- Therefore, before implementing production token verification, inspect the project's current signing algorithm and key state. Do not assume that the public JWKS endpoint is populated.
- Prefer a planned asymmetric signing-key migration if the project is still on legacy HS256, but do not rotate/revoke keys during this backend migration without a separate compatibility test, expiry window and rollback plan.
- Regardless of local JWT verification, the login, OAuth callback and session refresh still depend on the Supabase Auth service. A successful Worker/D1 deployment cannot compensate for a blocked Auth endpoint.

References:
- [Supabase JWT verification guidance](https://supabase.com/docs/guides/auth/jwts)
- [Supabase JWT signing keys and rotation](https://supabase.com/docs/guides/auth/signing-keys)
- [Cloudflare D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [Cloudflare D1 Worker binding API](https://developers.cloudflare.com/d1/worker-api/)
