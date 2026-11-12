const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('dynamic Cloudinary images receive responsive srcset variants', () => {
  const start = html.indexOf('function responsiveCloudinarySrcset(');
  const end = html.indexOf('function enhanceResponsiveCloudinaryImages(', start);
  assert.ok(start >= 0 && end > start, 'responsive URL helper must exist');
  const helper = html.slice(start, end);
  const context = { URL, location: { href: 'https://iqa-watches.example/' }, window: { IQA_SUPABASE_CONFIG: {} } };
  vm.runInNewContext(helper + ';this.buildSrcset=responsiveCloudinarySrcset;', context);
  const result = context.buildSrcset('https://res.cloudinary.com/rrmdzam7/image/upload/v1234567890/iqa-watches/products/watch.jpg');
  const entries = result.split(', ');
  assert.equal(entries.length, 4);
  assert.deepEqual(entries.map(entry => entry.match(/ (\d+)w$/)?.[1]), ['320', '480', '800', '1200']);
  assert.ok(entries.every(entry => entry.includes('/c_limit,w_') && entry.includes('/f_auto/q_auto/v1234567890/')));
});

test('responsive URL helper replaces existing Cloudinary transforms without duplicating them', () => {
  const start = html.indexOf('function responsiveCloudinarySrcset(');
  const end = html.indexOf('function enhanceResponsiveCloudinaryImages(', start);
  const context = { URL, location: { href: 'https://iqa-watches.example/' }, window: { IQA_SUPABASE_CONFIG: {} } };
  vm.runInNewContext(html.slice(start, end) + ';this.buildSrcset=responsiveCloudinarySrcset;', context);
  const result = context.buildSrcset('https://res.cloudinary.com/rrmdzam7/image/upload/c_limit,w_1200/f_auto/q_auto/v123/iqa-watches/products/watch.jpg');
  assert.equal((result.match(/c_limit,w_/g) || []).length, 4);
  assert.ok(result.includes('/c_limit,w_320/f_auto/q_auto/v123/'));
  assert.ok(!result.includes('w_1200/f_auto/q_auto/c_limit'));
});

test('responsive enhancement excludes non-Cloudinary and SVG assets', () => {
  const start = html.indexOf('function responsiveCloudinarySrcset(');
  const end = html.indexOf('function enhanceResponsiveCloudinaryImages(', start);
  const context = { URL, location: { href: 'https://iqa-watches.example/' } };
  vm.runInNewContext(html.slice(start, end) + ';this.buildSrcset=responsiveCloudinarySrcset;', context);
  assert.equal(context.buildSrcset('https://example.com/watch.jpg'), '');
  assert.equal(context.buildSrcset('https://res.cloudinary.com/rrmdzam7/image/upload/iqa-watches/brand/logo.svg'), '');
});

test('storefront automatically enhances dynamically rendered Cloudinary images', () => {
  assert.match(html, /enhanceResponsiveCloudinaryImages\(\);/);
  assert.match(html, /new MutationObserver\(/);
  assert.match(html, /setAttribute\('srcset',set\)/);
  assert.match(html, /setAttribute\('sizes'/);
});
