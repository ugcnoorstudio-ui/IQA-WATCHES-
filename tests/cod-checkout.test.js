import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const routes = await readFile(new URL('../routes.js', import.meta.url), 'utf8');
const storefront = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const checkout = await readFile(new URL('../supabase/functions/iqa-customer-checkout/index.ts', import.meta.url), 'utf8');

test('cart drawer starts the real secure COD checkout instead of a preview-only disabled button', () => {
  assert.match(storefront, /id="checkoutStart"/);
  assert.match(storefront, /location\.hash='checkout'/);
  assert.match(storefront, /Cash on Delivery is available/);
  assert.doesNotMatch(storefront, /Checkout unavailable in preview/);
});

test('Buy Now selection can continue directly into the same COD checkout', () => {
  assert.match(routes, /data-buy-now-checkout/);
  assert.match(routes, /sessionStorage\.setItem\('iqa-checkout-buy-now'/);
  assert.match(routes, /const entries=buyNowIntent\?\[buyNowIntent\]/);
  assert.doesNotMatch(routes, /addCart\(productItem\.id\)/);
  assert.match(routes, /location\.hash='checkout'/);
  assert.match(routes, /Cash on Delivery is available/);
  assert.doesNotMatch(routes, /Secure checkout is not enabled yet/);
});

test('COD checkout accepts the explicitly configured wildcard PIN coverage and validates six digits', () => {
  assert.match(checkout, /configuredPins\.includes\("\*"\)/);
  assert.match(checkout, /!\/(?:\^)?\\d\{6\}\$\//);
  assert.match(checkout, /payments\.cod_enabled !== true/);
});

test('server recalculates basket prices and free-shipping threshold from trusted catalogue rows', () => {
  assert.match(checkout, /from\("product_variants"\)/);
  assert.match(checkout, /from\("products"\)/);
  assert.match(checkout, /itemSubtotal \+= price \* item\.quantity/);
  assert.match(checkout, /free_shipping_threshold/);
  assert.match(checkout, /const fee = freeShipping \? 0 : flatFee/);
  assert.match(checkout, /admin\.rpc\("iqa_create_customer_order"/);
});

test('checkout remains authenticated and idempotent with COD only; no online gateway is enabled', () => {
  assert.match(checkout, /auth\.getUser\(token\)/);
  assert.match(checkout, /x-idempotency-key/);
  assert.match(checkout, /payment_method: "cash_on_delivery"/);
  assert.match(checkout, /payments\.cod_enabled !== true/);
  assert.match(routes, /UPI · Google Pay · PhonePe · Paytm/);
  assert.match(routes, /Coming Soon/);
});
