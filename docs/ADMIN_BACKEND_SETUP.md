# IQA WATCHES admin and catalogue setup

## Active environment

- Public storefront and static admin shell are hosted on GitHub Pages.
- The live frontend configuration in `admin/backend-config.js` points to the Supabase project **IQA WATCHES INDIA** in `ap-south-1` (project ref `nyhyfdququxnorqlnnqq`).
- A separate earlier project named **IQA WATCHES** (`ufidhdcwelaqtqrgeszy`) still exists. It is not the project configured by the current storefront/admin. Do not switch the frontend key or project URL without a planned migration.
- Supabase Auth is connected to the admin shell. Public signup is disabled.
- The Owner staff profile is active in the configured project. Passwords are never stored in this repository or shared in chat.
- Browser code uses only the public publishable key. Service-role/secret keys remain server-side.

## Current implementation

- The admin supports Owner login, products, categories and brands, image upload/gallery, inventory, and a separate Owner publication action.
- Product creation creates a draft product and initial variant/stock through the JWT-verified `iqa-admin-mutate` Edge Function.
- Category and brand assignment, product-media metadata, and publication are separate Owner-authorized actions. The database validates the actor independently, checks request idempotency, and writes audit events.
- Publishing requires an active category and brand, a primary image, an active priced variant with available stock, an MRP/price check, and a reasoned Owner approval. It sets the product to published, non-sample and verified-sellable only after those checks.
- The public storefront reads only published, verified products with at least one active variant that has available stock. It reads only approved public columns; internal stock counts and publication flags are not exposed to anonymous visitors.
- Product images are delivered from the public `product-images` bucket. The bucket accepts JPEG, PNG, WebP and AVIF up to 5 MiB. Upload, overwrite and delete are Owner-only through Storage RLS.
- The Edge Function is ACTIVE at version 4 with platform JWT verification enabled. It verifies the Supabase Auth user and forwards only allow-listed operations through service-role-only RPCs.
- No catalogue records have been seeded. Products, variants, categories, brands and media are currently empty.

## Admin access

- Admin URL: https://ugcnoorstudio-ui.github.io/IQA-WATCHES-/admin/
- Sign in with the existing Owner account and the password set by the account owner.
- Do not create a public owner-signup route. Staff invitations and role changes must be owner-authorized server operations with audit records.
- If sign-in fails, verify the Auth user, email confirmation, matching `staff_profiles.user_id`, `active = true`, and allowed redirect/origin settings. Never put a password in chat.

## Architecture and security

1. GitHub Pages hosts the public storefront and static admin shell.
2. Supabase Auth handles identity; PostgreSQL is authoritative for catalogue and inventory.
3. RLS is enabled on exposed business tables. Anonymous users can read only the public catalogue fields and rows; authenticated staff reads require active staff roles.
4. Browser roles have no broad business-table write access. Product and inventory writes go through the authenticated Edge Function and service-role-only database functions.
5. The `private.iqa_is_public_product` predicate is in the non-exposed `private` schema and is used only by catalogue RLS policies. Its limited execution permission is required for those policies.
6. Payment, courier, email and OAuth secrets must remain in server-side provider secrets. Never put a service-role key in browser JavaScript.

## Remaining before production

1. Enable leaked-password protection in Supabase Auth and review password strength/session lifetime.
2. Configure MFA for the Owner and other staff; test recovery and session revocation.
3. Enter genuine product, supplier, price, image and warranty information. Do not publish until it is verified.
4. Exercise the authenticated Owner product-create, upload, taxonomy and publish flow end-to-end with a real product.
5. Design and review least-privilege policies for the remaining 17 RLS-enabled tables. They currently have no policies and remain inaccessible to browser roles.
6. Implement and test customer, order, payment, refund, shipping, returns, support and staff-invitation workflows before enabling checkout.
7. Configure backups, monitoring, rate limits, recovery drills, legal/business details and support contacts.

## Costs

No paid add-on or new paid infrastructure was enabled as part of this implementation. The current plan, usage and possible billing were not checked; verify them in the Supabase dashboard before launch. GitHub Pages remains the static host and does not provide a private application server.
