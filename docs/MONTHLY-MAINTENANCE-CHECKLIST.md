# IQA WATCHES — Monthly Maintenance Checklist

Run this checklist monthly and record date, owner, evidence link, and unresolved items in the team's private operations log. Do not include secrets or unnecessary customer data.

## Code and release safety
- [ ] Review open pull requests and require all mandatory CI/browser checks to pass.
- [ ] Review Dependabot and GitHub security/secret-scanning alerts.
- [ ] Update dependencies in a focused PR; retain lockfiles and test before merge.
- [ ] Confirm main branch protection, required checks, and MFA for maintainers.
- [ ] Review Cloudflare Pages/Workers deployment history and keep a known-good rollback target.
- [ ] Verify preview deployments are isolated from production credentials and data.

## Database and customer data
- [ ] Confirm staging and production project identities before maintenance.
- [ ] Review Supabase security, performance, and health advisors.
- [ ] Review RLS policies, grants, SECURITY DEFINER functions, and staff access changes.
- [ ] Review migration parity and document any approved production migration.
- [ ] Confirm backup schedule, retention, export location, and last successful restore drill.
- [ ] Run a restore test in an isolated environment; never overwrite production for a drill.
- [ ] Review data access/correction/export/deletion requests and retention exceptions.
- [ ] Review audit logs for unusual admin or inventory changes.

## Catalogue, stock, orders
- [ ] Verify published products have accurate descriptions, prices, variants, stock, images, and warranty wording.
- [ ] Check that out-of-stock/unapproved products are not publicly sellable.
- [ ] Reconcile orders, payment records, cancellations, refunds, and inventory movements.
- [ ] Review failed checkout/idempotency events and stock reservation expiry/release.
- [ ] Verify no customer order is marked paid solely from a browser return URL.
- [ ] Review supplier invoices and authenticity/warranty records for branded products.

## Media and delivery
- [ ] Check Cloudinary image delivery, transformations, responsive sizes, and broken-image rates.
- [ ] Export an asset inventory and retain originals according to the business retention policy.
- [ ] Audit legacy Supabase Storage objects before any proposed cleanup; do not delete without explicit approval.
- [ ] Verify delivery charges, COD coverage, serviceability, and shipping promises only against approved current settings.

## Security and reliability
- [ ] Verify MFA/2FA and remove obsolete staff/provider access.
- [ ] Review Supabase Auth settings, leaked-password protection, OAuth redirects, and OTP abuse controls.
- [ ] Review Cloudflare WAF, TLS, security headers, and rate-limit events.
- [ ] Review Sentry errors and Better Stack uptime/incidents if those services have been approved and configured.
- [ ] Verify alert routing reaches an accountable owner.
- [ ] Review provider usage and budget alerts; do not upgrade paid plans without owner approval.

## SEO, analytics, accessibility, performance
- [ ] Validate sitemap, robots.txt, canonical URLs, metadata, and structured data against real approved products.
- [ ] Review Search Console indexing and crawl errors once configured.
- [ ] Review GA4/Clarity events and privacy/consent configuration once configured.
- [ ] Run representative mobile Lighthouse and accessibility checks; track regressions rather than treating a score as a guarantee.
- [ ] Keyboard-test navigation, forms, gallery, cart, checkout, and visible focus/error states.

## Business and compliance
- [ ] Confirm public business identity, support and grievance contacts, GST/invoice applicability, and policy revision dates.
- [ ] Review privacy, terms, shipping, returns/exchanges, refunds/cancellations, and warranty wording with qualified professionals.
- [ ] Verify customer consent and approved templates before marketing email/SMS/WhatsApp messages.
- [ ] Review brand authorization, supplier invoices, authenticity, serial-number, and warranty-card records.
- [ ] Review open customer complaints, returns, chargebacks, and COD RTO trends.

## Evidence to retain
- [ ] Date and reviewer.
- [ ] Git commit / release and CI run links.
- [ ] Supabase advisor output and migration parity.
- [ ] Backup/restore evidence.
- [ ] Uptime/performance/accessibility evidence.
- [ ] Issues created for unresolved findings, with owner and due date.

**Do not mark a checklist item complete without dated evidence.**
