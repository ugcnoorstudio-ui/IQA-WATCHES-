# IQA WATCHES — Phase 4 execution notes

## Scope agreed for Phase 4

Phase 4 covers the Admin Panel/backend and the customer-facing homepage/storefront.

### Admin/backend
- Owner-authenticated product create, edit, taxonomy, media/gallery and publication workflows.
- Inventory visibility and reason-required stock adjustments.
- Verify database consistency, server-side authorization, audit logging and safe failure behavior.
- Keep customer/order/payment/refund/shipping/staff operations disabled unless their individual backend workflows and RLS permissions are verified.
- Preserve Cloudinary as the product-image upload/delivery path; do not reintroduce Supabase Storage image writes.
- Improve Admin usability, mobile navigation, form feedback and accessibility.

### Homepage/storefront
- Review hero, campaign/story sections, collection/category presentation and product cards.
- Verify navigation, search, filters, product detail and gallery behavior.
- Check desktop/mobile responsiveness, image performance, keyboard access and reduced-motion behavior.

## Phase 4 initial audit and fix

- The Owner product editor pre-filled the product description and audience from IQA_ADMIN_PRODUCT_CACHE.
- The products query did not select description or audience, so those fields were absent from the cache and the editor opened with blank values. Saving an edit could therefore overwrite existing product details unintentionally.
- Fixed the products read query to include both description and audience.
- Updated the Admin page's admin.js cache-buster to 20261106-phase4-product-editor.
- Added regression tests for editor field completeness, publication-state isolation and authenticated admin-shell visibility.

## Safety boundaries

- No live product records were edited by this code change.
- No product, customer, order or staff records were created or deleted.
- No Supabase Storage objects, policies or bucket settings were modified.
- No service-role key or provider secret is placed in browser code.
- Product publication remains a separate Owner-approved action; editing descriptive fields does not publish a product.
- Checkout/payment remains fail-closed until shipping and payment configuration are verified end-to-end.

## Completion gate

Phase 4 is not complete until its Admin/backend and homepage/storefront changes pass the repository CI suite, desktop/mobile browser tests and deployment, followed by a live production verification. Any workflow requiring real owner data or external provider credentials must be reported as blocked rather than represented as verified.
