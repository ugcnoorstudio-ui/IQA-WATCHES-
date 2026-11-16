const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const routes = fs.readFileSync(path.join(root, 'routes.js'), 'utf8');
const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'data', 'catalogue.json'), 'utf8'));

test('storefront inline application script remains syntactically valid', () => {
  const match = html.match(/<script>\s*([\s\S]*?)<\/script>/i);
  assert.ok(match, 'expected the inline storefront application script');
  new vm.Script(match[1], { filename: 'index.html:inline-storefront' });
});

test('public product gallery snapshot contains only Cloudinary delivery URLs', () => {
  assert.ok(Array.isArray(catalogue.products));
  assert.ok(catalogue.products.every(product => /^https:\/\/res\.cloudinary\.com\//.test(product.image)));
  assert.ok(catalogue.products.every(product => product.gallery.length > 0 && product.gallery.every(item => /^https:\/\/res\.cloudinary\.com\//.test(item.src))));
  assert.doesNotMatch(JSON.stringify(catalogue), /supabase\.co\/storage|storage\.from\(/i);
  assert.doesNotMatch(html, /storage\.from\('product-images'\)\.getPublicUrl/);
});

test('product cards expose image, title and View Details links to the dedicated product route', () => {
  assert.match(html, /class="product-image-link" href="#product\/'\+encodeURIComponent\(p\.id\)/);
  assert.match(html, /class="product-title"><a href="#product\/'\+encodeURIComponent\(p\.id\)/);
  assert.match(html, /class="quick-view" href="#product\/'\+encodeURIComponent\(p\.id\)\+'" data-view=/);
  assert.match(routes, /a\[href\^="#product\/"\]/);
  assert.match(routes, /history\.pushState\(\{iqaProductRoute:true,previousRoute:location\.hash\|\|'#home'\},'',href\);render\(\)/);
});

test('legacy product modal renderer and product image entry point are removed', () => {
  assert.doesNotMatch(html, /function openProduct\(id\)/);
  assert.doesNotMatch(html, /productModalMainImage|productModalReturnFocus|data-modal-image/);
  assert.doesNotMatch(html, /<div class="product-modal">/);
  assert.match(html, /id="modalWrap"[^>]*aria-label="IQA WATCHES information"/);
});

test('dedicated product route renders the approved gallery with accessible thumbnail controls', () => {
  assert.match(routes, /const galleryItems=\(Array\.isArray\(p\.gallery\)\?p\.gallery:\[\]\)/);
  assert.match(routes, /id="routeMainImage"/);
  assert.match(routes, /data-gallery-src=/);
  assert.match(routes, /aria-pressed=/);
  assert.match(routes, /function setRouteGalleryIndex\(index\)/);
  assert.match(routes, /thumbs\[next\]/);
  assert.ok(catalogue.products.every(product => product.gallery.length > 0));
});

test('dedicated product route keeps real catalogue specifications and purchase controls', () => {
  assert.match(routes, /View product specifications/);
  assert.match(routes, /About this watch/);
  assert.match(routes, /data-pdp-add=/);
  assert.match(routes, /data-buy-now=/);
  assert.match(routes, /data-pdp-wish=/);
  assert.match(routes, /route-sticky-buybar/);
});

test('mobile product details use the same full-page route, not a modal layout', () => {
  assert.match(routes, /route-pdp-appbar/);
  assert.match(routes, /route-product-page/);
  assert.match(routes, /data-pdp-back/);
});
