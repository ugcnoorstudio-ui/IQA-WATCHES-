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

test('Supabase product_media rows are mapped into safe public gallery image URLs', () => {
  assert.match(html, /from\('product_media'\)\.select\('id,product_id,storage_path,alt_text,sort_order,is_primary'\)/);
  assert.match(html, /storage\.from\('product-images'\)\.getPublicUrl\(item\.storage_path\)/);
  assert.match(html, /gallery:galleryImages/);
  assert.match(html, /const gallery=mediaByProduct\.get\(row\.id\)\|\|\[\]/);
});

test('product detail modal renders available photos with keyboard-operable thumbnail controls', () => {
  assert.ok(html.includes('Array.isArray(p.gallery)'));
  assert.ok(html.includes('data-gallery-index'));
  assert.ok(html.includes('aria-pressed='));
  assert.ok(html.includes('productModalMainImage'));
  assert.ok(html.includes('data-gallery-src='));
  assert.ok(html.includes('loading="lazy"'));
});

test('product detail modal renders real gallery photos and only supplied dimensions', () => {
  const start = html.indexOf('function openProduct(id){');
  const end = html.indexOf('\nfunction closeModal()', start);
  assert.ok(start >= 0 && end > start, 'expected the complete openProduct implementation');
  const context = {
    products: [{
      id: 'watch-1', name: 'Test Watch', brand: 'IQA', price: 1200, compareAt: 1500,
      desc: 'Test description', image: 'https://images.example/main.jpg', imageAlt: 'Front view',
      gallery: [
        { src: 'https://images.example/main.jpg', alt: 'Front view', isPrimary: true },
        { src: 'https://images.example/back.jpg', alt: 'Back view', isPrimary: false }
      ],
      caseDiameter: '40', caseThickness: '', lugToLug: '46 mm', strapWidth: null,
      category: 'Analog', style: 'Dress', dial: 'Black', colour: 'Silver',
      caseMaterial: 'Steel', strap: 'Steel', movement: 'Quartz',
      waterResistance: '50 m', warranty: '1 year'
    }],
    safeImageUrl: value => {
      try { const u = new URL(String(value)); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; }
      catch { return ''; }
    },
    escapeHtml: value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])),
    money: value => '₹' + value,
    document: { body: { classList: { add() {} } } },
    $: id => id === 'modalContent' ? modalContent : modalWrap
  };
  const modalContent = { innerHTML: '' };
  const modalWrap = { classList: { add() {} } };
  vm.runInNewContext(html.slice(start, end), context);
  context.openProduct('watch-1');
  assert.match(modalContent.innerHTML, /Front view/);
  assert.match(modalContent.innerHTML, /Back view/);
  assert.match(modalContent.innerHTML, /data-gallery-index="1"/);
  assert.match(modalContent.innerHTML, /Case diameter/);
  assert.match(modalContent.innerHTML, /40 mm/);
  assert.match(modalContent.innerHTML, /Lug-to-lug/);
  assert.doesNotMatch(modalContent.innerHTML, /Case thickness/);
  assert.doesNotMatch(modalContent.innerHTML, /Strap width/);
});

test('product detail modal maps verified dimensions from catalogue specs only', () => {
  for (const field of ['case_diameter_mm', 'case_thickness_mm', 'lug_to_lug_mm', 'strap_width_mm']) {
    assert.ok(html.includes(field), 'expected catalogue mapping for ' + field);
  }
  assert.ok(html.includes('dimensionRows'));
  assert.ok(html.includes('value!==null&&value!==undefined'));
});

test('mobile product detail modal stacks gallery and product information', () => {
  assert.ok(html.includes('@media(max-width:680px){.modal-wrap'));
  assert.ok(html.includes('.product-modal{grid-template-columns:1fr}'));
});
