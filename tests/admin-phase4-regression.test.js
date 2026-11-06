const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('Phase 4 product editor loads every field that it later pre-fills', () => {
  const admin = read('admin/admin.js');
  const queryStart = admin.indexOf("api.readTable('products','");
  assert.notEqual(queryStart, -1, 'expected an allow-listed product catalogue query');
  const query = admin.slice(queryStart + "api.readTable('products','".length).split("'")[0];
  const selected = new Set(query.split(','));
  for (const field of ['id', 'name', 'description', 'audience', 'selling_price', 'mrp']) assert.ok(selected.has(field), 'product editor query must select ' + field);
  assert.ok(admin.includes("form.elements.description.value=p.description||''"));
  assert.ok(admin.includes("form.elements.audience.value=p.audience||''"));
});

test('Phase 4 admin editor does not alter publication state when editing product details', () => {
  const admin = read('admin/admin.js');
  const start = admin.indexOf("if(form.matches('[data-product-update]')||form.matches('[data-variant-update]'))");
  assert.notEqual(start, -1, 'expected product editor submit handler');
  const handler = admin.slice(start, start + 2600);
  assert.ok(handler.includes("api.mutate('update_product'"));
  assert.ok(handler.includes('Publication state was not changed'));
  assert.ok(!handler.includes('publish_product'));
});

test('Phase 4 admin remains authenticated before the workspace shell is exposed', () => {
  const html = read('admin/index.html');
  for (const marker of ['id="authGate"', 'id="loginForm"', '<div class="shell" hidden>', 'id="signOut"', 'admin.js?v=20261106-phase4-product-editor']) assert.ok(html.includes(marker), 'missing admin security marker: ' + marker);
});
