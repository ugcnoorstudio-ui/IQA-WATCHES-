const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('Phase 4 product editor loads every field that it later pre-fills', () => {
  const admin = read('admin/admin.js');
  const query = admin.match(/api\.readTable\('products','([^']+)'/);
  assert.ok(query, 'expected an allow-listed product catalogue query');
  const selected = new Set(query[1].split(','));
  for (const field of ['id', 'name', 'description', 'audience', 'selling_price', 'mrp']) {
    assert.ok(selected.has(field), 'product editor query must select ' + field);
  }
  assert.match(admin, /form\.elements\.description\.value=p\.description\|\|''/);
  assert.match(admin, /form\.elements\.audience\.value=p\.audience\|\|''/);
});

test('Phase 4 admin editor does not alter publication state when editing product details', () => {
  const admin = read('admin/admin.js');
  const handlerStart = admin.indexOf("if(form.matches('[data-product-update]')||form.matches('[data-variant-update]'))");
  assert.notEqual(handlerStart, -1, 'expected product editor submit handler');
  const handler = admin.slice(handlerStart, handlerStart + 2600);
  assert.match(handler, /api\.mutate\('update_product'/);
  assert.match(handler, /Publication state was not changed/);
  assert.doesNotMatch(handler, /publish_product/);
});

test('Phase 4 admin remains authenticated before the workspace shell is exposed', () => {
  const html = read('admin/index.html');
  assert.match(html, /id="authGate"/);
  assert.match(html, /id="loginForm"/);
  assert.match(html, /<div class="shell" hidden>/);
  assert.match(html, /id="signOut"/);
  assert.match(html, /admin\.js\?v=20261106-phase4-product-editor/);
});
