# Production Cloudflare Worker rollout

The Production Worker is prepared as `iqa-watches-api-production`, but its deployment is manual and requires the workflow input `confirm_production_deploy = YES`. The Worker-level `SUPABASE_UPSTREAM_CHECK_ENABLED = "false"` gate blocks all public-content, catalogue, and Auth upstream requests while the project is restricted. The workflow health validation calls only `/healthz`.

## Safe rollout sequence

1. Wait until the Supabase project is restored after its Cached Egress quota reset.
2. Verify the Production `iqa-public-content` function returns HTTP 200 using a single controlled request.
3. Run the manual `Deploy IQA WATCHES production API` workflow with explicit approval. It deploys the Worker and checks only `/healthz`; the staging-only cache probe and production catalogue route must both return 404.
4. Confirm the Worker can serve `/api/v1/public-content` and that repeated requests return a Cloudflare cache HIT.
5. Only then set `publicContentProxyUrl` in `admin/backend-config.js` to `https://iqa-watches-api-production.ugcnoorstudio.workers.dev/api/v1/public-content`.
6. Re-run the storefront browser tests. The proxy request uses only the safelisted `Accept` header and `credentials: omit`; it does not send the Supabase publishable key from the browser.
7. Keep the direct Supabase fallback until the proxy is verified; do not enable the proxy while the project still returns HTTP 402.

## Protection

- The Production Worker uses the Production project URL and publishable key only; no service-role key is stored in Cloudflare or GitHub.
- The Production catalogue route is disabled until the corresponding Edge Function is deployed and explicitly enabled.
- The global upstream pause is enforced inside the Worker itself, not only in CI. When set to `false`, public content, catalogue and Auth routes return a local 503 without contacting Supabase.
- Do not switch the storefront proxy URL while the global upstream pause is false. After quota recovery, enable one controlled upstream route at a time and verify cache HITs before enabling the storefront proxy.
- The 402 Cached Egress response is negatively cached for 30 seconds by the Worker, limiting repeated upstream attempts while the project is restricted.
- The deployment workflow is manual-only and never changes the storefront proxy URL.
