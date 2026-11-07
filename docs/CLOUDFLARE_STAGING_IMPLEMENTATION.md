# IQA WATCHES — Cloudflare staging foundation

## Scope
This branch adds an isolated staging Worker and a staging-only D1 bootstrap. It does not change the production storefront, Supabase project, Auth users, production tables, or existing Cloudflare Pages workflow.

## Resources
- Worker: `iqa-watches-api-staging`
- D1: `iqa-watches-staging`
- Worker health: `GET /healthz`
- Auth probe: `GET /api/v1/me` with a Supabase access token

## Authentication boundary
The Worker sends the presented bearer token to the configured Supabase Auth `/auth/v1/user` endpoint with the publishable key. Supabase Auth validates the token; the Worker does not decode an unverified JWT and does not accept a browser-supplied user ID as identity. Configure Worker vars `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` before enabling the Auth probe. Never configure a service-role key in the Worker.

## D1 migration policy
The initial migration creates only a migration ledger. It intentionally does not guess the business schema or import production records. Before adding business tables, map all existing production migrations, constraints, indexes, triggers, RLS policies, and Edge Function authorization rules to D1/Worker equivalents.

## Deployment
1. GitHub Actions secrets must contain `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
2. Add repository variable `CLOUDFLARE_WORKERS_SUBDOMAIN` with the account's workers.dev subdomain.
3. Run the manual workflow **Provision and deploy IQA WATCHES staging API** from branch `migration/cloudflare-d1-workers-staging`.
4. Verify the workflow's D1 migration, Worker deploy, and `/healthz` smoke test.

The workflow is manual and branch-restricted. It never deploys production and never deletes or modifies Supabase resources. The D1 UUID is generated during workflow execution and written only to that workflow's checked-out workspace.

## Not yet implemented
No storefront API cutover, business schema, order/payment writes, staff authorization model, data migration, production DNS routing, or Supabase retirement is included. Those require a complete schema and policy inventory plus parity and rollback tests.
