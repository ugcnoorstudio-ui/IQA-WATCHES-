# IQA WATCHES — Six-Phase E-commerce Execution Roadmap

Last reviewed: 2026-11-08
Source of truth: GitHub `main`, staging Supabase project, and the current storefront deployment.

## Operating guardrails

- Supabase is authoritative for products, prices, stock, orders, customer data, and permissions.
- Never trust browser-supplied price, stock, totals, payment status, or order status.
- Use transaction-safe inventory reservation and idempotency for checkout.
- Keep service-role credentials server-side; browser clients use publishable keys and RLS.
- Keep staging and production separate. Use temporary fixtures inside rollback-only tests.
- Do not delete legacy Storage objects without an audit and explicit approval.
- No new paid service without explicit approval.
- No custom domain, payment gateway, shipping/courier integration, or shipment tracking in this execution.
- Every code change must pass CI and browser tests before merge/deploy.
- Pull-request Cloudflare previews replace backend configuration with an invalid preview endpoint and must never connect to production Supabase.

## Phase 1 — Checkout, order integrity, and inventory reservation

**Status: Implemented and staging-verified.**

- Hardened the database checkout RPC against SQL NULL, non-array, empty, non-object, and duplicate-variant cart payloads.
- Kept the order-creation RPC service-role-only with an empty search_path.
- Added regression tests and merged PR #148: https://github.com/ugcnoorstudio-ui/IQA-WATCHES-/pull/148
- Applied migration `20261108081229_harden_checkout_rpc_payload` to staging only.
- Ran rollback-only staging fixtures covering valid order creation, exact stock reservation, idempotent replay, duplicate cart rejection, and insufficient-stock rejection.
- Confirmed temporary customer/product/order fixtures were fully rolled back.

**Production caution:** production migration history currently ends at `20261105075427`; staging has three later migrations: `20261107193017` (eight-image cap), `20261108060625` (checkout idempotency index), and `20261108081229` (checkout payload hardening). Production checkout RPC still has the pre-hardening validation. The hardening migration has been applied and fully tested in staging only. All three migration files missing from the main branch are now restored in PR #153 using the recorded staging versions: `20261107193017` (eight-image cap), `20261108060625` (checkout idempotency order index), and `20261108081229` (checkout payload hardening). The checkout migration filename matches staging exactly, preventing duplicate application. No production migration has been run; production is still three migrations behind staging and catch-up requires separate review and explicit release approval.

**Remaining before real checkout:** configure verified COD and delivery rules, confirm the customer sign-in/address flow, and run a controlled end-to-end test. Shipping/courier integrations remain deferred.

## Phase 2 — Authentication, authorization, RLS, and customer privacy

**Status: Baseline audit completed; targeted remediation remains.**

- All 26 public tables have RLS enabled in both staging and production (26/26 verified in each).
- Customer addresses are scoped through the authenticated customer's own profile.
- Admin mutation Edge Function verifies the user session and active owner role before privileged RPC calls.
- Checkout order-creation RPC is not executable by anon or authenticated roles.
- `checkout_idempotency` intentionally has no user-facing RLS policy; it remains private to privileged database operations.
- Supabase advisor still reports an authenticated SECURITY DEFINER customer-cancellation RPC. Its current implementation checks order ownership and COD eligibility, but this warning must remain on the review list until regression coverage and least-privilege review are complete.
- Multiple permissive SELECT policies are performance warnings, not grounds for blind policy deletion.

**Staging tests passed:** customer A/B profile and address isolation; customer B cannot cancel customer A's order; the owning customer can cancel pending COD and release reserved stock; support staff cannot update order state; owner can perform permitted transitions and invalid state jumps are rejected. All fixtures were rolled back.

**Next work:** test session expiry and data export/deletion request handling. Production advisor still flags leaked-password protection as disabled; enable it only after confirming the Auth policy with the owner. Do not loosen RLS to make the UI work.

## Phase 3 — Catalogue, product data, inventory, and media

**Status: Backend foundation exists; operational data and full workflows remain.**

- Product/category/brand/variant/media tables and owner/admin mutation RPCs exist.
- Product publication integrity checks require a published category and brand, a primary product image, and an active priced variant with available stock.
- Cloudinary product media integration is present; the product image count is capped at eight.
- Public catalogue policies expose only approved published/sellable products and available active variants.
- The staging database currently has no live catalogue records.
- The staging eight-image limit was exercised with eight temporary media rows; the ninth insert was rejected and the product/media fixtures were fully rolled back (remaining fixture rows: zero).

**Additional production finding:** the live storefront currently reads `data/catalogue.json`, not Supabase directly. The snapshot is dated 2026-11-07. Production currently has 3 approved products, 3 available variants, and 4 Cloudinary media rows; the snapshot contains the same 3 product cards, but there is no confirmed automatic refresh path. This can make displayed price/stock stale after admin changes, although checkout revalidates on the server.

**In progress in PR #153:** the read-only `iqa-public-catalogue` Edge Function is already deployed once to staging with `verify_jwt=false`; PR #153 carries the current source, dynamic CORS allowlist, public-catalogue regression tests and storefront loader switch. PR #150 has already merged the shared CORS/OAuth allowlist for checkout, cancellation, public content, admin health and image upload. PR #153 extends the same allowlist to admin mutation, Cloudinary media library and public catalogue. The static JSON remains only as a clearly labelled preview fallback. Staging has no catalogue rows, so a real product payload cannot be exercised. Staging and production Edge Function/Auth requests are currently returning HTTP 402 due to Supabase quota/usage limits; do not claim live verification or promote production functions until the quota issue is resolved and staging smoke tests pass.

**Known UI limitation:** the current storefront product model selects one available variant per product. Products with multiple sellable variants need a variant selector before those options are offered to customers.

**Next work:** verify the production endpoint through the public health monitor after deployment; add a variant selector before selling multi-variant products; verify owner-only product creation/update/archive, variant pricing, stock adjustment audit trail, image ordering/alt text, Cloudinary upload failure handling, CSV import validation, and out-of-stock catalogue behavior. Preserve all legacy Storage assets.

## Phase 4 — Orders, customer service, returns, and business operations

**Status: Partial backend foundation; payment and shipping integrations intentionally deferred.**

**Staging tests passed:** COD checkout creates a confirmed order with stock reservation; idempotent replay does not reserve twice; insufficient stock and duplicate variants reject; customer ownership checks and stock release on cancellation pass; owner-only status transitions pass.

- COD order creation and selected order-state transitions exist.
- Customer order cancellation and customer-owned order reads are implemented.
- Support, review, return-request, refund, supplier, and purchase-order data structures exist with RLS policies.
- The checkout service refuses to open unless the store's COD and delivery configuration is verified.

**Included now:** order status permissions, cancellation rules, customer order history, support ticket ownership, review moderation, return/warranty request intake, safe activity logging.

**Deferred by instruction:** payment gateway, refund execution through a gateway, courier/shipping API, shipment booking, tracking, and delivery webhooks. Do not present a delivery ETA or fee as confirmed until verified settings exist.

## Phase 5 — Storefront experience, accessibility, performance, and SEO

**Status: Existing experience and browser tests; live-catalogue, canonical metadata, robots.txt, sitemap and SEO regression coverage are in PR #153 pending final CI/browser checks.**

- Storefront has product detail pages, gallery controls, compare, recently viewed, category/brand routes, and customer-facing delivery-information placeholders.
- Product detail UI uses approved catalogue data and avoids claiming ratings that do not exist.
- Desktop/mobile Playwright regression tests are part of CI.
- Current application is a hash-routed static storefront. Product hash routes are not separate crawlable URLs; sitemap initially lists only the canonical homepage.

**Next work:** dynamic document titles/descriptions for client routes, server/static rendering or crawlable product URLs, product structured data only from verified data, image dimensions/alt text, keyboard/screen-reader checks, Core Web Vitals, and mobile cart/checkout usability.

## Phase 6 — Launch readiness, reliability, legal/compliance, and operating controls

**Status: Not launch-ready; external owner inputs and verification required.**

**Production advisor review:** no health lints; security advisor reports leaked-password protection disabled and flags the authenticated customer-cancellation SECURITY DEFINER RPC (its ownership/COD checks and stock release were exercised in staging). Performance advisor reports an unindexed checkout-idempotency foreign key, unused indexes, and multiple permissive SELECT policies. These are review items; no indexes or policies were blindly dropped. Backup schedule/restore capability could not be verified through the connected tools. Supabase logs confirm HTTP 402 quota/usage failures on Auth and Edge Function endpoints in both staging and production; SQL read-only access remains available.

- Confirm production/staging environment separation, secrets, access roles, and rollback procedure.
- Verify backup schedule and perform a restore test before accepting real customer orders.
- Configure monitored alerts for checkout failures, stock mismatches, auth failures, and Edge Function errors.
- No dedicated privacy, terms, returns/refunds, or warranty policy pages were found in the repository. Owner must approve the business identity, support contacts, policy wording, GST/tax treatment, and customer-consent language before public sales.
- Verify support inbox and response ownership.
- Run final accessibility, performance, security-advisor, dependency, and browser regression checks.
- No custom domain is assumed; use the verified Cloudflare Pages production hostname. GitHub Pages remains a static fallback; authenticated admin/checkout APIs are being aligned to the verified Cloudflare production origin.

## Owner actions required before real public sales

1. Add real product catalogue records, variants, prices, stock, and approved images.
2. Confirm business contact details and customer support email/phone.
3. Review and approve the legal/policy copy and warranty/return terms.
4. Configure COD and delivery coverage/charges only when ready to accept those orders.
5. Provide a real test customer account and address for a controlled checkout rehearsal.
6. Add the Cloudflare Pages URL to Supabase Auth Site URL / Redirect URLs and verify Google OAuth on the Cloudflare host.
7. Review the three production-missing migrations (`20261107193017`, `20261108060625`, `20261108081229`) and explicitly approve a controlled production catch-up only after staging verification.
8. Confirm backup schedule and perform a restore test in the Supabase dashboard.
9. Review the disabled leaked-password protection setting and the customer-cancellation SECURITY DEFINER advisory; approve the Auth policy and least-privilege treatment.
10. Review the Supabase HTTP 402 quota/usage limit in the dashboard and decide whether to wait for reset or approve a plan/usage change; no paid change is made automatically.
11. Approve the final production launch after quota recovery, backup/restore, security and end-to-end checks.

## Current verified staging observations

- Staging project: separate from production.
- RLS: enabled on all 26 public tables.
- Product/customer/order staging rows: currently empty outside rollback-only tests.
- Product image bucket: public legacy bucket with 5 MB limit and JPEG/PNG/WebP/AVIF MIME allowlist. Do not delete or migrate existing files without audit.
- Checkout Edge Function: JWT verification enabled.
- Public content Edge Function: JWT verification disabled by design for published public content only.
- Public catalogue Edge Function: deployed once to staging with JWT verification disabled; it is read-only and filters to approved, available products.
- Shared CORS/OAuth allowlist source changes are in merged PR #150; additional admin/media/catalogue CORS source changes are in PR #153. Do not redeploy production functions from the PR branch.
- HTTP 402 quota/usage failures are confirmed in both staging and production Auth/Edge Function logs. Treat runtime smoke tests as blocked until the owner resolves the quota; do not retry in a loop or mark them passed.

## Completion rule

A phase is complete only when code, tests, staging verification, and documentation all pass. A skipped external integration is marked deferred—not complete. Production deployment is not a substitute for end-to-end business acceptance.

## Execution update — 2026-11-08

### Verified repository and deployment state
- PR #146 was merged after its Worker tests, storefront checks, and Cloudflare preview checks passed. The staging Worker deployment ran on `main`; the deployment workflow and `/healthz` verification completed successfully.
- The `main` Cloudflare Pages deployment and GitHub Pages deployment triggered by that merge both completed successfully. The recurring public-health monitor on `main` also completed successfully. This redeployed the existing main storefront; it did not deploy PR #153 or apply a database migration.
- PR #145 was closed only after confirming its sole changed file, `supabase/functions/iqa-admin-mutate/index.ts`, was preserved byte-for-byte in PR #153.
- PR #149's five Edge Function files not listed in PR #153 are already present in `main` with the merged PR #150 CORS allowlist changes. PR #152's changed-file set is fully represented in PR #153. PR #151's unique title/description and admin `noindex` assertions have been restored into `tests/seo-baseline.test.js`.

### PR #153 current work
- The CORS regression test now accepts either direct origin validation or a request-origin value validated before the OPTIONS branch. Runtime CORS allowlists were not weakened.
- The storefront checkout now persists an idempotency key across retries, scoped to the authenticated user, selected address, and exact cart lines. It reuses that key after transient failures, clears it only after confirmed order creation, and removes only cart quantities that still match the confirmed order.
- Added `tests/checkout-idempotency.test.js` to exercise key reuse, key rotation on user/address/cart changes, and successful clearing.
- SEO regression coverage now also checks the descriptive homepage title, meta description, and private-admin `noindex,nofollow`.
- Latest PR #153 commit `1b166f4e9d76f42765848f15f56cad23905d0ad5` passed syntax and local regression tests, desktop/mobile Playwright browser checks (79 passed), and isolated Cloudflare preview route/backend-isolation verification. The production deploy job was skipped; PR #153 remains open and no production migration or Edge Function was deployed.

### Fresh staging checks
- The staging checkout RPC was exercised with SQL NULL, JSON null, object, empty-array, non-object line, and duplicate-variant payloads. Each was rejected at the database boundary with its expected error.
- `checkout_idempotency` remained at zero rows after those negative tests; no staging order, customer, address, product, or inventory fixture was created or changed.
- Staging currently has zero products, variants, customers, addresses, orders, order items, and checkout idempotency rows. Positive checkout, stock-reservation, concurrency, and replay tests therefore cannot be independently repeated without creating disposable fixtures. The previous rollback-only test results remain recorded above, but are not represented as freshly rerun here.

### Production and runtime blockers
- Production's `iqa_create_customer_order` still has the pre-hardening SQL NULL cart check and lacks the duplicate-variant guard. It retains row-level stock locking, but the missing payload guards are a critical production data-integrity risk.
- Production is missing staging migrations `20261107193017`, `20261108060625`, and `20261108081229`. No production migration has been applied.
- Production and staging Edge Function deployments are not fully synchronized with the current source. Production does not yet have `iqa-public-catalogue`; several deployed functions still have the older single-origin CORS behavior. The current source fixes are not considered runtime-verified.
- Staging Edge Function logs contain HTTP 402 quota/usage responses. A separate HTTP 401 invalid-key event is not treated as a quota success or a passed test. The connected tools do not expose the billing detail behind the 402; check the Supabase dashboard before attempting further runtime requests. Do not retry in a loop.
- Production Auth security advisor still reports leaked-password protection disabled. The authenticated customer-cancellation SECURITY DEFINER warning remains an intentional reviewed path: it uses an empty search path, verifies `auth.uid()` and customer ownership, restricts cancellation to eligible pending/confirmed COD orders, locks inventory, and releases reserved stock transactionally.
- All 26 public tables have RLS enabled in both projects. The checkout idempotency table intentionally has no user-facing policy. Multiple permissive SELECT policy and unused-index warnings remain review items; no policy or index was blindly removed.
- The current product catalogue still exposes only one available variant per product and does not yet implement server pagination. Product detail URLs remain hash routes; the sitemap intentionally contains only the crawlable homepage, and product structured data is not yet implemented.
- Legal pages remain preview/draft content: seller identity, support contacts, grievance officer, returns/refunds, warranty coverage, privacy terms, and authenticity/sourcing claims require verified business information and legal review.
- Backup schedule and restore capability remain unverified through the connected tools. No Storage files or customer data were deleted.

### Current release gate
Do not merge PR #153 or promote Edge Functions until the staging 402 blocker is resolved, source-controlled Edge Functions are deployed and smoke-tested in staging, and the public-catalogue/checkout paths pass against disposable staging fixtures. Do not apply the three production migrations until staging verification is complete and the owner gives explicit production approval.
