import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20261108170000_make_legacy_product_images_bucket_private.sql', import.meta.url),
  'utf8',
);
const functionSource = await readFile(
  new URL('../supabase/functions/iqa-lock-down-product-images/index.ts', import.meta.url),
  'utf8',
);
const adminSource = await readFile(
  new URL('../admin/cloudinary-migration.js', import.meta.url),
  'utf8',
);

test('Storage migration is a preflight only and never writes Supabase Storage schema tables', () => {
  assert.match(migration, /every product media row must have a verified Cloudinary URL/);
  assert.match(migration, /products[\s\S]*supabase\.co\/storage/);
  assert.match(migration, /order_items[\s\S]*supabase\.co\/storage/);
  assert.match(migration, /content_entries[\s\S]*supabase\.co\/storage/);
  assert.match(migration, /store_settings[\s\S]*supabase\.co\/storage/);
  assert.doesNotMatch(migration, /UPDATE\s+storage\.buckets/i);
  assert.doesNotMatch(migration, /DELETE\s+FROM\s+storage\./i);
});

test('private bucket change uses the official Storage API and is owner-only', () => {
  assert.match(functionSource, /staff\.role !== "owner"/);
  assert.match(functionSource, /admin\.storage\.getBucket\("product-images"\)/);
  assert.match(functionSource, /admin\.storage\.updateBucket\("product-images", \{ public: false \}\)/);
  assert.match(functionSource, /objects_preserved: true/);
  assert.doesNotMatch(functionSource, /storage\.from\("product-images"\)\.remove/);
});

test('admin UI requires owner role and invokes the protected Storage API action', () => {
  assert.match(adminSource, /api\.requireRole\(\['owner'\]\)/);
  assert.match(adminSource, /iqa-lock-down-product-images/);
  assert.match(adminSource, /Existing Storage files will NOT be deleted/);
});
