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

## Phase 1 — Checkout, order integrity, and inventory reservation

**Status: Implemented and staging-verified.**

- Hardened the database checkout RPC against SQL NULL, non-array, empty, non-object, and duplicate-variant cart payloads.
- Kept the order-creation RPC service-role-only with an empty search_path.
- Added regression tests and merged PR #148: https://github.com/ugcnoorstudio-ui/IQA-WATCHES-/pull/148
- Applied migration `20261108081229_harden_checkout_rpc_payload` to staging only.
- Ran rollback-only staging fixtures covering valid order creation, exact stock reservation, idempotent replay, duplicate cart rejection, and insufficient-stock rejection.
- Confirmed temporary customer/product/order fixtures were fully rolled back.

**Production caution:** production migration history currently ends at `20261105075427`; staging has three later migrations: `20261107193017` (eight-image cap), `20261108060625` (checkout idempotency index), and `20261108081229` (checkout payload hardening). Production checkout RPC still has the pre-hardening validation. The hardening migration has been applied and fully tested in staging only. The migration filename in the PR is being aligned to the recorded staging version to prevent duplicate application. No production migration has been run; production catch-up requires a deliberate release decision.

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

**Additional production finding:** the live storefront currently reads `data/catalogue.json`, not Supabase directly. The snapshot is dated 2026-11-07. Production currently has 3 approved products, 3 available variants, and 4 Cloudinary media rows; the snapshot contains the same 3 product cards, but there is no confirmed automatic refresh path. This can make displayed price/stock stale after admin changes, although checkout revalidates on the server.

**In progress:** a read-only `iqa-public-catalogue` Edge Function is in the PR and has been deployed once to staging. That first staging version still uses the old GitHub Pages CORS origin; the PR corrects it to the verified Cloudflare Pages origin and updates checkout, cancellation, public content, admin, and media Edge Functions using current production source as the base. The PR also switches the storefront loader to the live endpoint, retaining the static JSON only as a preview fallback. Staging has no catalogue rows, so a real product payload cannot be exercised there. After CI passes, redeploy the corrected functions to staging, then production, before merging the frontend switch.

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

**Status: Existing experience and browser tests; SEO and live-catalogue updates are in PR #149 pending CI.**

- Storefront has product detail pages, gallery controls, compare, recently viewed, category/brand routes, and customer-facing delivery-information placeholders.
- Product detail UI uses approved catalogue data and avoids claiming ratings that do not exist.
- Desktop/mobile Playwright regression tests are part of CI.
- Current application is a hash-routed static storefront. Product hash routes are not separate crawlable URLs; sitemap initially lists only the canonical homepage.

**Next work:** dynamic document titles/descriptions for client routes, server/static rendering or crawlable product URLs, product structured data only from verified data, image dimensions/alt text, keyboard/screen-reader checks, Core Web Vitals, and mobile cart/checkout usability.

## Phase 6 — Launch readiness, reliability, legal/compliance, and operating controls

**Status: Not launch-ready; external owner inputs and verification required.**

**Production advisor review:** no health lints; security advisor reports leaked-password protection disabled and flags the authenticated customer-cancellation SECURITY DEFINER RPC (its ownership/COD checks and stock release were exercised in staging). Performance advisor reports an unindexed checkout-idempotency foreign key, unused indexes, and multiple permissive SELECT policies. These are review items; no indexes or policies were blindly dropped. Backup schedule/restore capability could not be verified through the connected tools.

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
7. Approve the production checkout RPC hardening migration after staging verification.
8. Confirm backup schedule and perform a restore test in the Supabase dashboard.
9. Approve the final production launch after backup/restore and security checks.

## Current verified staging observations

- Staging project: separate from production.
- RLS: enabled on all 26 public tables.
- Product/customer/order staging rows: currently empty outside rollback-only tests.
- Product image bucket: public legacy bucket with 5 MB limit and JPEG/PNG/WebP/AVIF MIME allowlist. Do not delete or migrate existing files without audit.
- Checkout Edge Function: JWT verification enabled.
- Public content Edge Function: JWT verification disabled by design for published public content only.
- Staging checkout and public-content functions were redeployed from the current GitHub main source to remove stale CORS configuration that advertised an unverified Pages origin.

## Completion rule

A phase is complete only when code, tests, staging verification, and documentation all pass. A skipped external integration is marked deferred—not complete. Production deployment is not a substitute for end-to-end business acceptance.
