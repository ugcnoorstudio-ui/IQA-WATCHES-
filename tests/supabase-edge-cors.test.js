'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const functionSlugs = [
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
  'iqa-public-content',
];

test('all deployed browser-facing Edge Functions are tracked in source control', () => {
  for (const slug of functionSlugs) {
    const file = path.join(root, 'supabase', 'functions', slug, 'index.ts');
    assert.ok(fs.existsSync(file), 'Missing tracked Edge Function source: ' + slug);
  }
});

test('Edge Functions allow only the active Cloudflare Pages origin', () => {
  for (const slug of functionSlugs) {
    const file = path.join(root, 'supabase', 'functions', slug, 'index.ts');
    const source = fs.readFileSync(file, 'utf8');
    assert.ok(source.includes('https://iqa-watches-storefront.pages.dev'), slug + ' missing Cloudflare Pages origin');
    assert.ok(!source.includes('https://ugcnoorstudio-ui.github.io'), slug + ' must reject the retired GitHub Pages origin');
    assert.ok(source.includes('ALLOWED_ORIGINS.has'), slug + ' missing server-side origin allowlist');
    assert.ok(source.includes('"Access-Control-Allow-Origin": "https://iqa-watches-storefront.pages.dev"') ||
      source.includes('"Access-Control-Allow-Origin":"https://iqa-watches-storefront.pages.dev"'), slug + ' must return only the production Pages origin');
    assert.ok(source.includes('new Response("Forbidden", { status: 403 })'), slug + ' must reject unapproved preflight origins');
  }
});

test('customer cancellation RPC client remains JWT authenticated and validates the signed-in customer', () => {
  const source = fs.readFileSync(path.join(root, 'supabase', 'functions', 'iqa-customer-cancel-order', 'index.ts'), 'utf8');
  assert.ok(source.includes('auth.getUser(token)'));
  assert.ok(source.includes('client.rpc("iqa_cancel_customer_order"'));
  assert.ok(source.includes('Bearer '), 'Bearer token must be supplied to the authenticated function');
  assert.ok(source.includes('Origin not allowed'));
});
