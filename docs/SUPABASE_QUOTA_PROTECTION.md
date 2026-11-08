# IQA WATCHES Supabase quota protection

## Confirmed restriction
The Staging Supabase public-content function returned HTTP 402 with `exceed_cached_egress_quota`. This is a project-level Supabase restriction, not an Edge Function key error. The Worker therefore returned 503 because its upstream was unavailable.

The Production usage figures supplied for the current monthly cycle are:
- Log Queries: 168 GB used against 100 GB.
- Cached Egress: 34 GB used against 5 GB.

These are separate meters. Cached Egress is the immediate reason reported by the 402 response; Supabase documents that Cached Egress applies only to Storage CDN cache hits. Logs Query is not billed directly, and the published allowance/degraded-state enforcement is currently marked not yet enforced. The 168 GB figure is therefore not the cause of this 402, but repeated broad log scans should still stop. Previously consumed monthly usage is historical and cannot be reduced retroactively.

## Controls already in place
- Browser tests on localhost and preview hosts are prevented from calling the Production content function (PR #157).
- Public product images in the database point to Cloudinary; the legacy Supabase Storage objects are retained for rollback and are not deleted.
- Cloudflare Worker routes are prepared for public content (60-second cache) and catalogue (5-minute cache), with origin-specific CORS and 24-hour preflight caching.
- The staging Worker has a static cache probe that does not call Supabase. It verifies Cloudflare edge HITs and CORS while Supabase is quota-restricted.
- The staging workflow has `SUPABASE_UPSTREAM_CHECK_ENABLED = "false"` while the project is restricted, so it sends no Supabase request. After the monthly quota resets and a controlled health check succeeds, change it to `true`; the workflow then resumes the upstream and real API cache tests. It never retries repeatedly.
- The recurring public health monitor checks static Cloudflare Pages resources only; it does not query Supabase Logs or public Edge Functions.

## Operating rules
- Do not run broad or frequent Supabase Logs Explorer queries. Log Query usage is driven by reading/scanning logs, not by the normal public API request count. Use only a narrow time window and exact filters when an investigation is necessary.
- Do not remove spend caps or upgrade plans automatically.
- Keep product media on Cloudinary and large files on Cloudflare R2.
- Make the legacy `product-images` Storage bucket private. Because project API requests currently return 402, the owner-only Edge Function cannot be invoked until service is restored. The Supabase Dashboard remains accessible during a Fair Use restriction; the immediate no-cost action is Storage → Buckets → `product-images` → Edit bucket → turn **Public** off and Save. Do not delete objects. The owner-only Storage API action is the automated route once service is restored. Do not update `storage.buckets` or `storage.objects` directly with SQL.
- Do not route the Production storefront to the Worker until the Production Worker is deployed and Staging confirms real cache HITs.

## Expected outcome
After the monthly quota resets or Supabase service is restored, the Worker should serve repeated public-content requests from Cloudflare cache and reduce calls to Supabase. The legacy Storage bucket privacy action prevents new public downloads of the old Supabase-hosted originals. Neither action can reverse usage already recorded for the current cycle.
