import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const routes = await readFile(new URL('../routes.js', import.meta.url), 'utf8');

test('customer auth persists sessions with refresh and PKCE callback handling', () => {
  assert.match(routes, /persistSession:\s*true/);
  assert.match(routes, /autoRefreshToken:\s*true/);
  assert.match(routes, /detectSessionInUrl:\s*true/);
  assert.match(routes, /flowType:\s*'pkce'/);
  assert.match(routes, /onAuthStateChange\(/);
});

test('signup, password sign-in, and sign-out use Supabase Auth APIs', () => {
  assert.match(routes, /\.auth\.signUp\(/);
  assert.match(routes, /\.auth\.signInWithPassword\(/);
  assert.match(routes, /\.auth\.signOut\(/);
  assert.match(routes, /\.auth\.getSession\(/);
});

test('customer profile bootstrap and edits bind rows to the verified auth user', () => {
  assert.match(routes, /\.eq\('auth_user_id',user\.id\)/);
  assert.match(routes, /auth_user_id:user\.id/);
  assert.match(routes, /\.update\(\{full_name:nextName,phone:nextPhone\|\|null,email:user\.email\|\|null\}\)\.eq\('id',customerId\)\.eq\('auth_user_id',user\.id\)/);
});

test('saved address reads, writes, and deletes are customer-scoped', () => {
  assert.match(routes, /from\('customer_addresses'\)\.select\('\*'\)\.eq\('customer_id',customerId\)/);
  assert.match(routes, /customer_id:customerId/);
  assert.match(routes, /\.delete\(\)\.eq\('id',b\.dataset\.deleteAddress\)\.eq\('customer_id',customerId\)/);
});

test('order history and line items use customer RLS-scoped queries', () => {
  assert.match(routes, /from\('orders'\)\.select\([\s\S]*?\.eq\('customer_id',customerId\)/);
  assert.match(routes, /from\('order_items'\)\.select\([\s\S]*?\.in\('order_id',ids\)/);
  assert.match(routes, /from\('order_status_events'\)\.select\([\s\S]*?\.in\('order_id',ids\)/);
});

test('checkout remains disabled and no order creation call is introduced', () => {
  const start = routes.indexOf('function renderCheckoutRoute()');
  const end = routes.indexOf('\n}', start);
  const checkout = routes.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(checkout, /Checkout is not available yet/);
  assert.doesNotMatch(checkout, /\.rpc\(/);
});

test('desktop and mobile account links always render the account route on repeated taps', () => {
  assert.ok(routes.includes("e.target.closest('a[href=\"#account\"]')"));
  assert.ok(routes.includes("if(location.hash!=='#account')location.hash='account';render();"));
});

test('product route waits for catalogue readiness and reports catalogue failures', () => {
  assert.match(routes, /catalogueState==='loading'[\s\S]*?Loading product details/);
  assert.match(routes, /catalogueState==='error'[\s\S]*?Product temporarily unavailable/);
  assert.match(routes, /catalogue:ready/);
  assert.match(routes, /catalogue:error/);
});

test('route renderer catches runtime failures and leaves a visible recovery action', () => {
  assert.match(routes, /IQA WATCHES route render failed/);
  assert.match(routes, /role="alert"/);
  assert.match(routes, /Return home/);
});

test('account async rendering does not overwrite a newer route', () => {
  assert.match(routes, /const requestedHash=location\.hash/);
  assert.match(routes, /if\(location.hash!==requestedHash\)return/);
});

test('mobile viewport guardrails keep storefront containers within the viewport', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /name="viewport" content="width=device-width, initial-scale=1"/);
  assert.match(html, /html,body\{width:100%;max-width:100%;min-width:0;overflow-x:hidden\}/);
  assert.match(html, /@media\(max-width:760px\)/);
  assert.match(html, /\.route-product-layout\{grid-template-columns:minmax\(0,1fr\)!important\}/);
});

test('all inline storefront JavaScript blocks parse without syntax errors', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const scriptPattern = new RegExp('<script(?:\\s[^>]*)?>([\\s\\S]*?)<\\/script>', 'gi');
  const scripts = [...html.matchAll(scriptPattern)]
    .map(match => match[1].trim()).filter(Boolean);
  assert.ok(scripts.length > 0, 'expected inline storefront scripts');
  scripts.forEach((source, index) => assert.doesNotThrow(() => new vm.Script(source), `inline script ${index + 1}`));
});


test('brands and categories routes render only catalogue-backed groups and products', () => {
  assert.match(routes, /if\(r==='brands'\)return renderBrands\(arg\)/);
  assert.match(routes, /if\(r==='categories'\|\|r==='category'\)return renderCategories\(arg\)/);
  assert.match(routes, /new Set\(products\.map\(p=>p\.brand\)/);
  assert.match(routes, /p\.category===selectedCategory\|\|p\.audience===selectedCategory/);
});

test('legacy comparison URL redirects to the persistent customer comparison route', () => {
  assert.match(routes, /if\(r==='comparison'\)\{location\.hash='compare';return;\}/);
  assert.match(routes, /if\(r==='compare'\)return;/);
  assert.doesNotMatch(routes, /routeCompareIds|function renderComparison\(/);
});

test('delivery route does not invent serviceability, fees, or delivery estimates', () => {
  assert.match(routes, /if\(r==='delivery'\|\|r==='shipping'\)return renderDelivery\(\)/);
  assert.match(routes, /PIN-code serviceability, courier partners, shipping charges, handling times and delivery estimates are not currently connected/);
  assert.match(routes, /Checkout remains disabled/);
});


test('brand directory handles an empty catalogue and safely navigates encoded brand names', () => {
  const start = routes.indexOf('function renderBrands(');
  const end = routes.indexOf('function renderCategories(', start);
  assert.ok(start >= 0 && end > start);
  const source = routes.slice(start, end);
  const context = {
    products: [
      { id: 'p1', brand: 'A/B & Co', name: 'Watch <One>', image: '/watch.png', price: 1200 },
      { id: 'p2', brand: 'A/B & Co', name: 'Watch Two', image: '/watch-2.png', price: 1500 }
    ],
    esc: value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'),
    safeImageUrl: value => value,
    money: value => '₹' + value,
    infoRoute: (_kicker, _title, _description, body) => { context.body = body; }
  };
  vm.runInNewContext(source, context);
  context.renderBrands();
  assert.match(context.body, /A\/B &amp; Co/);
  assert.match(context.body, /#brands\/A%2FB%20%26%20Co/);
  context.renderBrands('A/B & Co');
  assert.match(context.body, /Watch &lt;One&gt;/);
  assert.equal((context.body.match(/<article class=\"route-card\">/g) || []).length, 2);
  context.products = [];
  context.renderBrands();
  assert.match(context.body, /No brands are currently listed/);
});

test('customer comparison selections are persisted, normalised, capped and removable', async () => {
  const customer = await readFile(new URL('../customer-storefront.js', import.meta.url), 'utf8');
  assert.match(customer, /const KEY='iqa-customer-storefront-v1'/);
  assert.match(customer, /const state=\{compare:cleanIds\(initialState\?\.compare,4\),recent:cleanIds\(initialState\?\.recent,12\)\}/);
  assert.match(customer, /localStorage\.setItem\(KEY,JSON\.stringify\(state\)\)/);
  assert.match(customer, /state\.compare\.length>=4/);
  assert.match(customer, /data-remove-customer-compare/);
  assert.match(customer, /state\.compare=state\.compare\.filter\(id=>id!==button\.dataset\.removeCustomerCompare\)/);
  assert.match(customer, /window\.addEventListener\('storage'/);
  assert.match(customer, /if\(\(location\.hash\|\|'\)==='#compare'\)renderCompare\(\)/);
});

test('cart and wishlist persist locally, validate catalogue IDs and enforce available stock', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /safeLoad\('iqa-preview-cart',\{\}\)/);
  assert.match(html, /safeLoad\('iqa-preview-wishlist',\[\]\)/);
  assert.match(html, /localStorage\.setItem\('iqa-preview-cart',JSON\.stringify\(cart\)\)/);
  assert.match(html, /localStorage\.setItem\('iqa-preview-wishlist',JSON\.stringify\(wishlist\)\)/);
  assert.match(html, /knownProductIds\.has\(id\)/);
  assert.match(html, /Math\.min\(qty,10,products\.find\(p=>p\.id===id\)\?\.stock\|\|0\)/);
  assert.match(html, /if\(currentQty>=p\.stock\)/);
  assert.match(html, /wishlist=Array\.isArray\(storedWishlist\)\?\[\.\.\.new Set\(storedWishlist\.filter\(id=>knownProductIds\.has\(id\)\)\)\]:\[\]/);
});


test('narrow-phone navigation stays compact with usable tap targets and menu search fallback', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const start = html.indexOf('@media(max-width:360px){');
  const end = html.indexOf('</style>', start);
  assert.ok(start >= 0 && end > start, 'expected narrow-phone navigation breakpoint');
  const css = html.slice(start, end);
  assert.match(css, /\.brand-logo\{width:clamp\(112px,34vw,122px\)/);
  assert.match(css, /#headerSearch,#voiceSearch\{display:none\}/);
  assert.match(css, /\.nav-actions \.icon-btn\{width:40px;min-width:40px;min-height:40px/);
  assert.ok(html.includes('<a href="#search">Search</a>'), "search remains available from the mobile menu");
  assert.match(css, /#wishlistOpen::before/);
  assert.match(css, /#cartOpen::before/);
});

test('mobile comparison table scrolls inside its own container instead of widening the page', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /\.compare-table-wrap\{overflow-x:auto/);
  assert.match(html, /\.compare-table\{width:100%;min-width:560px/);
  assert.match(html, /html,body\{width:100%;max-width:100%;min-width:0;overflow-x:hidden\}/);
});


test('return history is scoped through the authenticated customer order and uses schema-supported request kinds', () => {
  assert.match(routes, /from\('return_requests'\)\.select\('id,order_id,kind,reason,state,created_at,orders!inner\(customer_id\)'\)\.eq\('orders\.customer_id',customerId\)/);
  assert.ok(routes.includes('<option value="return">Return</option><option value="refund">Refund</option><option value="warranty">Warranty</option>'));
  assert.ok(!routes.includes('<option value="exchange">Exchange</option>'));
});
