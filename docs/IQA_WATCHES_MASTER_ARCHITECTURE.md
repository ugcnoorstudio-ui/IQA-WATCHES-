# IQA WATCHES — Master Infrastructure, Storage & Traffic Architecture

Last reviewed: 2026-11-08
Status: Phase 1 architecture specification and repository guardrails completed. Provider-side provisioning and live alert verification are tracked in Phase 7; no unverified provider resource is claimed as active.
Source of truth: GitHub `main`, the two connected Supabase projects, checked-in Cloudflare configuration, and verified repository tests.

## 1. Eight-phase execution roadmap

1. **Infrastructure, storage and architecture** — establish provider responsibilities, environment separation, cache boundaries, media rules, secrets, usage thresholds and operational prerequisites.
2. **Database and security** — schema, migrations, RLS, authentication, authorization, customer privacy and security-advisor remediation.
3. **Product catalogue and inventory** — product/category/brand/variant data, pricing, stock movements, Cloudinary media and owner workflows.
4. **Backend and order management** — API contracts, cart, server-side price/stock checks, COD checkout, idempotency, reservations and order lifecycle.
5. **Frontend and store experience** — responsive storefront, product detail, variant selection, customer account, cart, checkout and admin experience.
6. **SEO and performance** — crawlable pages, metadata, structured data, CDN/cache strategy, image performance, accessibility and Core Web Vitals.
7. **Monitoring, backup and reliability** — provider usage, alerts, logs, encrypted backups, restore drills, incident response and recovery.
8. **Final testing and launch readiness** — end-to-end acceptance, security review, legal/business readiness and controlled release.

A phase is complete only when its acceptance checks, automated tests, environment verification and documentation are complete. A provider-side prerequisite or owner decision must be marked blocked/deferred, not silently treated as complete.

## 2. Provider responsibility map

| Provider | Authoritative responsibility | Explicit exclusions |
|---|---|---|
| Supabase | PostgreSQL data, Auth, RLS, database functions and transactional business records | New product-image/video/PDF uploads; static website hosting |
| Cloudflare Pages | Public storefront frontend and static asset delivery | Database authority or secret-bearing business logic |
| Cloudflare Workers | Server-side API, trusted business logic, session verification and controlled access to private services | Browser-exposed service-role credentials |
| Cloudflare R2 | Large object storage: videos, PDFs, downloadable documents and encrypted backup artifacts | Product-image transformation pipeline |
| Cloudflare CDN/Cache | Public, cache-safe catalogue/static responses and static assets | Customer profiles, carts, orders, admin data, checkout or private responses |
| Cloudinary | Product images, responsive image variants, transformations and image delivery | Customer/order database or general-purpose backup storage |
| GitHub | Source code, migrations, tests, documentation, CI and version history | Large media, customer exports, credentials or runtime data |
| Better Stack | Intended uptime/availability and operational alerting | Application exception ownership |
| Sentry | Intended frontend/backend exception and application-performance diagnostics | Uptime provider replacement |

Supabase remains the single source of truth for product approval, price, stock, customer identity, orders and permissions.

## 3. Supabase data and Storage policy

- Keep product, customer, address, order, order-item, inventory, settings and authorization records in PostgreSQL.
- Keep only Cloudinary public delivery URL/public asset identifier and required image metadata in product-media rows. Never store image bytes in database columns.
- New product-image uploads must go to Cloudinary through the existing signed/server-authorized upload flow, not Supabase Storage.
- Do not use Supabase Storage for new product videos, PDFs or general static assets.
- Existing production Storage objects are legacy assets and must be audited before any migration or removal. The 2026-11-08 connected-project audit observed 6 production Storage objects and 0 staging Storage objects. Preserve all existing objects until an owner-approved inventory, successful copy verification and rollback plan exist.
- Do not delete buckets, objects, policies or migration history as an optimization shortcut.
- Database reads still consume database/network resources. Avoid repeated catalogue reads with safe caching, query only required columns and paginate admin data.

## 4. Cloudinary image delivery contract

- Original product images and derivatives are delivered from the IQA Watches Cloudinary account.
- Use responsive widths appropriate to the UI; the current storefront helper generates 320, 480, 800 and 1200 pixel candidates.
- Use separate transformation components in the URL path: `f_auto/q_auto`, not comma-separated transformation names.
- Apply bounded width/crop behavior where appropriate; do not upscale tiny source images unnecessarily.
- Keep meaningful alt text and stable asset identifiers; preserve the eight-image-per-product cap.
- Cloudinary upload credentials and API secrets stay server-side. Never put Cloudinary API secrets in HTML, public JavaScript, Git history or public build variables.

## 5. Cloudflare Pages, Workers, R2 and cache boundaries

### Pages
- Host the storefront on the existing Cloudflare Pages project.
- Production deployment remains restricted to the protected `main` release path and mandatory tests.
- Pull-request previews must use isolated preview configuration and must never reach production Supabase data or credentials.

### Workers
- Use Workers for server-side APIs and business rules; keep Supabase authoritative.
- Verify user sessions server-side for authenticated routes.
- Keep private API responses `Cache-Control: no-store` unless a reviewed route-specific policy proves otherwise.
- Store service-role keys, Cloudinary secrets and other private credentials as encrypted Worker secrets. Non-secret identifiers and public publishable keys may be ordinary configuration values.

### R2
- Target use: videos, PDFs, downloadable documents and encrypted backup artifacts.
- As of this review, the checked-in staging Worker configuration has no R2 bucket binding. No R2 bucket name, binding or live upload path is assumed to exist.
- Provision a bucket and add an environment-specific binding only after confirming the Cloudflare account, bucket existence, access policy, lifecycle/retention and cost/usage limits. Keep staging and production buckets separate.
- Do not route product images from Cloudinary into R2. Do not store unencrypted database exports or secrets in public buckets.
- R2 provisioning and a tested upload/download policy remain a Phase 1 external prerequisite; no production resource was created by this documentation change.

### Cache policy
- Cache only public, non-personal catalogue data and static assets.
- The checked-in `_headers` policy currently sets `/data/catalogue.json` to browser `max-age=60` and shared-cache `s-maxage=300`. Keep the short freshness window until a verified invalidation/revalidation strategy exists.
- Public product detail data may be cached only when it contains no user-specific fields and has an explicit freshness/invalidation rule.
- Verify current stock and price on the server at checkout. A cached product card is never checkout authority.
- Do not cache customer profile/address, cart, admin, order, checkout, authentication, or any response containing private data.
- A cache bypass or stale response must never weaken server-side price, stock, ownership or permission checks.

## 6. GitHub and secrets

- GitHub stores source, lockfiles, migration files, automated tests, workflow definitions and non-sensitive documentation.
- Never commit passwords, access tokens, service-role keys, Cloudinary API secrets, private exports or customer data.
- Pin dependencies and retain lockfiles where applicable.
- CI must run syntax, unit/regression and browser checks before a production release.
- Worker secrets are configured through the Cloudflare secret mechanism; public values are kept distinct from private secrets.

## 7. Monitoring and usage protection

Intended division:
- Better Stack: public uptime, endpoint availability and operational alerting.
- Sentry: frontend/backend exceptions, failed transactions and application performance.

Connection status must be verified in each provider dashboard. The repository audit on 2026-11-08 found an open Sentry integration PR (#126); this does not prove that Sentry is active in production. Better Stack connection was not verified. Do not claim either provider is fully configured until a test event/alert is received.

Usage review thresholds:
- **50% — Monitor:** record current usage and trend.
- **70% — Review:** identify the growing service, traffic source and avoidable requests.
- **80% — Alert:** optimize queries, image sizes, cache behavior and retention; prepare capacity options.
- **90% — Critical:** owner notification and controlled load reduction for non-essential work; protect checkout, authentication, order integrity and customer access.

Thresholds are an operating policy, not proof that every provider exposes matching automatic alerts. Enable native alerts where supported; otherwise record the weekly manual review. Never automatically disable core services or delete customer data to reduce usage. Supabase spend/usage controls are not a universal guarantee and must not be represented as one.

## 8. Verified baseline on 2026-11-08

- Separate Supabase staging and production projects exist in the Mumbai region.
- Staging has 42 migrations; production has 39. The three-migration difference is known and must be reviewed in the database/security phase. Do not run production migrations as part of this architecture documentation task.
- All 26 public tables have RLS enabled in both connected projects.
- Staging has 0 rows in `storage.objects`; production has 6. Existing production objects are preserved.
- Cloudflare Pages deploy workflow, staging Worker workflow and 30-minute public health monitor are present in the repository.
- Worker JSON responses currently default to `Cache-Control: no-store`.
- The storefront's catalogue JSON has a short public cache policy (60 seconds browser / 300 seconds shared cache).
- Responsive Cloudinary transformation and the rule against uploading product-image bytes to Supabase Storage have existing regression tests.
- Cloudflare R2 binding is not present in the checked-in staging Worker configuration.
- Sentry and Better Stack production connectivity is not yet verified.

## 9. Phase 1 acceptance checklist

- [x] Provider responsibility and data ownership are documented.
- [x] Existing Cloudinary image path and transformation syntax are protected by regression tests.
- [x] Public catalogue cache and private Worker response boundaries are documented and tested.
- [x] Supabase Storage legacy objects are explicitly protected from unreviewed deletion.
- [x] Staging/production separation and migration-count drift are recorded.
- [x] Usage thresholds and monitoring responsibilities are documented without overstating provider alert capabilities.
- [x] Architecture contract, provider responsibility map, data boundaries, cache policy, secrets rules and usage thresholds are documented and protected by repository tests.
- [ ] Provider-side activation is intentionally tracked in Phase 7: create/verify separate R2 buckets and bindings; test private upload/download and lifecycle rules; verify Better Stack/Sentry alert delivery; verify Cloudflare/Supabase native usage alerts.

**Phase 1 exit:** The architecture-definition and repository-guardrail scope is complete. This does **not** mean R2 buckets, monitoring integrations or provider alerts are provisioned. Those operational checks are Phase 7 acceptance items. The Cloudflare Workers production build check associated with the current PR is still reported as failed; no Worker release is claimed as successful, and that failure must be investigated before a Worker deployment.
