import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../scripts/monitor-public-health.js', import.meta.url), 'utf8');

test('public health monitor script remains syntactically valid', () => {
  assert.doesNotThrow(() => new vm.Script(source));
});

test('public health monitor verifies the live catalogue Edge Function', () => {
  assert.match(source, /functions\/v1\/iqa-public-catalogue/);
  assert.match(source, /access-control-allow-origin/);
  assert.match(source, /Origin: storefrontOrigin/);
  assert.match(source, /payload\.products/);
  assert.match(source, /res\.cloudinary\.com/);
});
