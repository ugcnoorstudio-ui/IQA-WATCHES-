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

## IQA WATCHES project owner onboarding (project ref: ufidhdcwelaqtqrgeszy)

The repository now includes an admin sign-in gate (admin/admin-auth.js) and a public configuration placeholder (admin/backend-config.js). The admin stays locked until a valid publishable key is configured and the signed-in user has an active staff profile.

### Create the first owner account

1. Open the [IQA WATCHES Supabase Authentication users page](https://supabase.com/dashboard/project/ufidhdcwelaqtqrgeszy/auth/users).
2. Choose Add user / Invite user and invite the business owner's email address. Complete the email invitation and set a password using Supabase's trusted Auth flow. Do not share the password in ChatGPT or commit it to GitHub.
3. After the invited user has accepted and appears in Authentication → Users, copy that user's UUID (Auth user ID).
4. Open the Supabase SQL Editor for this project and run the following statement after replacing the UUID with the verified Auth user ID:

```sql
insert into public.staff_profiles (user_id, display_name, role, active)
values ('REPLACE_WITH_AUTH_USER_UUID', 'IQA WATCHES Owner', 'owner', true)
on conflict (user_id) do update
set display_name = excluded.display_name, role = 'owner', active = true, updated_at = now();
```

Owner assignment must be done by the trusted project owner in Supabase SQL Editor; never expose a browser endpoint that lets a user assign their own role.

### Configure the browser-safe key

1. In Project Settings → API Keys, copy the publishable key (starts with sb_publishable_). Do not copy a secret key or service_role key.
2. Replace YOUR_SUPABASE_PUBLISHABLE_KEY in admin/backend-config.js with that publishable key. The key is public in the static website; database RLS is the security boundary.
3. Set Supabase Auth Site URL and Redirect URLs to https://ugcnoorstudio-ui.github.io/IQA-WATCHES-/.
4. Deploy the branch only after reviewing the PR. Test login with the owner account and confirm inactive/non-staff users are denied.

### Current status

The admin page now has a login form and session gate, but the publishable key remains a placeholder and no owner profile is provisioned yet. Login cannot succeed until the owner invitation is accepted, the profile row is assigned by the trusted SQL Editor, and the publishable key is configured. This is a deliberate fail-closed state.

### Session identity verification hardening

The admin adapter now calls Supabase Auth `getUser()` before reading the matching `staff_profiles` row. This verifies the access token with the Auth service instead of treating locally persisted session data as the identity authority. The UI also rechecks the staff profile when the tab regains focus and locks on sign-out. These browser checks improve the UX but do not replace RLS or server-side authorization.

### Current security-advisor interpretation

- The 17 RLS-enabled tables without policies are intentionally deny-by-default while their role-specific access model and server-side workflows are unfinished. Do not add blanket authenticated policies to silence the advisor.
- The three staff helper functions are SECURITY DEFINER because they read the protected `staff_profiles` table for RLS predicates. Anonymous EXECUTE is revoked; authenticated EXECUTE remains intentionally required by staff policy checks. Their bodies are restricted to the caller's `auth.uid()`, and the functions use a fixed search_path. Keep reviewing them before adding new privileged functions.
