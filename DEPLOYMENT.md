# IQA WATCHES — GitHub Pages deployment

## Source of truth
- Repository: `ugcnoorstudio-ui/IQA-WATCHES-`
- Production branch: `main`
- Hosting target: GitHub Pages (GitHub Actions)
- Build type: static site; the production entry point is the root `index.html`.

## Deployment
The workflow at `.github/workflows/deploy-pages.yml` validates the required storefront/admin entry files, uploads the repository root as the Pages artifact, and deploys it to GitHub Pages. A push to `main` or a manual workflow dispatch starts deployment.

## One-time repository setting
In GitHub, open **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**. This is a repository-level setting and is not changed by committing workflow files. The workflow needs the repository's Pages deployment permission.

## Verification after each release
1. Confirm the workflow run for the exact `main` commit completes successfully.
2. Open the published Pages URL and confirm the storefront loads.
3. Confirm `/admin/` loads the staff sign-in gate (not an authenticated session).
4. Check browser console/network for missing relative assets and confirm the page is served from GitHub Pages.
5. Confirm the deployed commit SHA matches the intended `main` commit.

Do not use Netlify as a production publishing target for this project.
