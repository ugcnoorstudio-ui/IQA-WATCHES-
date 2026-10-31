const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('storefront inline application script remains syntactically valid', () => {
  const match = html.match(/<script>\\s*([\\s\\S]*?)<\\/script>/i);
  assert.ok(match, 'expected the inline storefront application script');
  new vm.Script(match[1], { filename: 'index.html:inline-storefront' });
});

test('product detail modal renders available Supabase gallery photos with keyboard-operable controls', () => {
  assert.match(html, /Array\\.isArray\\(p\\.gallery\\)/);
  assert.match(html, /data-gallery-index/);
  assert.match(html, /aria-pressed=/);
  assert.match(html, /productModalMainImage/);
  assert.match(html, /data-gallery-src=/);
  assert.match(html, /loading="lazy"/);
});

test('product detail modal includes verified dimensions only when catalogue values exist', () => {
  for (const field of ['caseDiameter', 'caseThickness', 'lugToLug', 'strapWidth']) {
    assert.ok(html.includes('p.' + field), 'expected dimension field ' + field);
  }
  assert.match(html, /dimensionRows/);
  assert.match(html, /value!==null&&value!==undefined/);
});

test('mobile product detail modal stacks gallery and product information', () => {
  assert.match(html, /@media\\(max-width:680px\\)\\{\\.modal-wrap/);
  assert.match(html, /\\.product-modal\\{grid-template-columns:1fr\\}/);
});
