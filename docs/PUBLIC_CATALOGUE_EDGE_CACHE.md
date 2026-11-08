# Public catalogue edge-cache contract

## Purpose

Serve the public, approved, sellable product catalogue from Cloudflare's edge cache so storefront traffic does not call Supabase for every visitor.

## Request path

1. Storefront calls the Cloudflare Worker route `GET /api/v1/catalogue`.
2. Cloudflare Workers Caching serves a fresh cached response when available.
3. On a cache miss, the Worker calls the read-only Supabase Edge Function `iqa-public-catalogue` using only the server-side publishable API key.
4. The Supabase function remains the source of truth and filters to approved, published, verified, in-stock products.
5. The Worker caches only a successful payload whose shape is `{ ok: true, products: [...] }`.

## Cache policy

- Public catalogue response: `public, max-age=300, stale-while-revalidate=3600`.
- CORS preflight: `Access-Control-Max-Age: 86400`.
- Errors, invalid payloads and configuration failures: `Cache-Control: no-store`.
- `Vary: Origin` keeps browser CORS responses origin-aware.
- Query-string variants are rejected so callers cannot create arbitrary cache keys.
- Requests carrying Authorization or Cookie are rejected; this endpoint is strictly public-only.
- Worker caching is enabled in `cloudflare/wrangler.toml`.

## Security and correctness boundaries

- Never place the Supabase service-role key in Cloudflare Worker vars, Pages env vars, browser code or Git.
- The Worker uses the publishable key only to invoke the public Edge Function. The service-role key remains inside Supabase's server-side function environment.
- Never route admin, customer, cart, order, payment, address or staff data through this public cache.
- Cached product price and stock are display snapshots only. Checkout must revalidate current price and available stock transactionally in Supabase.
- A catalogue cache can be stale for up to its configured freshness/stale window. Admin publication, price and inventory changes therefore need an explicit purge/invalidation mechanism before production rollout if a shorter visibility window is required.
- The Worker endpoint is not yet wired into the storefront. Do not switch the storefront until the Worker has a verified deployment URL, the matching Supabase public-catalogue function is deployed in the target environment, and browser tests pass.

## Rollout checklist

1. Merge the catalogue-function source only after review and successful staging tests.
2. Deploy the Worker to staging and verify `/api/v1/catalogue`, CORS, cache headers and cache HIT behavior.
3. Confirm Supabase request volume falls during repeated storefront loads.
4. Add and test admin-triggered cache invalidation (or keep a short TTL) before production.
5. Configure production Worker environment separately; never reuse staging project identifiers.
6. Wire the storefront to the verified Worker URL and test desktop/mobile, checkout price/stock revalidation, and failure fallback.
7. Production deployment requires explicit owner approval.
