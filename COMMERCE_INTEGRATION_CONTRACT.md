# IQA WATCHES — Commerce integration contract (Phase 2)

Status: implementation contract for the customer storefront and protected admin workspace.

## One business system, two protected experiences

- Customer storefront: public browsing, product detail, recommendations, local shopping bag and customer-owned account features.
- Admin workspace: separate `/admin/` application, authenticated staff access and role-gated operations.
- Both experiences use the same Supabase project (`nyhyfdququxnorqlnnqq`) as the system of record. Do not duplicate the catalogue or create a second admin database.

## Catalogue-to-storefront connection

The storefront reads only products that are published, non-sample and explicitly verified sellable. It reads active product variants with available stock and product media from the shared catalogue. Admin changes to product publication, price, stock, images and specifications therefore drive what can appear in the storefront after catalogue refresh.

The public catalogue read is intentionally narrower than admin access. The browser must never receive a Supabase service-role/secret key. Admin-only settings and private operational data must not be queried directly from an anonymous browser session.

## Shopping bag and product experience

- Product cards open dedicated product routes.
- Product detail pages show the approved product image gallery, current catalogue price, published specifications and available stock.
- Recommendations are ranked using shared category, brand, style and audience attributes, and only include currently in-stock published products.
- Add-to-bag, quantity changes, remove and wishlist currently operate as browser-local preview state. They are not yet a server-reserved stock commitment or a submitted order.
- Customer sign-in can later sync a server-side cart only after the cart schema and customer ownership policies are reviewed.

## Orders and admin connection — Phase 2 implementation

The current database contains `orders`, `order_items`, `customers`, `product_variants`, order status and payment event tables. Admin staff policies permit role-authorized order operations, while customer policies restrict order reads to the authenticated customer. There is no public order-insert policy, and the existing Edge Functions are admin mutation, product image upload and admin health—not customer checkout.

Do not insert orders directly from browser code. Phase 2 now includes the authenticated `iqa-customer-checkout` Edge Function and `iqa_create_customer_order` database RPC. The endpoint is deployed with JWT verification enabled. It:

1. Validates the customer identity or a secure guest verification flow.
2. Re-reads product, variant, price and available stock from the database; never trusts client totals.
3. Reserves stock atomically and prevents overselling.
4. Creates one order and immutable product/price snapshots in a database transaction.
5. Uses an idempotency key to prevent duplicate orders on retries.
6. Writes order status events for the admin order-management workflow.
7. Returns only a safe order confirmation payload to the customer.
8. Leaves payment pending until a provider integration with signed webhook verification, refund and reconciliation support is configured.

The admin workspace must consume the same `orders` and `order_items` records created by this server-side flow. Existing owner-only RLS read policies allow the authorized owner workspace to read orders and items; no shadow order list or manually copied spreadsheet is acceptable.

The checkout endpoint is deliberately fail-closed: the `store_settings` table currently has no configuration rows. It returns HTTP 409 and creates no order until the owner configures a verified `shipping` record (`serviceable_pincodes`, `flat_shipping_fee`, `currency: INR`, optional `method` and `estimate_label`) and a `payments` record (`cod_enabled: true`). Online payment is not implemented. The current customer checkout UI requires sign-in and a saved address; guest checkout is not enabled.

## Delivery and payments

- `store_settings` is owner-readable, not publicly readable. The public storefront must not query it with the anonymous key.
- A public PIN-code check requires a dedicated server-side endpoint that returns only serviceability and approved delivery terms for the supplied PIN code.
- Shipping charges and ETA must be calculated server-side and stored in the order's delivery snapshot.
- Payment buttons remain disabled until credentials, signed webhooks/callbacks, refunds and reconciliation have been tested.

## Release gates

- The bag remains browser-local until a customer submits a valid signed-in checkout; checkout then revalidates variant, price and stock server-side.
- A successful order request reserves stock and appears in the shared `orders` and `order_items` tables with payment pending. Admin confirmation and stock-release/cancel workflows must be verified before accepting live COD orders.
- Do not claim an order, delivery or payment is live until the server-side path is deployed and tested end-to-end.
- Test that customer A cannot read customer B's profile, addresses, cart or orders.
- Test that unauthenticated users cannot reach admin functions or owner-only settings.
- Test that admin catalogue edits appear in the storefront without exposing staff-only data.
