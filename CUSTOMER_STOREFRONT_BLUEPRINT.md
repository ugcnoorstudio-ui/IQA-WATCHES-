# IQA WATCHES — Customer Storefront Blueprint

Status: Permanent product and implementation baseline.

## Global interaction rule
Every customer-facing storefront option, icon, action, and feature opens its own dedicated page/panel. No decorative or inert controls. Each panel must show real state and clearly disclose any dependency that is not configured. Customer storefront and protected admin console remain separate.

## Storefront and discovery
- Home, Shop All, categories, brands, new arrivals, best sellers, featured products, offers/sale.
- Search by name, brand, model/SKU, style; filter by category, brand, price, availability; sort.
- Watch finder, comparison (up to four), recently viewed.
- Product detail page per product: image gallery, price/discount, stock/variants, specifications, warranty terms, delivery estimate, return policy, reviews, quantity, add to cart, buy now, wishlist, share, related products.

## Shopping
- Cart/bag: add/remove, quantity, save for later, coupon, gift options, subtotal, discount, shipping/tax/total, guest cart and account sync.
- Checkout: guest or signed-in, customer details, address, delivery method/fee/ETA, coupon, order summary, secure payment methods, idempotent order submission, confirmation and invoice.
- Do not enable a payment method until provider credentials, server-side verification, signed callbacks/webhooks, refunds and reconciliation are tested.

## Delivery and order lifecycle
- PIN-code serviceability, shipping fees, handling and delivery estimates based on configured verified rules.
- My orders, order detail, tracking timeline, carrier/tracking ID, ETA, cancellation eligibility, invoice, reorder.
- Live map only when a carrier integration supplies trustworthy location data.
- Guest order tracking only through a secure order reference plus verified contact challenge; never expose order data from an easily guessed order number.

## Customer account
- Profile, addresses, order history, tracking, wishlist, cart, reviews, returns/exchanges, refund status, coupons/rewards, notifications, password/security, sign out.
- Each destination has a dedicated panel/page and authenticated ownership checks.

## After-sales and engagement
- Returns/refunds/exchange request with reason/evidence, pickup address, status and refund tracking.
- Wishlist and stock/price alerts.
- Reviews with moderation and verified-purchase status only when order ownership is confirmed.
- Rewards/referrals only after rules and ledger are configured.
- Customer support tickets, FAQ, contact channels, complaint escalation and notifications.

## Trust and information
- About, contact, shipping, returns/refunds, privacy, terms, warranty, FAQ, size guide, care guide, how to order, payment information.
- Publish only verified business contact details, legal policies, product provenance, warranty and delivery claims.

## Security and quality
- Supabase RLS on every exposed table; customer-owned rows restricted to authenticated owner.
- No service-role keys in browser; server-side payment/order operations; duplicate-order protection.
- Guest/local preview state clearly distinguished from server-saved account state.
- Responsive mobile panels, accessibility, keyboard focus, loading/empty/error/success states, privacy and secure logout.
- Admin remains a separate protected role-based area.

## Delivery sequence
1. Storefront discovery and dedicated panel routing.
2. Product detail, compare, wishlist and cart.
3. Delivery serviceability, secure checkout and payment integration.
4. Orders, tracking, invoices, cancellation and reorder.
5. Account, returns/refunds, reviews, rewards, support and notifications.
6. End-to-end, security and mobile testing before production enablement.

## Implementation truth
A feature is not considered complete because a button exists. It is complete only when the route, backend permissions, validation, persistence, error handling and relevant tests work end to end. Unconfigured third-party services must remain clearly disabled rather than simulated.
