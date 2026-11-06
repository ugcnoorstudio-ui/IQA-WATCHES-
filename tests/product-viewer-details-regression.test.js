const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const routes = fs.readFileSync(path.join(root, 'routes.js'), 'utf8');
const premiumCss = fs.readFileSync(path.join(root, 'assets/customer-premium.css'), 'utf8');

test('full-screen product image viewer uses a left-side back control instead of an X close button', () => {
  assert.match(routes, /data-lightbox-back[^>]*aria-label="Back to product details"/);
  assert.match(routes, /querySelector\('\[data-lightbox-back\]'\)\.addEventListener\('click',close\)/);
  assert.doesNotMatch(routes, /data-lightbox-close/);
  assert.match(premiumCss, /#iqa-image-lightbox \[data-lightbox-back\]/);
});

test('product specifications and long description are collapsed into clear on-demand detail sections', () => {
  assert.match(routes, /<details class="route-product-details"><summary><span>View product specifications/);
  assert.match(routes, /<details class="route-product-details route-product-about"><summary><span>About this watch/);
  assert.match(premiumCss, /\.route-product-details>summary/);
});
