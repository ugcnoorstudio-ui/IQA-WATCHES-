# IQA WATCHES — Cloudflare Pages deployment

## Target architecture
- Source repository: `ugcnoorstudio-ui/IQA-WATCHES-`
- Production source branch: `main`
- Frontend hosting: Cloudflare Pages
- Temporary production hostname: `https://iqa-watches-storefront.pages.dev/`
- Current fallback hosting: GitHub Pages (kept until Cloudflare live verification passes)
- Site type: static HTML/JavaScript; root `index.html` is the Pages entry point.
- Build command: `exit 0`
- Build output directory: `.` (repository root)
- Deployment mode: Wrangler Direct Upload from a test-gated GitHub Actions workflow.

A custom domain is **not required**. Do not purchase or configure `iqawatches.in` in this phase.

## Automated deployment
The workflow `.github/workflows/deploy-cloudflare-pages.yml` runs on every push to `main` and can also be manually dispatched. It performs JavaScript syntax checks, all Node regression tests, desktop/mobile Playwright tests, creates the Pages project through the Cloudflare API if it does not exist, deploys the tested repository root with Wrangler, and runs the public health monitor against the `pages.dev` production hostname.

Only these GitHub repository Actions secrets are required:

- `CLOUDFLARE_API_TOKEN`: Cloudflare API token with **Pages Write** permission.
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account ID.

Never paste API tokens into chat, source files, commit messages, or workflow YAML. Add them directly in GitHub **Settings → Secrets and variables → Actions**. The workflow creates a Pages project named `iqa-watches-storefront` automatically if it does not already exist.

## Deployment design choice
This repository uses Wrangler Direct Upload so production deployment can be explicitly gated by the repository's full test suite. Cloudflare does not allow a Git-integrated Pages project to later switch to Direct Upload, so the workflow creates/uses its own Direct Upload project. The separate existing Cloudflare Workers build integration named `iqa-watches` is not the Pages production site and is not modified by this workflow.


## Pull-request previews and environment isolation

The workflow `.github/workflows/deploy-cloudflare-pages.yml` runs the full syntax, Node regression, desktop Chromium and mobile Chromium suite on every pull request targeting `main`.

For same-repository pull requests, a successful test gate deploys a unique preview at:

`https://pr-<PR-number>.iqa-watches-storefront.pages.dev/`

Before upload, the preview artifact replaces `admin/backend-config.js` with a deliberately invalid Supabase endpoint. This keeps preview authentication and data mutations disconnected from the production Supabase project. Forked pull requests run tests but do not receive Cloudflare secrets or preview deployments.

Production deployment is separate: only a push to `main` (or a manual dispatch from `main`) can run the production deployment job. The preview deployment job is skipped on production pushes.

## Rollback procedure

Cloudflare Pages keeps successful production deployments available as rollback targets. Preview deployments are not valid rollback targets.

1. Open Cloudflare Dashboard → **Workers & Pages** → **iqa-watches-storefront** → **Deployments**.
2. In **All deployments**, identify the previous successful **Production** deployment for branch `main`. Check its commit and deployment time before selecting it.
3. Open that deployment's three-dot menu and choose **Rollback to this deployment**.
4. Review the confirmation and confirm the rollback. Cloudflare immediately changes the production deployment to the selected version.
5. Open `https://iqa-watches-storefront.pages.dev/` and `/admin/`, then run **GitHub → Actions → IQA WATCHES recurring public health monitor → Run workflow**. Confirm all public routes, Supabase public configuration and the Cloudinary catalogue pass.

Do not select a Preview deployment as a rollback target. A rollback changes the live Pages deployment; it does not move the GitHub `main` branch backwards. Fix the source on a new pull request before the next production push.

## Release safety
- Cloudflare deployment runs only after all preflight tests pass.
- GitHub Pages remains available until the Cloudflare live monitor passes.
- Do not change the production link or Supabase OAuth redirect allow-list until Cloudflare live verification passes.
- Do not purchase a domain or add paid Cloudflare features.
- Do not delete old Supabase Storage assets.
- After Cloudflare production verification passes, the Pages hostname becomes the temporary production URL; custom-domain binding is deferred.
