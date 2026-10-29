# NOOR WATCHES — secure admin backend integration

## What the repository currently contains

- `admin/index.html`, `admin/admin.css`, and `admin/admin.js` are an explicitly labelled, non-persistent admin preview.
- The existing Supabase migration creates the store schema and enables row-level security (RLS). It intentionally revokes browser access to business tables until reviewed policies and server-side operations are added.
- The storefront is static GitHub Pages. GitHub Pages can host the UI, but it does not provide a private application server or protect secrets.

## Added scaffold

- `admin/backend-config.example.js`: placeholders only.
- `admin/backend.js`: fail-closed Supabase JS v2 authentication/profile adapter, plus a read-only allow-listed helper.
- These files are not loaded by the current preview yet. This is intentional: activating a half-configured login or data path could break the existing storefront or accidentally expose data.

## Required setup before connecting

1. Create/select the private Supabase project intended for NOOR WATCHES. Do not send credentials through chat or commit them to GitHub.
2. Review and apply `supabase/migrations/202610290001_secure_store.sql` in that project. Back up any existing database first; do not apply the starter migration blindly to a populated database.
3. Create the owner account through Supabase Auth using a trusted setup process. Set the matching `staff_profiles` row to the owner role and `active = true` using the Supabase SQL editor or a trusted server-side administrative process. Never allow a browser client to assign its own role.
4. Copy `admin/backend-config.example.js` to `admin/backend-config.js` and replace the placeholders with the project's HTTPS URL and publishable/anon key. The publishable/anon key is not a secret, but it is safe in a browser only when RLS is correct. Never use a `service_role` key in the website.
5. Load Supabase JS v2, then `backend-config.js`, then `backend.js` from the admin page. Add a login screen and session guard before rendering protected workspaces. Keep the preview clearly labelled until the login path is verified.
6. Add narrow database RLS policies per table and role. The current migration intentionally denies business-table access; reads will fail until those policies exist. For orders, refunds, staff management, audit logs, and integrations, prefer reviewed server-side functions/Edge Functions with explicit authorization and audit logging.
7. Validate all writes server-side: role, allowed state transitions, amount/stock constraints, reason fields, and idempotency. Never trust UI role checks as the authorization boundary.
8. Configure Auth redirect URLs for the exact GitHub Pages origin, email confirmation/recovery, rate limits, MFA for privileged staff where available, session expiry, monitoring and backup/restore tests.
9. Run negative tests: logged-out access, inactive staff, support staff attempting owner operations, anonymous table reads, role self-escalation, and cross-customer access must all be denied.

## Important limitations

This scaffold does not connect to a live Supabase project, load real records, or enable write actions. The project URL/key and an approved authorization model are not available in the repository. Do not remove the preview banner or claim the admin is production-ready until configuration, RLS, server operations, and tests are complete.

## GitHub deployment

GitHub is the version-control/deployment source for the static site, not the database. A merge to the deployed branch can publish static UI changes through GitHub Pages; it cannot create a Supabase project, configure its secrets, or apply database permissions automatically.
