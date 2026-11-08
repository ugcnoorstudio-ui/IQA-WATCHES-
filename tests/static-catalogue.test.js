const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'data', 'catalogue.json'), 'utf8'));

test('public storefront reads the approved catalogue through the read-only Edge Function', () => {
  const start = html.indexOf('async function loadStorefrontCatalogue(){');
  const end = html.indexOf('function renderProducts(){', start);
  assert.ok(start >= 0 && end > start, 'catalogue loader must exist');
  const loader = html.slice(start, end);
  assert.match(loader, /functions\/v1\/iqa-public-catalogue/);
  assert.match(loader, /fetch\(catalogueUrl/);
  assert.doesNotMatch(loader, /storefrontClient|\.from\(['"]products|product_variants|product_media|service_role/);
});

test('static JSON is only a preview fallback and is visibly labelled as cached', () => {
  const start = html.indexOf('async function loadStorefrontCatalogue(){');
  const end = html.indexOf('function renderProducts(){', start);
  const loader = html.slice(start, end);
  assert.match(loader, /new URL\('data\\/catalogue\\.json'/);
  assert.match(loader, /catalogueSourceForLoad='snapshot'/);
  assert.match(html, /Cached catalogue preview only/);
  assert.match(html, /Current price and stock are revalidated at checkout/);
});

test('static storefront snapshot contains only published-style, in-stock Cloudinary products', () => {
  assert.equal(catalogue.version, 1);
  assert.ok(catalogue.products.length >= 1);
  for (const product of catalogue.products) {
    assert.ok(product.id && product.name);
    assert.ok(product.price > 0);
    assert.ok(product.stock > 0);
    assert.match(product.image, /^https:\/\/res\.cloudinary\.com\//);
    assert.ok(Array.isArray(product.gallery) && product.gallery.length > 0);
    assert.ok(product.gallery.every(image => /^https:\/\/res\.cloudinary\.com\//.test(image.src)));
  }
  assert.equal(new Set(catalogue.products.map(product => product.id)).size, catalogue.products.length);
});

test('cached preview snapshot contains the three current sample product cards', () => {
  assert.deepEqual(
    catalogue.products.map(product => product.name).sort(),
    [
      'Casio AE-1200WHD-1AV Silver Stainless Steel World Time Digital Watch',
      'Casio AE-1200WHL-5AV Brown Leather World Time Digital Watch',
      'Fastrack thor multifunctional analogue'
    ].sort()
  );
});
