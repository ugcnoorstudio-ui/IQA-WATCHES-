import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const storefront = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const admin = await readFile(new URL('../admin/index.html', import.meta.url), 'utf8');

test('storefront exposes a unique descriptive title and meta description', () => {
  assert.match(storefront, /<title>IQA WATCHES \| Elevate your style\.<\/title>/);
  assert.match(storefront, /<meta name="description" content="IQA WATCHES — Watches for every day\. Explore the collection\."\s*>/);
});

test('storefront exposes Open Graph website metadata', () => {
  assert.match(storefront, /<meta property="og:type" content="website">/);
  assert.match(storefront, /<meta property="og:site_name" content="IQA WATCHES">/);
  assert.match(storefront, /<meta property="og:title"/);
  assert.match(storefront, /<meta property="og:description"/);
});

test('storefront exposes Twitter summary metadata without inventing a social image', () => {
  assert.match(storefront, /<meta name="twitter:card" content="summary">/);
  assert.match(storefront, /<meta name="twitter:title"/);
  assert.match(storefront, /<meta name="twitter:description"/);
});

test('private admin page remains excluded from search indexing', () => {
  assert.match(admin, /<meta name="robots" content="noindex,nofollow">/);
});
