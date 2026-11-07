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

## Release safety
- Cloudflare deployment runs only after all preflight tests pass.
- GitHub Pages remains available until the Cloudflare live monitor passes.
- Do not change the production link or Supabase OAuth redirect allow-list until Cloudflare live verification passes.
- Do not purchase a domain or add paid Cloudflare features.
- Do not delete old Supabase Storage assets.
- After Cloudflare production verification passes, the Pages hostname becomes the temporary production URL; custom-domain binding is deferred.
