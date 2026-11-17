import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const routes = await readFile(new URL('../routes.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../assets/cart-checkout-premium.css', import.meta.url), 'utf8');
const checkout = await readFile(new URL('../supabase/functions/iqa-customer-checkout/index.ts', import.meta.url), 'utf8');
const catalogue = await readFile(new URL('../supabase/functions/iqa-public-catalogue/index.ts', import.meta.url), 'utf8');

test('cart side panel is an accessible dialog wired to the bag and add-to-bag', () => {
  assert.match(html, /<aside class="drawer" id="drawer" role="dialog" aria-modal="true" aria-labelledby="drawerTitle"/);
  assert.match(html, /aria-hidden="true"><header class="drawer-head"/);
  assert.match(html, /\$\('cartOpen'\)\.addEventListener\('click',\(\)=>\{openPanel\('cart'\);\}\);/);
  assert.match(html, /openPanel\('cart'\)\}/);
  assert.match(css, /\.drawer\{[\s\S]*?transform:translateX\(102%\)/);
});

test('panel closes on Escape and backdrop, locks scrolling and restores focus', () => {
  assert.match(html, /\$\('drawerClose'\)\.addEventListener\('click',closePanel\);\$\('overlay'\)\.addEventListener\('click',closePanel\)/);
  assert.match(html, /if\(e\.key==='Escape'\)\{[\s\S]*?closePanel\(\)/);
  assert.match(html, /document\.body\.classList\.add\('locked'\)/);
  assert.match(html, /panelReturnFocus/);
  assert.match(html, /function panelFocusable\(\)/);
  assert.match(html, /if\(event\.shiftKey&&document\.activeElement===first\)/);
  assert.match(html, /overscroll-behavior:contain/);
});

test('cart maths has one shared source and never invents a shipping fee', () => {
  assert.match(html, /window\.IQA_CART_API=\{entries:cartEntries,summary:cartSummary/);
  assert.match(html, /function cartSummary\(entries\)/);
  assert.match(routes, /const summary=api\?api\.summary\(entries\)/);
  assert.doesNotMatch(html, /shippingFee=subtotal>500\?0:40/);
  assert.doesNotMatch(routes, /shippingFee=subtotal>500\?0:40/);
  assert.match(html, /window\.IQA_SHIPPING_CONFIG=payload\.shipping/);
  assert.match(catalogue, /free_shipping_threshold/);
  assert.match(catalogue, /estimate_enabled/);
});

test('cart lines carry product, selected configuration, quantity and remove controls', () => {
  assert.match(html, /function cartVariantLabel\(p\)/);
  assert.match(html, /cart-variant/);
  assert.match(html, /data-qty="'\+escapeHtml\(p\.id\)\+'" data-delta="-1"/);
  assert.match(html, /data-remove="'\+escapeHtml\(p\.id\)\+'"/);
  assert.match(routes, /data-qty="'\+esc\(p\.id\)\+'" data-delta="1" aria-label="Increase quantity of/);
  assert.match(routes, /class="cart-remove" data-remove=/);
});

test('cart page keeps the two-column desktop layout and a mobile checkout action', () => {
  assert.match(routes, /class="shopping-layout"/);
  assert.match(routes, /class="shopping-items"/);
  assert.match(routes, /class="shopping-summary"/);
  assert.match(routes, /class="cart-checkout-button shopping-checkout-button" href="#checkout"/);
  assert.match(routes, /class="shopping-mobile-checkout"/);
  assert.match(css, /@media\(max-width:680px\)\{[\s\S]*?\.shopping-mobile-checkout\{/);
  assert.match(routes, /Checkout is unavailable\./);
});

test('checkout collects inline shipping address fields and keeps the server contract', () => {
  assert.match(routes, /name="address_line1"/);
  assert.match(routes, /name="address_line2"/);
  assert.match(routes, /name="city"/);
  assert.match(routes, /name="state"/);
  assert.match(routes, /name="postal_code"/);
  assert.match(routes, /name="country"/);
  assert.match(routes, /client\.from\('customer_addresses'\)\.insert\(row\)\.select\('id'\)\.single\(\)/);
  assert.match(routes, /'x-idempotency-key':requestKey/);
  assert.match(routes, /functions\/v1\/iqa-customer-checkout/);
  assert.match(routes, /address_id:selected\.id,items:orderItems/);
  assert.match(checkout, /admin\.rpc\("iqa_create_customer_order"/);
  assert.match(checkout, /payments\.cod_enabled !== true/);
});

test('order placement is guarded against duplicate submission and exposes states', () => {
  assert.match(routes, /window\.iqaCodSubmitting/);
  assert.match(routes, /aria-busy','true'/);
  assert.match(routes, /Placing your order…/);
  assert.match(routes, /class="checkout-message" id="codOrderMessage" role="status" aria-live="polite"/);
});

test('premium cart styling is opt-in, responsive and motion-safe', () => {
  assert.match(css, /@media\(max-width:960px\)/);
  assert.match(css, /@media\(max-width:680px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /--cart-ivory:#fffaf3/);
  assert.match(html, /href="\.\/assets\/cart-checkout-premium\.css\?v=/);
});
