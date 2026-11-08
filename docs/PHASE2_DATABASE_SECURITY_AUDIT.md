# IQA WATCHES — Phase 2 Database & Security Audit

Audit date: 2026-11-08
Scope: Connected Supabase Staging and Production projects, checked-in migrations, security baseline and Supabase Advisors.
Staging project: `qcxgsomqxfoueootxzpv`
Production project: `nyhyfdququxnorqlnnqq`

## Executive result

The live database baseline is substantially hardened. The read-only Phase 2 SQL acceptance script passed in both environments. After review, the three Staging migrations were applied to Production using the connected Supabase migration tool and verified in the live schema. No customer/order data was modified and no Auth configuration change was made.

Staging and Production now each report 42 migration records and the same 42 migration names. Supabase recorded the three Production-applied migrations under provider-generated versions `20261108134447`, `20261108134449` and `20261108134452`, while Staging retains the original migration versions. This timestamp difference is documented; the migration files in PR #153 must remain replay-safe before they are merged or run by a future CLI push.

Phase 2's database migration catch-up is complete. Production Auth leaked-password protection is still disabled, and provider-side session/password configuration cannot be changed through the connected Supabase tools. Those are remaining release blockers.

## 1. Verified database controls

Both Staging and Production returned the following:

- 26/26 tables in the `public` schema have Row Level Security enabled.
- No public table was found with RLS disabled.
- No public views currently exist.
- The `anon` role has no table-level or column-level write grants in `public`.
- Authenticated write grants are limited to customer self-service operations: customer address management, own customer profile maintenance, return-request creation, review submission and support-ticket creation. RLS and column-level grants remain the enforcement boundary.
- `anon` and `authenticated` do not have superuser or `BYPASSRLS` privileges.
- `checkout_idempotency` has RLS enabled, no browser-facing policy and no browser-role table grants. It is intentionally restricted to trusted server-side database operations; the Advisor's no-policy notice is expected for this table.
- No unexpected public `SECURITY DEFINER` function is executable by browser roles.

## 2. Reviewed SECURITY DEFINER exception

The public RPC `public.iqa_cancel_customer_order(uuid)` is executable by `authenticated` users and therefore appears in the Supabase Security Advisor warning `authenticated_security_definer_function_executable`.

The live function was inspected in both environments. It is an intentional customer-facing cancellation RPC and:

1. Requires a non-null `auth.uid()`.
2. Resolves the caller's own customer record.
3. Selects the requested order only where its `customer_id` matches that customer.
4. Allows only the supported pending/confirmed COD cancellation states and rejects paid/non-COD orders.
5. Locks the order and each affected variant with `FOR UPDATE`.
6. Verifies reserved stock before releasing it.
7. Writes the cancelled order state and an order-status audit event.
8. Uses an empty `search_path`.

The function is retained because the customer portal needs the operation. Its Advisor warning is documented as a reviewed exception, not suppressed or blindly “fixed” by removing customer functionality. The SQL acceptance script checks these invariants.

The `private.iqa_is_public_product(uuid)` helper is also SECURITY DEFINER, but lives in the non-exposed `private` schema and is used by public catalogue RLS predicates. Its narrow execution grant is intentional.

## 3. Advisor findings and treatment

### Security

- Both environments report one `rls_enabled_no_policy` INFO finding for `public.checkout_idempotency`. This is intentional: RLS is enabled and browser roles have no grants.
- Both environments report the reviewed authenticated SECURITY DEFINER customer-cancellation RPC described above.
- Production additionally reports `auth_leaked_password_protection`: leaked-password protection is disabled. This must be enabled in Supabase Dashboard → Authentication → Settings / Password Security before production customer accounts are treated as launch-ready. The connected tools do not expose this Auth configuration setting, so it was not changed here.
- Staging did not return the leaked-password protection warning.

### Performance

- Unused-index findings are informational while the catalogue and operational tables have little/no production-like traffic. Do not drop indexes solely from this snapshot.
- Multiple permissive SELECT policy warnings reflect separate customer-owner and staff-owner access paths. Do not combine or delete policies without proving the equivalent role matrix and row predicates.
- The `checkout_idempotency.order_id` index is now present in both environments after the Production catch-up. Re-run Advisor after representative traffic before considering any index removal.

## 4. Migration parity

Live migration history after the approved catch-up:

- Staging: 42 migration records.
- Production: 42 migration records.
- Both environments contain the same 42 migration names.

The three migrations applied to Production were:

1. `enforce_eight_product_images` — recorded as version `20261108134447` in Production; Staging version `20261107193017`.
2. `index_checkout_idempotency_order_id` — recorded as version `20261108134449` in Production; Staging version `20261108060625`.
3. `harden_checkout_rpc_payload` — recorded as version `20261108134452` in Production; Staging version `20261108081229`.

The live schema was re-queried after application: the eight-image trigger exists, the checkout `order_id` index exists, and the checkout RPC rejects null/non-array/empty payloads, non-object cart entries and duplicate variant lines. Both environments passed the read-only security acceptance script. No production customer/order rows were changed.

**Migration-ledger caution:** The migration tool recorded new Production version timestamps rather than copying Staging's historical version IDs. PR #153 migration files must be replay-safe before merge; the checkout hardening migration is being updated to recognize an already-hardened function and skip safely rather than failing its baseline-text guard.

## 5. Authentication and authorization rules retained

- Authorization decisions must never depend on user-editable `raw_user_meta_data`.
- Staff role and active status come from the protected `staff_profiles` model and trusted server-side checks.
- Public browser clients use publishable keys only. Service-role/secret keys remain server-side.
- Any new exposed table needs explicit API exposure/grants and RLS review; RLS alone does not grant Data API access.
- Any new view exposed to browser roles must use `security_invoker = true` unless a narrowly scoped exception is separately reviewed.
- Any new SECURITY DEFINER function must have a reviewed owner, fixed/empty search_path where possible, narrowly granted EXECUTE permissions, explicit identity/ownership checks and regression coverage.
- Customer update policies must include both `USING` and `WITH CHECK`.
- Session expiry, account recovery, data export/deletion and MFA enforcement still require dedicated product/security acceptance before launch.

## 6. Test evidence

The read-only SQL script at `supabase/tests/security_baseline.sql` passed against both connected projects on 2026-11-08. It checks:

- RLS on every public table.
- No anonymous write grants.
- Narrow authenticated write grants.
- Browser isolation of checkout idempotency.
- Customer cancellation RPC execution grants, empty search_path, caller/order ownership, COD checks, row locks, stock release and audit event.
- No unexpected browser-executable public SECURITY DEFINER functions.
- No browser-role BYPASSRLS privileges.

The script is read-only and creates no fixtures or database objects.

## 7. Phase 2 exit checklist

- [x] Audit all 26 public tables in both environments for RLS.
- [x] Audit browser write grants and the private checkout-idempotency boundary.
- [x] Review the authenticated SECURITY DEFINER cancellation RPC and preserve its ownership/COD checks.
- [x] Run the read-only SQL security acceptance script in Staging and Production.
- [x] Record Advisor findings and distinguish intentional warnings from remediation items.
- [x] Apply the three reviewed migrations to Production and verify the resulting schema and 42 migration-name parity.
- [ ] Keep PR #153's migration files replay-safe for the differing Production version IDs before merging; do not run a blind CLI push.
- [ ] Enable Production leaked-password protection in Supabase Auth settings and verify the setting.
- [ ] Verify session-expiry, recovery, MFA and privacy-request flows before launch.

**Phase 2 status: database/RLS audit, security acceptance tests and Production migration catch-up completed. Production leaked-password protection and session/recovery/MFA/privacy-flow acceptance remain open.**
