# IQA WATCHES — 3D / Cinematic Motion Repository Audit

Audit date: 2026-10-30
Audited branch: main
Starting commit: 5adc3988fdeaa6332fbdb4d894e90309dfea39f8
Working branch: feature/cinematic-3d-motion-engine

## Identity and scope decision
The live repository, page metadata, header, footer, dedicated routes and authenticated admin are branded IQA WATCHES. The supplied creative brief says NOOR WATCHES, but the user's more recent explicit correction identifies the company as IQA WATCHES. This implementation therefore applies the NOOR WATCHES engineering brief to the IQA WATCHES product identity without silently renaming the company.

## Existing architecture
- Static GitHub Pages storefront: index.html, with inline CSS and JavaScript.
- Dedicated hash-routed customer views: routes.js.
- Admin shell: admin/index.html, admin/admin.css and admin/admin.js.
- Authentication adapter: admin/auth.js and admin/backend.js, using Supabase JS v2 and a public publishable key only.
- Supabase schema and security migrations: supabase/migrations/.
- Existing motion reference: docs/MOTION_SYSTEM.md.
- No package manifest or build pipeline is present in the inspected repository; the current deployment is static.
- No Three.js/WebGL dependency, GLB/GLTF product model, licensed watchmaking footage, video asset pipeline or configured video-generation provider was found in the audited tree.

## Existing customer features observed
- Product grid with sample catalogue, search, brand/category/price filters and sorting.
- Product detail modal, local preview cart and wishlist.
- Watch Finder, product comparison and wrist-size helper.
- Hash-routed collection views, product views, finder, comparison, wishlist, bag, story, care, contact, journal and policy routes.
- Newsletter is explicitly preview-only; checkout and order creation are disabled.
- Product data is explicitly marked as sample / not for sale. This must remain clear until verified sellable product records exist.

## Existing admin and backend boundaries
- Supabase Auth sign-in checks active staff_profiles and an allow-listed staff role.
- Admin UI workspaces are explicitly labelled preview-only; forms do not persist records.
- Browser backend adapter reads a small allow-list of tables; no browser service-role key exists.
- Existing security baseline is deny-by-default. Most operational business-table policies and privileged write workflows are intentionally not configured.
- AI/video provider integrations are not connected in the inspected repository. No paid generation should be attempted without explicit approval.

## Motion / media findings
- Existing CSS motion tokens and reduced-motion rules exist in index.html and admin/admin.css.
- Existing IntersectionObserver enhancement is progressive and leaves content visible on observer failure.
- Homepage currently has a static hero image and editorial imagery; there is no actual 3D renderer or scroll-synchronised watchmaking film.
- Existing images are general editorial/sample imagery and must not be represented as actual IQA WATCHES manufacturing footage or exact product geometry.

## Implementation map
| Proposed addition | Existing related surface | Additive integration | Fallback / safeguards |
|---|---|---|---|
| Cinematic scroll story | Homepage after existing editorial/hero content | New isolated section and dedicated CSS/JS files | Existing imagery labelled illustrative; content remains readable without JS; skip-story link; reduced-motion mode |
| Scroll progress and scene choreography | Existing IntersectionObserver and CSS tokens | Small vanilla JS module, no new animation dependency | No pinned trap; observer/scroll listeners passive; stop work when hidden |
| 3D viewer | Product modal / product routes | Deferred module only after verified GLB assets and asset rights are supplied | Static gallery remains authoritative; do not fake 3D with a flat image |
| Exploded-view model | Product detail | Requires actual component geometry and mechanical review | Not implemented until product-specific CAD/GLB assets are available |
| Motion & Experience Studio | Existing authenticated Admin navigation and preview workspaces | New admin route/module; clearly report unconfigured integrations | Existing Supabase role checks remain; no fake save/publish; Admin-only shell |
| AI storyboard / video workflows | Admin creative workflow | Provider-neutral brief/asset-review workflow scaffold | Provider connection, API documentation, usage rights and paid-credit approval required |
| Asset library / approval | Supabase migration architecture | Separate migration only after schema/role/data-retention review | No broad RLS grants; no secrets in browser; no auto-publishing |

## Files proposed for this additive phase
- docs/3D_MOTION_AUDIT.md — this audit and implementation map.
- assets/cinematic-story.css — isolated cinematic story styling.
- assets/cinematic-story.js — progressive-enhancement scroll choreography.
- admin/motion-studio.js — authenticated admin-only preview workflow surface.
- Small additions to index.html and admin/admin.js/admin/index.html to load and expose the modules without replacing existing features.

## Non-goals for this phase
- No site-wide framework migration.
- No replacement of the current catalogue, cart, wishlist, Finder, comparison, routes or auth.
- No fabricated product CAD, mechanical internals, manufacturing footage, inventory, AI output, provider connection or publishing success.
- No production checkout/payment activation.
- No new broad database policies.

## QA plan
- Static syntax checks for new JavaScript.
- Verify all new DOM selectors are guarded and modules fail open without blocking the original site.
- Verify reduced-motion CSS and keyboard-accessible skip/navigation.
- Verify narrow viewport layout and no horizontal overflow by code inspection; live browser/device measurements remain pending.
- Verify GitHub Pages deployment only after the feature branch is reviewed and merged.
- Run Lighthouse / axe and Core Web Vitals on the deployed page before claiming measured performance.

## Current status at audit
- Repository and main branch verified through GitHub.
- Existing main commit and backup branches inspected.
- Feature branch created from the exact main starting commit.
- No production files changed on main.
- Browser/device QA and live deployment verification have not yet been performed.
