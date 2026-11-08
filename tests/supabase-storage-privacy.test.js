import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20261108170000_make_legacy_product_images_bucket_private.sql', import.meta.url),
  'utf8',
);

test('Storage privacy migration fails closed unless every product image is on Cloudinary', () => {
  assert.match(migration, /cloudinary_public_id IS NULL/);
  assert.match(migration, /res\\\.cloudinary\\\.com/);
  assert.match(migration, /every product media row must have a verified Cloudinary URL/);
});

test('Storage privacy migration checks database image references before changing bucket visibility', () => {
  assert.match(migration, /products[\s\S]*supabase\.co\/storage/);
  assert.match(migration, /order_items[\s\S]*supabase\.co\/storage/);
  assert.match(migration, /content_entries[\s\S]*supabase\.co\/storage/);
  assert.match(migration, /store_settings[\s\S]*supabase\.co\/storage/);
  assert.ok(migration.indexOf('Cannot make product-images private') < migration.indexOf('UPDATE storage.buckets'));
});

test('Storage privacy migration keeps originals and does not delete files or product media', () => {
  assert.match(migration, /Keep the six existing objects as private rollback\/migration copies/);
  assert.doesNotMatch(migration, /DELETE\s+FROM\s+storage\.objects/i);
  assert.doesNotMatch(migration, /DELETE\s+FROM\s+public\.product_media/i);
  assert.match(migration, /SET public = false/);
});
