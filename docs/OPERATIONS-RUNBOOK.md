# IQA WATCHES — Operations and Recovery Runbook

Last reviewed: 2026-11-08

This runbook contains operational steps, not credentials. Store passwords, API keys, recovery codes, database URLs with secrets, and signing keys only in an approved password manager or the relevant provider's secret manager.

## 1. Current system map

| Service | Current role | Known project / endpoint |
|---|---|---|
| GitHub | Source of truth, code review, CI | `ugcnoorstudio-ui/IQA-WATCHES-` |
| Cloudflare Pages | Storefront hosting and previews | Production Pages hostname currently recorded in repository as `iqa-watches-storefront.pages.dev` |
| Cloudflare Workers | Worker/API deployment and health route | Worker service `iqa-watches`; deployment state must be checked in Cloudflare before each release |
| Supabase staging | Isolated schema and test environment | Project `qcxgsomqxfoueootxzpv` |
| Supabase production | Authoritative live data and Auth | Project `nyhyfdququxnorqlnnqq` |
| Cloudinary | Product image delivery | Account and credentials are managed outside this repository; confirm current account owner |
| GitHub Pages | Existing static fallback | `https://ugcnoorstudio-ui.github.io/IQA-WATCHES-/` |

Do not assume a service is healthy because its project status says ACTIVE_HEALTHY. Check the actual public route and the relevant service logs.

## 2. Incident: storefront is unavailable

1. Open the public storefront and record the exact URL, time, device/network, and error.
2. Check the Cloudflare Status page and the IQA WATCHES Pages/Workers service status.
3. In Cloudflare, inspect Pages deployment history and Worker build/deployment logs. Identify the last known-good deployment.
4. Check GitHub Actions for the corresponding commit. Do not deploy a commit with failed required checks.
5. If the failure began after a deployment, use Cloudflare's documented rollback/previous-deployment operation for the last known-good deployment. Confirm the selected project and environment before acting.
6. Verify the homepage, product listing, product detail, images, login route, and `/healthz` where configured.
7. Record incident start/end, affected routes, commit/deployment IDs, cause, rollback, and follow-up action.

Do not change DNS, disable security controls, or switch production to staging to work around an outage.

## 3. Incident: catalogue, images, or prices are wrong

1. Treat Supabase as the authority for product approval, variant price, and stock.
2. Check the public catalogue Edge Function response and its logs. The static catalogue JSON is a preview fallback and may be stale.
3. Check Cloudinary delivery separately from catalogue data. A working image URL does not prove that its product is approved or in stock.
4. Never edit browser-rendered price/stock as a production fix.
5. For suspected overselling or incorrect stock, stop accepting new orders through the approved store control, preserve logs, and reconcile orders and inventory before reopening.
6. Do not delete legacy Supabase Storage objects or Cloudinary assets without an inventory audit and explicit owner approval.

## 4. Incident: login, OTP, or customer session failures

1. Check Supabase Auth service health and project logs for the correct environment.
2. Verify the configured Site URL, redirect allowlist, OAuth provider configuration, and callback URL.
3. Check browser console/network errors without copying access tokens, OTPs, cookies, or passwords into tickets.
4. Check rate limits and provider configuration before retrying OTP.
5. Never disable RLS, weaken callback validation, or expose a service-role/secret key to fix a login problem.
6. If the Supabase project returns quota/usage HTTP 402, stop repeated retries and review project usage/billing in the owner dashboard. Do not upgrade or purchase a plan without explicit approval.

## 5. Incident: checkout, order, or inventory mismatch

1. Preserve the order ID, idempotency key reference (never its secret value if sensitive), timestamps, and relevant request/correlation IDs.
2. Check the server-side checkout Edge Function logs and database order/inventory records.
3. Verify payment status only from a verified provider webhook/API record and the server-side payment ledger—not a browser redirect.
4. Do not manually mark an order paid or decrement/restore stock with an ad-hoc browser or SQL update.
5. Use the approved, audited order cancellation/refund/inventory workflow. If no safe workflow exists, pause new order acceptance and escalate.
6. Reconcile the order, payment, reserved/available stock, and audit events before resuming.

The checkout database RPC is designed to validate server-side product/variant prices, lock stock rows, reserve stock transactionally, and support idempotency. Production currently lacks three staging migrations; do not treat production checkout as release-ready until those migrations have been reviewed, approved, and safely applied.

## 6. Supabase health, migrations, and recovery

- Staging project: `qcxgsomqxfoueootxzpv` (`IQA WATCHES STAGING`).
- Production project: `nyhyfdququxnorqlnnqq` (`IQA WATCHES INDIA`).
- Always confirm the project ref in the dashboard before running SQL or migrations.
- Apply and verify schema changes in staging first. Use version-controlled migrations and review their exact SQL.
- Never apply a production migration without explicit owner approval and a verified backup/recovery plan.
- Current known migration drift: production is missing `20261107193017`, `20261108060625`, and `20261108081229`; these correspond to the eight-image cap, checkout idempotency order index, and checkout payload hardening.
- Confirm backup schedule, retention, export method, and restore capability in the Supabase dashboard. These were not verified in the connected project inspection.
- Perform restore drills into an isolated project, never over production as a test.
- After recovery, verify migration history, RLS, critical functions, customer/order counts, and a controlled staging checkout test.

## 7. Releases and rollback

1. Create a focused branch and pull request.
2. Review the diff for secrets, auth/RLS changes, data migrations, and destructive operations.
3. Require CI, unit/regression tests, desktop/mobile browser tests, and Cloudflare preview checks to pass.
4. Confirm preview deployments cannot connect to production Supabase.
5. Apply schema changes to staging and verify them before requesting production release approval.
6. Deploy production only from the approved mainline and only after required checks pass.
7. Record the commit SHA, workflow run, deployment ID, migration versions, and verification results.
8. If a release fails, roll back the frontend/Worker to the last known-good deployment using provider-supported controls. Database rollback is a separate operation: use a reviewed forward-fix or a tested backup restore plan; do not assume reverting application code reverses a migration.
9. Verify critical customer flows after rollback.

## 8. Security and access

- Enable MFA/2FA on GitHub, Cloudflare, Supabase, Cloudinary, and any future payment, shipping, messaging, and monitoring accounts.
- Use individual named accounts and least-privilege roles. Remove access promptly when staff leave.
- Keep service-role and provider secret keys server-side only.
- Review GitHub secret scanning, Dependabot, branch protection, and required status checks.
- Review Supabase RLS/security advisors after schema or policy changes. A warning must be investigated, not blindly silenced.
- Current advisor items include the intentional service-only `checkout_idempotency` table, authenticated SECURITY DEFINER customer-cancellation RPC (requires least-privilege review), and disabled leaked-password protection in production.
- Do not put customer personal data, OTPs, access tokens, payment credentials, or recovery codes in issue comments or monitoring payloads.

## 9. Escalation and ownership

Before launch, the business owner must record (in the password manager / internal business record, not this public repository):
- Primary and backup technical owner.
- Provider account owner and billing contact for each service.
- Support inbox owner and escalation phone.
- Payment and shipping provider contacts once selected.
- Backup operator and restore approver.
- Where recovery codes are stored.

## 10. Known open release blockers at last review

- PR #153 is open; the Cloudflare Workers external build check is failing. Cloudflare Pages preview and GitHub Actions runs succeeded, but this does not clear the Worker build failure.
- Supabase Auth/Edge Function runtime requests returned HTTP 402 quota/usage errors; runtime smoke tests are blocked.
- Production is three migrations behind staging.
- Production leaked-password protection is disabled.
- Staging currently has no live catalogue records; product/customer/order data must be seeded and verified through approved workflows before launch.
- Custom domain, payments, shipping, email, SMS/WhatsApp, Sentry, Better Stack, analytics, and legal policy approvals remain unverified or deferred.
- Backup schedule and restore test are not verified.

This runbook must be reviewed after every material architecture change and at least quarterly.


## 11. Production migration preflight — read-only verification (2026-11-08)

The following facts were verified directly against both Supabase databases. This is a review record, not migration approval.

| Check | Staging | Production |
|---|---|---|
| Eight-image trigger | Present | Absent |
| Maximum existing media rows per product | 0 (no staging media rows) | 2 |
| Total product media rows | 0 | 4 |
| Checkout idempotency order index | Present | Absent |
| Checkout RPC hardening baseline | Hardened definition present | Exact expected pre-hardening baseline found |
| Checkout RPC search_path | Empty | Empty |
| Checkout RPC EXECUTE for anon | Denied | Denied |
| Checkout RPC EXECUTE for authenticated | Denied | Denied |
| Checkout RPC EXECUTE for service_role | Allowed | Allowed |

The production checkout RPC has the expected baseline text required by migration `20261108081229`, and the RPC's current owner and execution grants match staging. This makes the migration's guarded function-replacement precondition appear satisfied. It does not prove a production migration is safe in every respect and does not authorize applying it.

The production media count is currently below the eight-image limit. Migration `20261107193017` creates a row-locking trigger to serialize concurrent inserts for a product. Migration `20261108060625` adds the missing `checkout_idempotency(order_id)` index. Migration `20261108081229` adds database-boundary checks for null/non-array/empty/oversized carts, non-object cart lines, and duplicate variant lines.

**Required before production catch-up:** review all three exact migration files, confirm a verified backup/export and restore plan, schedule a low-traffic maintenance window, obtain explicit owner approval, apply one reviewed migration batch, then re-check migration history, trigger/index/function definition and grants. Run checkout tests only in staging; do not create production test orders or customer fixtures.

## 12. Cloudflare Worker build-check investigation

Cloudflare's GitHub integration posted a failed Worker build for PR #154's documentation-only commit `a9a6f1bf3e57c78ce212f39a9452aecc3de4dd3d` (build ID `c656a851-532b-4e55-a8c9-7907ea6e1b76`). Similar failed Worker build notifications exist on PR #153 commits that do not change Worker source. This suggests the check may be triggered by the repository integration/build configuration independently of changed Worker files; it does not establish the underlying build error.

The connected tools could not access the authenticated Cloudflare build log. Do not infer the cause or change the Worker build command blindly. Inspect the linked build's full log in Cloudflare Dashboard, confirm the configured repository, production/staging environment, root directory, build command, deploy command, and branch filters. If the Worker service is intended to deploy only from `main`, ensure pull-request builds are validation-only and cannot deploy production. Record the exact error before changing configuration.
