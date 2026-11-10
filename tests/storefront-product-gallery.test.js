const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const routes = fs.readFileSync(path.join(__dirname, '..', 'routes.js'), 'utf8');
const catalogue = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'catalogue.json'), 'utf8'));

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
    window: { dispatchEvent() {} },
    CustomEvent: function () {},
    productModalReturnFocus: null,
    $: id => id === 'modalContent' ? modalContent : id === 'modalWrap' ? modalWrap : id === 'modalClose' ? modalClose : null
  };
  const modalContent = {
    innerHTML: '',
    querySelector: () => ({ addEventListener() {} }),
    querySelectorAll: () => []
  };
  const modalWrap = { classList: { add() {}, contains: () => false } };
  const modalClose = { focus() {} };
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

test('static catalogue carries normalized dimensions and product details render only supplied values', () => {
  assert.ok(catalogue.products.some(product => product.caseDiameter));
  assert.ok(catalogue.products.every(product => product.caseThickness === '' || typeof product.caseThickness === 'string'));
  assert.ok(html.includes('dimensionRows'));
  assert.ok(html.includes('value!==null&&value!==undefined'));
});

test('mobile product detail modal stacks gallery and product information', () => {
  assert.ok(html.includes('@media(max-width:680px){.modal-wrap'));
  assert.ok(html.includes('.product-modal{grid-template-columns:1fr}'));
});


test('full-screen product image viewer is present and supports keyboard-accessible entry points', () => {
  assert.match(html, /id="phase-three-image-lightbox"/);
  assert.match(html, /#iqa-image-lightbox\.open/);
  assert.match(routes, /data-lightbox-zoom/);
  assert.match(routes, /data-lightbox-prev/);
  assert.match(routes, /data-lightbox-next/);
  assert.match(html, /aria-label="Open full-screen product image"/);
});

test('Buy Now uses an isolated quantity selection instead of mutating the cart', () => {
  assert.match(html, /const requestedQuantity=Number\(buyNow\.dataset\.pdpQuantity\)\|\|1/);
  assert.match(html, /window\.iqaBuyNowSelection=\{productId:id,quantity:Math\.max\(1,Math\.min\(Number\(product\.stock\)\|\|1,requestedQuantity\)\)\}/);
  assert.doesNotMatch(html, /const buyNow=e\.target\.closest\('\[data-buy-now\]'\);if\(buyNow\)\{const id=buyNow\.dataset\.buyNow;if\(!addCart\(id\)\)/);
});


test('quick-view gallery handles native touch release outside the image and recommendations flow after details', () => {
  assert.match(html, /gallerySurface\.addEventListener\('touchstart',onTouchStart/);
  assert.match(html, /document\.addEventListener\('touchend',onTouchEnd/);
  assert.match(html, /document\.addEventListener\('touchcancel',onTouchCancel/);
  assert.match(html, /const applySwipe=\(dx,dy\)=>/);
  assert.match(html, /<style id="quick-view-gallery-and-recommendations-fix">/);
  assert.match(html, /<\/div><\/div>'\+\(related\.length\?'<section class="related-products">/);
});

test('public catalogue exposes real variant details and omits internal SKU fields', () => {
  assert.ok(catalogue.products.every(product => product.variantId));
  assert.ok(catalogue.products.every(product => product.variantDetails && typeof product.variantDetails === 'object'));
  assert.ok(catalogue.products.every(product => !Object.hasOwn(product, 'sku')));
  const brownLeather = catalogue.products.find(product => product.name.includes('AE-1200WHL-5AV'));
  assert.equal(brownLeather.variantDetails.case, 'Black Resin');
  assert.equal(brownLeather.variantDetails.strap, 'Brown Genuine Leather');
  assert.equal(brownLeather.stock, 7);
});
