import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const routes = await readFile(new URL('../routes.js', import.meta.url), 'utf8');
const storefront = await readFile(new URL('../customer-storefront.js', import.meta.url), 'utf8');

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


test('storefront menu destinations resolve to the matching page or shopping tool', () => {
  assert.match(routes, /if\(r==='finder'\)\{showHomeSection\('finderCard'\);return;\}/);
  assert.match(routes, /if\(r==='comparison'\)\{showHomeSection\('compareCard'\);return;\}/);
  assert.match(routes, /if\(r==='journal'\)\{/);
  assert.match(routes, /if\(r==='care'\)return renderPolicies\(\)/);
});

test('collection routes use normalized exact audience and explicit collection tags', () => {
  assert.match(routes, /function normalizeCollectionTag\(/);
  assert.match(routes, /function collectionForRoute\(/);
  assert.match(routes, /matches:p=>matchesAudienceCollection\(p,\['men','mens'\]\)/);
  assert.match(routes, /matches:p=>matchesAudienceCollection\(p,\['women','womens'\]\)/);
  assert.match(routes, /Array\.isArray\(p\.tags\)/);
  assert.match(routes, /No watches currently match this collection/);
});

test('collection cards retain product detail links and stock display', () => {
  assert.ok(storefront.includes('function card(p)'));
  assert.ok(storefront.includes('encodeURIComponent(p.id)'));
  assert.ok(routes.includes('Number(p.stock)'));
  assert.ok(routes.includes('available</p>'));
});

test('normalized audience matching prevents women being classified as men', () => {
  assert.match(routes, /matchesAudienceCollection\(p,\['men','mens'\]\)/);
  assert.match(routes, /matchesAudienceCollection\(p,\['women','womens'\]\)/);
});


test('customer comparison supports individual removal and prunes IDs missing from the live catalogue', () => {
  assert.ok(storefront.includes('data-remove-customer-compare'));
  assert.match(storefront, /const valid=state\.compare\.filter/);
  assert.match(storefront, /state\.compare=valid;persist\(\)/);
});


test('product routes wait for catalogue readiness and expose a safe error state', () => {
  assert.match(routes, /catalogueState==='loading'[\s\S]*?Loading product details/);
  assert.match(routes, /catalogueState==='error'[\s\S]*?Product temporarily unavailable/);
  assert.match(routes, /catalogue:ready/);
  assert.match(routes, /catalogue:error/);
});

test('route renderer catches runtime failures and offers a recovery action', () => {
  assert.match(routes, /IQA WATCHES route render failed/);
  assert.match(routes, /role="alert"/);
  assert.match(routes, /Return home/);
});

test('async account rendering does not overwrite a newer route', () => {
  assert.match(routes, /const requestedHash=location\.hash/);
  assert.match(routes, /if\(location\.hash!==requestedHash\)return/);
});

test('brand and category directories are catalogue-backed and support empty catalogues', () => {
  assert.match(storefront, /function renderBrands\(/);
  assert.match(storefront, /function renderCategories\(/);
  assert.match(storefront, /if\(route==='brands'\)/);
  assert.match(storefront, /if\(route==='categories'\)/);
  assert.match(storefront, /No brands are currently listed/);
});

test('delivery checker does not promise unverified serviceability, charges or dates', () => {
  assert.match(storefront, /function renderDelivery\(/);
  assert.match(storefront, /No delivery date or fee is being promised/);
  assert.match(storefront, /No delivery date or fee can be confirmed/);
});

test('comparison state is normalized, capped and synchronized across tabs', () => {
  assert.match(storefront, /const cleanIds=\(value,limit\)/);
  assert.match(storefront, /cleanIds\(initialState\?\.compare,4\)/);
  assert.match(storefront, /cleanIds\(initialState\?\.recent,12\)/);
  assert.match(storefront, /window\.addEventListener\('storage'/);
  assert.match(storefront, /const valid=state\.compare\.filter/);
});

test('return history is scoped to the authenticated customer and only schema-supported request kinds are offered', () => {
  assert.match(routes, /from\('return_requests'\)\.select\('id,order_id,kind,reason,state,created_at,orders!inner\(customer_id\)'\)\.eq\('orders\.customer_id',customerId\)/);
  assert.ok(routes.includes('<option value="return">Return</option><option value="refund">Refund</option><option value="warranty">Warranty</option>'));
  assert.ok(!routes.includes('<option value="exchange">Exchange</option>'));
});

test('cart and wishlist restore only known catalogue items and enforce stock limits', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /safeLoad\('iqa-preview-cart',\{\}\)/);
  assert.match(html, /knownProductIds\.has\(id\)/);
  assert.match(html, /Math\.min\(qty,10,products\.find\(p=>p\.id===id\)\?\.stock\|\|0\)/);
  assert.match(html, /compare-table-wrap\{overflow-x:auto/);
});
