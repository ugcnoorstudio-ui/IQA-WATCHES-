# Phase 4 — SEO, analytics and performance setup

## Implemented in source
- Crawlable product routes use `/products/<slug>/<product-id>` and Cloudflare Pages rewrites them to the storefront entry point.
- Product pages update title, description, canonical URL, Open Graph metadata and Schema.org Product/Offer JSON-LD from the approved catalogue record.
- No rating or review schema is emitted until genuine verified reviews exist.
- `robots.txt` allows public pages and disallows the private `/admin/` area.
- `scripts/generate-sitemap.js` regenerates the sitemap from `data/catalogue.json`.
- Lighthouse CI audits the home page and product pages; the existing responsive Cloudinary srcset remains covered by regression tests.

## External account IDs still required
The following values are intentionally blank in `analytics-config.js`; do not invent them:
1. Google Search Console HTML verification token (or verify the temporary Pages URL through an available supported method).
2. GA4 Measurement ID, format `G-XXXXXXXXXX`.
3. Microsoft Clarity project ID.

When these accounts are ready, add only their public IDs to `analytics-config.js`. Never add service-role keys, API secrets or private tokens here.

## Temporary hostname
The current canonical and sitemap host is `https://iqa-watches-storefront.pages.dev`. A custom domain is deliberately deferred. When the user purchases and connects one after all phases, update the canonical/sitemap base and re-submit the sitemap in Search Console.

## Release gate
Do not deploy Phase 4 to production while Phase 3's Supabase Auth service is returning HTTP 402 `exceed_cached_egress_quota`. The public static pages can render, but customer/admin sign-in and backend operations remain blocked until Supabase restores service.
