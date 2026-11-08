import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(
  new URL('../supabase/functions/iqa-public-catalogue/index.ts', import.meta.url),
  'utf8',
);

test('public catalogue endpoint exposes only published, verified, non-sample products', () => {
  assert.match(source, /\.eq\("state", "published"\)/);
  assert.match(source, /\.eq\("is_sample", false\)/);
  assert.match(source, /\.eq\("verified_sellable", true\)/);
});

test('public catalogue includes only active variants with available stock', () => {
  assert.match(source, /\.eq\("active", true\)/);
  assert.match(source, /number\(variant\.stock_on_hand\) > number\(variant\.stock_reserved\)/);
  assert.match(source, /const availableStock = Math\.max\(0, number\(variant\.stock_on_hand\) - number\(variant\.stock_reserved\)\)/);
});

test('public catalogue delivers Cloudinary-only images and read-only cached responses', () => {
  assert.match(source, /url\.hostname === "res\.cloudinary\.com"/);
  assert.match(source, /public, max-age=60, stale-while-revalidate=300/);
  assert.match(source, /request\.method !== "GET"/);
  assert.doesNotMatch(source, /\.insert\(|\.update\(|\.delete\(/);
});

test('public catalogue CORS is limited to the current storefront origin', () => {
  assert.match(source, /https:\/\/ugcnoorstudio-ui\.github\.io/);
  assert.match(source, /origin !== ALLOWED_ORIGIN/);
});
