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

test('product details are rendered as one dedicated full-page route, not a quick-view modal', () => {
  assert.match(routes, /data-pdp-page/);
  assert.match(routes, /<h1 id="pdpProductTitle">/);
  assert.match(routes, /route-product-layout/);
  assert.match(routes, /route-sticky-buybar/);
  assert.doesNotMatch(html, /function openProduct\(id\)\{/);
  assert.doesNotMatch(html, /class="quick-view"/);
  assert.match(html, /class="product-details-link"/);
  assert.match(html, /data-view=/);
});

test('full-page product gallery uses approved catalogue photos and accessible thumbnail controls', () => {
  assert.match(routes, /const galleryItems=\(Array\.isArray\(p\.gallery\)/);
  assert.match(routes, /id="routeMainImage" role="button" tabindex="0"/);
  assert.match(routes, /data-gallery-src=/);
  assert.match(routes, /aria-pressed=/);
  assert.match(routes, /setRouteGalleryIndex/);
  assert.match(routes, /event\.target\.matches\('#routeMainImage,#productModalMainImage'\)/);
  assert.match(routes, /data-lightbox-back/);
  assert.match(routes, /data-lightbox-prev/);
  assert.match(routes, /data-lightbox-next/);
});

test('product specifications render only values supplied by the approved catalogue', () => {
  assert.match(routes, /const specRows=\[\['Brand',p\.brand\]/);
  assert.match(routes, /\.filter\(\(\[,value\]\)=>value!==null&&value!==undefined&&String\(value\)\.trim\(\)!==''\)/);
  assert.match(routes, /View product specifications/);
  assert.match(routes, /About this watch/);
  assert.ok(catalogue.products.some(product => product.caseDiameter));
});

test('mobile and desktop product pages retain the fixed purchase bar', () => {
  assert.match(html, /\.route-sticky-buybar\{\s*position:fixed;left:0;right:0;bottom:0/);
  assert.doesNotMatch(html, /\.route-sticky-buybar\{position:sticky/);
  assert.match(html, /#routeView \.route-product-page\{padding-bottom:110px!important\}/);
  assert.match(html, /padding:28px clamp\(18px,4vw,64px\) 110px/);
});

test('Buy Now selection remains independent from the shopping bag', () => {
  assert.match(routes, /window\.iqaBuyNowSelection=\{productId:p\.id,quantity:1\}/);
  assert.match(routes, /const entries=buyNowIntent\?\[buyNowIntent\]/);
});


test('public catalogue exposes real variant details and omits internal SKU fields', () => {
  assert.ok(catalogue.products.every(product => product.variantId));
  assert.ok(catalogue.products.every(product => product.variantDetails && typeof product.variantDetails === 'object'));
  assert.ok(catalogue.products.every(product => !Object.hasOwn(product, 'sku')));
  const brownLeather = catalogue.products.find(product => product.name.includes('AE-1200WHL-5AV'));
  assert.ok(brownLeather);
  assert.equal(brownLeather.variantDetails.case, 'Black Resin');
  assert.equal(brownLeather.variantDetails.strap, 'Brown Genuine Leather');
  assert.equal(brownLeather.stock, 7);
});

test('public model codes remain searchable without exposing internal SKU fields', () => {
  assert.ok(catalogue.products.some(product => product.modelCode));
  assert.ok(catalogue.products.every(product => !Object.hasOwn(product, 'sku')));
  assert.ok(html.includes('p.modelCode'));
});

test('static catalogue dimensions remain normalized for product detail rendering', () => {
  assert.ok(catalogue.products.some(product => product.caseDiameter));
  assert.ok(catalogue.products.every(product => product.caseThickness === '' || typeof product.caseThickness === 'string'));
  assert.match(routes, /const specRows=/);
  assert.match(routes, /value!==null&&value!==undefined/);
});
