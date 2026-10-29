# NOOR WATCHES owner bootstrap procedure

## Purpose
Provision exactly one initial active owner without exposing an owner-creation endpoint to the public website.

## Preconditions
1. Use the existing Mumbai Supabase project only.
2. Enable a secure Auth sign-in method in Supabase Auth (email/password with a verified mailbox, or an available supported method). Do not enable public staff self-registration.
3. Create the intended owner Auth user through the Supabase dashboard's Auth user management. Use a strong unique password and MFA where available.
4. Do not share passwords, access tokens, service-role keys or database credentials in chat or source control.

## Provision the owner profile
1. Copy the Auth user's UUID from the Auth user record in the dashboard.
2. As a trusted project database operator, execute:
   `select public.bootstrap_first_owner('<AUTH_USER_UUID>'::uuid, '<OWNER_DISPLAY_NAME>');`
3. The function rejects missing Auth users, invalid names, existing staff profiles, and any attempt after an active owner exists.
4. The function is SECURITY DEFINER with a fixed search_path and is not executable by PUBLIC, anon or authenticated. It must only be invoked by a trusted database operator, not from browser JavaScript or PostgREST.
5. Verify the resulting `staff_profiles` row through the dashboard SQL editor. Do not publish the user's UUID unnecessarily.

## Security rules
- Never add a public sign-up flow for staff.
- Staff roles are stored in `staff_profiles`, not user-editable Auth metadata.
- Only the owner should approve additional staff accounts and role assignments.
- The browser-side `requireRole` helper is UI gating only. Every privileged operation must independently verify the JWT, active staff profile and role on a trusted server/Edge Function.
- Do not grant browser table privileges simply to make admin screens populate.
- Do not create or activate an owner until the intended mailbox/account is confirmed by the project owner.

## Verification
- The bootstrap function exists in schema public.
- `prosecdef = true` and its search_path is fixed.
- No execute grants exist for PUBLIC, anon or authenticated.
- With no active owner, a trusted operator can bootstrap one existing Auth user.
- A second bootstrap attempt fails.
- A missing Auth UUID fails.
- The public browser roles cannot invoke the function.

This migration creates only the one-time trusted bootstrap mechanism. It does not create an Auth user, expose login, grant table CRUD, connect the admin UI, or make the store production-ready.
