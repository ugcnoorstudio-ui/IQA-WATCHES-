# IQA WATCHES Supabase quota protection

## Confirmed restriction
The Staging Supabase public-content function returned HTTP 402 with `exceed_cached_egress_quota`. This is a project-level Supabase restriction, not an Edge Function key error. The Worker therefore returned 503 because its upstream was unavailable.

The Production usage figures supplied for the current monthly cycle are:
- Log Queries: 168 GB used against 100 GB.
- Cached Egress: 34 GB used against 5 GB.

These are separate meters. The displayed Logs Query allowance is 100 GB and the reported scan usage is 168 GB (68 GB above that allowance). Supabase currently marks Logs Query enforcement as **not yet enforced** and says it is not billed directly; repeated broad log scans should still stop. Cached Egress is 34 GB against the Free-plan 5 GB allowance (29 GB over). Supabase documents that Cached Egress applies only to Storage CDN cache hits, and the observed 402 is consistent with that restriction. Previously consumed monthly usage is historical and cannot be reduced retroactively.

## Controls already in place
- Browser tests on localhost and preview hosts are prevented from calling the Production content function (PR #157).
- Public product images in the database point to Cloudinary; the legacy Supabase Storage objects are retained for rollback and are not deleted.
- Cloudflare Worker routes are prepared for public content (60-second cache) and catalogue (5-minute cache), with origin-specific CORS and 24-hour preflight caching. These Worker cache hits avoid repeat Supabase Edge Function calls and can reduce API-origin traffic/uncached egress; **they do not reduce Supabase Storage Cached Egress**.
- The staging Worker has a static cache probe that does not call Supabase. It verifies Cloudflare edge HITs and CORS while Supabase is quota-restricted.
- The Worker-level `SUPABASE_UPSTREAM_CHECK_ENABLED = "false"` switch now blocks public-content, catalogue and Auth upstream calls locally, not merely in CI.
- The staging workflow has `SUPABASE_UPSTREAM_CHECK_ENABLED = "false"` while the project is restricted, so it sends no Supabase request. After the monthly quota resets and a controlled health check succeeds, change it to `true`; the workflow then resumes the upstream and real API cache tests. It never retries repeatedly.
- The recurring public health monitor checks static Cloudflare Pages resources only; it does not query Supabase Logs or public Edge Functions.

## Operating rules
- Do not run broad or frequent Supabase Logs Explorer queries. Log Query usage is driven by reading/scanning logs, not by the normal public API request count. Use only a narrow time window and exact filters when an investigation is necessary.
- Do not remove spend caps or upgrade plans automatically.
- Keep product media on Cloudinary and large files on Cloudflare R2.
- Make the legacy `product-images` Storage bucket private. Production currently has exactly one bucket (`product-images`), it is public, and it contains six objects. A read-only preflight found zero live Supabase Storage URL references in product specs, order snapshots, content entries or store settings, and zero unverified product-media rows. Staging already has this bucket private with zero objects. Production's bucket is not yet changed. The owner-only Storage API action is the automated route once the project accepts function requests. The no-cost dashboard fallback is Storage → Buckets → `product-images` → Edit bucket → turn **Public** off and Save. Do not delete objects or update `storage.buckets` / `storage.objects` directly with SQL.
- Do not route the Production storefront to the Worker until the Production Worker is deployed and Staging confirms real cache HITs.

## Expected outcome
After the monthly quota resets or Supabase service is restored, enabling the Worker upstream gate and routing the storefront through it should serve repeated public-content requests from Cloudflare cache and reduce calls to Supabase APIs. Separately, making the unused legacy Storage bucket private prevents new public downloads from those six legacy objects and is the direct control for Cached Egress. Neither action can reverse usage already recorded for the current cycle.
