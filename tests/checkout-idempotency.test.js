import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const routes = await readFile(new URL('../routes.js', import.meta.url), 'utf8');
const helperStart = routes.indexOf('const CHECKOUT_IDEMPOTENCY_STORAGE_KEY');
const helperEnd = routes.indexOf('function product(', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'checkout idempotency helpers must exist before product routes');
const helperSource = routes.slice(helperStart, helperEnd);

function createHarness() {
  const values = new Map();
  let sequence = 0;
  const localStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
  const context = {
    localStorage,
    crypto: { randomUUID: () => 'test-idempotency-key-' + (++sequence) },
  };
  const api = vm.runInNewContext(
    helperSource + '\n({ getCheckoutIdempotencyKey, clearCheckoutIdempotencyKey })',
    context,
  );
  return { api, localStorage };
}

test('checkout reuses the same idempotency key for an identical user, address and cart retry', () => {
  const { api, localStorage } = createHarness();
  const items = [{ product_id: 'product-1', variant_id: 'variant-1', quantity: 2 }];
  const first = api.getCheckoutIdempotencyKey('user-1', 'address-1', items);
  const retry = api.getCheckoutIdempotencyKey('user-1', 'address-1', items);
  assert.equal(retry, first);
  assert.ok(localStorage.getItem('iqa-checkout-idempotency-v1'));
});

test('checkout rotates the idempotency key when the user, address or cart changes', () => {
  const { api } = createHarness();
  const items = [{ product_id: 'product-1', variant_id: 'variant-1', quantity: 2 }];
  const first = api.getCheckoutIdempotencyKey('user-1', 'address-1', items);
  assert.notEqual(api.getCheckoutIdempotencyKey('user-2', 'address-1', items), first);
  assert.notEqual(api.getCheckoutIdempotencyKey('user-1', 'address-2', items), first);
  assert.notEqual(api.getCheckoutIdempotencyKey('user-1', 'address-1', [{ ...items[0], quantity: 3 }]), first);
});

test('successful checkout can clear the persisted idempotency key for a new order', () => {
  const { api, localStorage } = createHarness();
  api.getCheckoutIdempotencyKey('user-1', 'address-1', []);
  api.clearCheckoutIdempotencyKey();
  assert.equal(localStorage.getItem('iqa-checkout-idempotency-v1'), null);
});

test('checkout sends the persisted key and only clears it after a confirmed order', () => {
  const start = routes.indexOf('async function renderCheckoutRoute()');
  const end = routes.indexOf('\n}', start);
  const checkout = routes.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(checkout, /getCheckoutIdempotencyKey\(user\.id,selected\.id,orderItems\)/);
  assert.match(checkout, /'x-idempotency-key':requestKey/);
  assert.match(checkout, /clearCheckoutIdempotencyKey\(\)/);
  assert.match(checkout, /if\(typeof updateCounts==='function'\)updateCounts\(\)/);
});
