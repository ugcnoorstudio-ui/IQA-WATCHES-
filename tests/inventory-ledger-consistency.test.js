import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20261108164500_inventory_ledger_reservation_fulfilment_consistency.sql', import.meta.url),
  'utf8',
);

test('inventory ledger backfill is guarded and does not rewrite stock quantities', () => {
  assert.match(migration, /stock_reserved does not match active order items/);
  assert.match(migration, /existing movement history does not reconcile/);
  assert.match(migration, /Opening stock baseline/);
  assert.match(migration, /order:.*:reservation:/);
  assert.match(migration, /movement net does not equal available stock/);
});

test('reserved-only stock changes create reservation and release movements', () => {
  assert.match(migration, /AFTER UPDATE OF stock_reserved ON public\.product_variants/);
  assert.match(migration, /NEW\.stock_on_hand IS DISTINCT FROM OLD\.stock_on_hand OR v_delta = 0/);
  assert.match(migration, /THEN 'reservation' ELSE 'release' END/);
  assert.match(migration, /current_setting\('iqa\.inventory_reference', true\)/);
});

test('checkout order item insertion supplies a transaction-local order reference', () => {
  assert.match(migration, /AFTER INSERT ON public\.order_items/);
  assert.match(migration, /set_config\([\s\S]*'iqa\.inventory_reference'[\s\S]*NEW\.order_id/);
});

test('customer and admin cancellation release reservations through the ledger trigger', () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.iqa_cancel_customer_order/);
  assert.match(migration, /Customer cancelled the pending Cash on Delivery order/);
  assert.match(migration, /IF p_new_state = 'cancelled' THEN/);
  assert.match(migration, /Reserved stock could not be safely released for this order/);
});

test('fulfilment decrements on-hand and reserved stock together and records a balanced release/stock-out pair', () => {
  assert.match(migration, /stock_on_hand = stock_on_hand - v_item\.quantity/);
  assert.match(migration, /stock_reserved = stock_reserved - v_item\.quantity/);
  assert.match(migration, /'release',[\s\S]*v_item\.quantity/);
  assert.match(migration, /'stock_out',[\s\S]*-v_item\.quantity/);
  assert.match(migration, /v_order\.state IN \('processing', 'packed', 'ready_for_pickup'\)/);
});
