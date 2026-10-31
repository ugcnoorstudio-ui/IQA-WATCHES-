const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('storefront inline application script remains syntactically valid', () => {
  const match = html.match(/<script>\s*([\s\S]*?)<\/script>/i);
  assert.ok(match, 'expected the inline storefront application script');
  new vm.Script(match[1], { filename: 'index.html:inline-storefront' });
});

test('product detail modal renders available Supabase gallery photos with keyboard-operable controls', () => {
  assert.ok(html.includes('Array.isArray(p.gallery)'));
  assert.ok(html.includes('data-gallery-index'));
  assert.ok(html.includes('aria-pressed='));
  assert.ok(html.includes('productModalMainImage'));
  assert.ok(html.includes('data-gallery-src='));
  assert.ok(html.includes('loading="lazy"'));
});

test('product detail modal includes verified dimensions only when catalogue values exist', () => {
  for (const field of ['caseDiameter', 'caseThickness', 'lugToLug', 'strapWidth']) {
    assert.ok(html.includes('p.' + field), 'expected dimension field ' + field);
  }
  assert.ok(html.includes('dimensionRows'));
  assert.ok(html.includes('value!==null&&value!==undefined'));
});

test('mobile product detail modal stacks gallery and product information', () => {
  assert.ok(html.includes('@media(max-width:680px){.modal-wrap'));
  assert.ok(html.includes('.product-modal{grid-template-columns:1fr}'));
});
