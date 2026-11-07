# IQA WATCHES — Cloudflare Pages deployment

## Target architecture
- Source repository: `ugcnoorstudio-ui/IQA-WATCHES-`
- Production source branch: `main`
- Frontend hosting: Cloudflare Pages
- Current fallback hosting: GitHub Pages (kept until Cloudflare production verification passes)
- Site type: static HTML/JavaScript; root `index.html` is the Pages entry point.
- Build command: `exit 0`
- Build output directory: `.` (repository root)

A custom domain is **not required** for this phase. Cloudflare Pages provides a `<project>.pages.dev` hostname after the project is created and deployed. Do not purchase or configure `iqawatches.in` as part of this phase.

## Deployment workflow
The workflow at `.github/workflows/deploy-cloudflare-pages.yml` is intentionally manual and main-only. It runs JavaScript syntax checks, all Node regression tests, desktop/mobile Playwright tests, deploys the root static site with Wrangler, and then runs the public health monitor against the Pages hostname.

Before dispatching the workflow, create the Cloudflare Pages project in the Cloudflare dashboard and configure these GitHub repository settings:

### Actions secrets
- `CLOUDFLARE_API_TOKEN`: Account API token with Cloudflare Pages Edit permission.
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account ID.

### Actions variable
- `CLOUDFLARE_PAGES_PROJECT`: exact Pages project name created in the dashboard. This determines the `https://<project>.pages.dev/` verification URL.

Never paste API tokens into chat, source files, commit messages, or workflow YAML. Add them directly in GitHub **Settings → Secrets and variables → Actions**.

## First-time Cloudflare Pages project setup
1. In Cloudflare, open **Workers & Pages → Create application → Pages → Connect to Git**.
2. Connect the GitHub account and select `ugcnoorstudio-ui/IQA-WATCHES-`.
3. Use `main` as the production branch, root directory `/`, build command `exit 0`, and output directory `.`.
4. Complete the initial setup. The Pages project will receive a `*.pages.dev` hostname.
5. In **Settings → Builds → Branch control**, disable automatic **production branch** deployments so a merge cannot bypass the repository's test gate. Keep preview branch deployments enabled for pull-request previews.
6. Add the GitHub Actions secrets and variable listed above.
7. Review the `deploy-cloudflare-pages.yml` workflow and manually run it from `main`. It performs a full test gate before deploying and checks the live Pages hostname afterwards.

Cloudflare's Git integration and Wrangler Direct Upload cannot be switched between later for an existing project. This repository uses a Git-connected Pages project for previews and Wrangler for an explicit, test-gated production deployment; do not create a Direct Upload project instead.

## Release safety
- Keep GitHub Pages available until Cloudflare's live monitor passes against the Pages URL.
- Do not change the production link, Supabase OAuth redirect allow-list, or custom-domain DNS during the no-domain phase.
- Do not delete old Supabase Storage assets.
- Do not add paid Cloudflare features without explicit approval.
- After Cloudflare production verification passes, the Pages hostname becomes the temporary production URL; custom-domain binding is deferred.
