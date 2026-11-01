import test from 'node:test';
import assert from 'node:assert/strict';
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


test('storefront menu destinations resolve to the matching page or shopping tool', () => {
  assert.match(routes, /if\(r==='finder'\)\{showHomeSection\('finderCard'\);return;\}/);
  assert.match(routes, /if\(r==='comparison'\)\{showHomeSection\('compareCard'\);return;\}/);
  assert.match(routes, /if\(r==='journal'\)\{/);
  assert.match(routes, /if\(r==='care'\)return renderPolicies\(\)/);
});

test('collection routes filter by catalogue audience, category, style and tags', () => {
  assert.match(routes, /const terms=\{men:/);
  assert.match(routes, /p\.audience,p\.category,p\.style/);
  assert.match(routes, /Array\.isArray\(p\.tags\)/);
  assert.match(routes, /No watches are currently tagged for this collection/);
});

test('collection cards retain product details links and current stock display', () => {
  assert.match(routes, /href="#product\/'\+encodeURIComponent\(p\.id\)/);
  assert.match(routes, /Number\(p\.stock\)\+' available/);
});

test('collection matching uses normalized whole-token and phrase boundaries', () => {
  const start = routes.indexOf('function normalizeCollectionText');
  const end = routes.indexOf('\nfunction showHomeSection', start);
  assert.ok(start >= 0 && end > start, 'collection matcher helpers must exist');
  const helpers = routes.slice(start, end);
  const matcher = new Function(helpers + '; return { normalizeCollectionText, matchesCollectionTerm, collectionProductMatches };')();
  assert.equal(matcher.matchesCollectionTerm("Men's watches", 'men s'), true);
  assert.equal(matcher.matchesCollectionTerm('watches designed for men', 'men'), true);
  assert.equal(matcher.matchesCollectionTerm("Women's watches", 'men'), false);
  assert.equal(matcher.matchesCollectionTerm('watches for women', 'men'), false);
  assert.equal(matcher.matchesCollectionTerm('premium-watch collection', 'premium watch'), true);
  assert.equal(matcher.collectionProductMatches({ audience: 'Unisex', tags: ['New-Arrivals'] }, ['new arrival', 'new arrivals']), true);
  assert.equal(matcher.collectionProductMatches({ category: "Women's Watches" }, ['men', 'men s', 'mens']), false);
});
