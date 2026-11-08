import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const mediaLimit = await readFile(new URL('../supabase/migrations/20261107193017_enforce_eight_product_images.sql', import.meta.url), 'utf8');
const checkoutIndex = await readFile(new URL('../supabase/migrations/20261108060625_index_checkout_idempotency_order_id.sql', import.meta.url), 'utf8');

test('product media cap migration serializes inserts by locking the parent product', () => {
  assert.match(mediaLimit, /FROM public\.products[\s\S]*?FOR UPDATE/);
  assert.match(mediaLimit, /count\(\*\)[\s\S]*?product_id = NEW\.product_id/);
  assert.match(mediaLimit, /v_count >= 8/);
  assert.match(mediaLimit, /BEFORE INSERT ON public\.product_media/);
  assert.match(mediaLimit, /SET search_path TO ''/);
});

test('checkout idempotency migration creates the missing order_id index idempotently', () => {
  assert.match(checkoutIndex, /CREATE INDEX IF NOT EXISTS checkout_idempotency_order_id_idx/);
  assert.match(checkoutIndex, /ON public\.checkout_idempotency \(order_id\)/);
});
