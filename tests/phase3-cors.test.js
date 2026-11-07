const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const functions = [
  'iqa-admin-health',
  'iqa-admin-mutate',
  'iqa-cloudinary-media-library',
  'iqa-customer-cancel-order',
  'iqa-customer-checkout',
  'iqa-migrate-brand-assets',
  'iqa-migrate-static-cloudinary',
  'iqa-migrate-storage-to-cloudinary',
  'iqa-migrate-unlinked-review',
  'iqa-product-image-upload',
  'iqa-public-content'
];

test('all Phase 3 Edge Functions use the exact production Pages CORS origin, never wildcard', () => {
  for (const name of functions) {
    const file = path.join(__dirname, '..', 'supabase', 'functions', name, 'index.ts');
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /Access-Control-Allow-Origin["']?\s*:\s*["']https:\/\/iqa-watches-storefront\.pages\.dev["']/,
      name + ' must return the production Pages origin');
    assert.doesNotMatch(source, /Access-Control-Allow-Origin["']?\s*:\s*["']\*["']/,
      name + ' must not use wildcard CORS');
    assert.match(source, /https:\/\/iqa-watches-storefront\.pages\.dev/,
      name + ' must allow the production Pages origin');
  }
});
