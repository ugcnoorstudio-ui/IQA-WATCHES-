const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const routes = fs.readFileSync(path.join(root, 'routes.js'), 'utf8');
const storefront = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const premiumCss = fs.readFileSync(path.join(root, 'assets/customer-premium.css'), 'utf8');

test('dedicated product detail page exposes an accessible wishlist control', () => {
  assert.match(routes, /const wishlistSaved=wishlist\.includes\(p\.id\)/);
  assert.match(routes, /data-pdp-wish=/);
  assert.match(routes, /aria-pressed=/);
  assert.match(routes, /toggleWish\(id\)/);
  assert.match(storefront, /function toggleWish\(id\)/);
  assert.match(premiumCss, /\.route-product-copy \.route-wish-button/);
  assert.match(routes, /data-pdp-qty=/);
  assert.match(routes, /data-pdp-add=/);
  assert.match(routes, /addCartQuantity\(id,quantity\)/);
  assert.match(storefront, /function addCartQuantity\(id,quantity=1\)/);
  assert.match(storefront, /iqa-checkout-buy-now/);
  assert.match(routes, /const entries=buyNowIntent\?\[buyNowIntent\]/);
  assert.doesNotMatch(routes, /for\(let index=0;index<quantity;index\+\+\)\{if\(!addCart\(productItem\.id\)\)return;\}/);
});
