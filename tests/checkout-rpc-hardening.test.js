import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20261108081229_harden_checkout_rpc_payload.sql', import.meta.url),
  'utf8',
);

test('checkout RPC rejects null, non-array, and empty item payloads at the database boundary', () => {
  assert.match(migration, /p_items is null or jsonb_typeof\(p_items\) is distinct from 'array'/);
  assert.match(migration, /jsonb_array_length\(p_items\) < 1/);
  assert.match(migration, /jsonb_typeof\(item\.value\) is distinct from 'object'/);
});

test('checkout RPC rejects duplicate variant lines before reserving inventory', () => {
  assert.match(migration, /where item\.value \? 'variant_id'/);
  assert.match(migration, /group by item\.value->>'variant_id'/);
  assert.match(migration, /having count\(\*\) > 1/);
  assert.match(migration, /Cart must not contain duplicate variant lines/);
});

test('checkout RPC migration refuses to rewrite an unexpected function definition', () => {
  assert.match(migration, /position\(v_old in v_def\) = 0/);
  assert.match(migration, /refusing to alter it/);
  assert.match(migration, /execute v_def/);
});


test('checkout RPC migration safely skips when the hardening is already present', () => {
  assert.match(migration, /position\('Cart must not contain duplicate variant lines' in v_def\) > 0/);
  assert.match(migration, /position\('Each cart item must be a JSON object' in v_def\) > 0/);
  assert.match(migration, /already present; skipping replay/);
});
